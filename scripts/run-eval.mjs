/**
 * Eval runner — OpenAI-compatible HTTP. Default vendor: DeepSeek.
 *
 * Env vars (override any):
 *   LLM_API_KEY        required (skip in --dry-run)
 *   LLM_BASE_URL       default: https://api.deepseek.com/v1
 *   LLM_MODEL          default: deepseek-chat
 *   EVAL_LIMIT         run only first N cases
 *   EVAL_DRY_RUN=1     skip API + tests
 *
 * Other vendors (just set env vars):
 *   OpenAI       LLM_BASE_URL=https://api.openai.com/v1            LLM_MODEL=gpt-4o-mini
 *   Tongyi       LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
 *   Zhipu        LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
 *   Anthropic    use scripts/run-eval-anthropic.mjs (separate)
 *
 * Usage:
 *   LLM_API_KEY=sk-xxx npm run eval
 *   npm run eval:dry
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { validate } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run') || process.env.EVAL_DRY_RUN === '1';
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const API_KEY = process.env.LLM_API_KEY;
const LIMIT = process.env.EVAL_LIMIT ? parseInt(process.env.EVAL_LIMIT, 10) : Infinity;

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const writeJson = (p, obj) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(obj, null, 2) + '\n');

// ---- LLM call (OpenAI-compatible chat/completions) ----
async function callLLM(userRequest) {
  if (!API_KEY) throw new Error('LLM_API_KEY not set');
  const sys = read('prompts/codegen.md');
  const schema = read('docs/gdd-schema.md');
  const sdkApi = read('docs/sdk-api.md');

  const body = {
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: sys },
      {
        role: 'user',
        content: [
          '## Reference: GDD Schema',
          schema,
          '## Reference: SDK API',
          sdkApi,
          '## User Request',
          userRequest,
          '',
          'Return ONLY the JSON content of config.json. No prose, no fences.',
        ].join('\n\n'),
      },
    ],
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return extractJson(text);
}

function extractJson(text) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('no JSON found in model output');
    return JSON.parse(m[0]);
  }
}

function runPlaywright() {
  try {
    execSync('npx playwright test --reporter=line', { cwd: ROOT, stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e.stdout?.toString() || e.message).slice(-1500) };
  }
}

// ---- main ----
const requests = JSON.parse(read('eval/requests.json'));
const cases = requests.slice(0, LIMIT);
const baseline = read('src/config.json');
const results = [];

console.log(
  `[eval] cases=${cases.length} model=${MODEL} base=${BASE_URL} dry=${DRY_RUN}`,
);

for (const c of cases) {
  const t0 = Date.now();
  const row = { id: c.id, request: c.request, stage: 'start' };
  try {
    let cfg;
    if (DRY_RUN) {
      cfg = JSON.parse(baseline);
    } else {
      row.stage = 'llm';
      cfg = await callLLM(c.request);
      row.model_output = cfg;
    }

    row.stage = 'validate';
    const errs = validate(cfg);
    if (errs.length) throw new Error('schema: ' + errs.slice(0, 3).join('; '));

    row.stage = 'write';
    writeJson('src/config.json', cfg);

    row.stage = 'test';
    const tr = DRY_RUN ? { ok: true } : runPlaywright();
    if (!tr.ok) throw new Error('playwright: ' + tr.error.split('\n').slice(-4).join(' | '));

    row.pass = true;
  } catch (e) {
    row.pass = false;
    row.error = e.message;
  }
  row.elapsed_ms = Date.now() - t0;
  results.push(row);
  console.log(
    `[${row.pass ? 'PASS' : 'FAIL'}] ${row.id} (${row.stage}) ${row.elapsed_ms}ms${row.error ? '  ' + row.error.slice(0, 200) : ''}`,
  );
}

fs.writeFileSync(path.join(ROOT, 'src/config.json'), baseline);

const pass = results.filter((r) => r.pass).length;
const summary = {
  vendor: BASE_URL,
  model: MODEL,
  total: results.length,
  pass,
  fail: results.length - pass,
  pass_rate: results.length ? +(pass / results.length).toFixed(2) : 0,
  generated_at: new Date().toISOString(),
  results,
};
writeJson('eval/report.json', summary);
console.log(`\n[eval] ${pass}/${results.length} passed -> eval/report.json`);
