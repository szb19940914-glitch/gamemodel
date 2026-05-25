/**
 * Comate-eval runner — uses pre-generated configs in eval/comate-outputs.json
 * (acting as the codegen LLM), runs Playwright per case, writes report.
 *
 * Usage:
 *   node scripts/run-eval-comate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { validate } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const writeJson = (p, obj) =>
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(obj, null, 2) + '\n');

function runPlaywright() {
  try {
    execSync('npx playwright test --reporter=line', { cwd: ROOT, stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e.stdout?.toString() || e.message).slice(-1500) };
  }
}

const REQ_FILE = process.env.REQUESTS_FILE || 'eval/requests.json';
const OUT_FILE = process.env.OUTPUTS_FILE || 'eval/comate-outputs.json';
const REPORT_FILE = process.env.REPORT_FILE || 'eval/report-comate.json';
const ENSEMBLE_RUNS = Math.max(1, parseInt(process.env.ENSEMBLE_RUNS || '1', 10));
const requests = JSON.parse(read(REQ_FILE));
const outputs = JSON.parse(read(OUT_FILE));
const baseline = read('src/config.json');
const results = [];

console.log(`[eval-comate] running ${requests.length} cases${ENSEMBLE_RUNS > 1 ? ` × ${ENSEMBLE_RUNS} ensemble runs (majority vote)` : ''}`);

for (const c of requests) {
  const t0 = Date.now();
  const row = { id: c.id, request: c.request, stage: 'start' };
  try {
    const cfg = outputs[c.id];
    if (!cfg) throw new Error('no output for ' + c.id);

    row.stage = 'validate';
    const errs = validate(cfg);
    if (errs.length) throw new Error('schema: ' + errs.slice(0, 3).join('; '));

    row.stage = 'write';
    writeJson('src/config.json', cfg);

    row.stage = 'test';
    const runResults = [];
    for (let i = 0; i < ENSEMBLE_RUNS; i++) {
      const tr = runPlaywright();
      runResults.push({ ok: tr.ok, error: tr.ok ? null : (tr.error || '').split('\n').slice(-3).join(' | ').slice(0, 300) });
    }
    const passes = runResults.filter((r) => r.ok).length;
    const threshold = Math.ceil(ENSEMBLE_RUNS / 2);
    row.runs = runResults;
    row.passes = passes;
    row.runs_total = ENSEMBLE_RUNS;
    if (passes < threshold) {
      const lastErr = runResults.find((r) => !r.ok)?.error || 'unknown';
      throw new Error(`majority-fail: ${passes}/${ENSEMBLE_RUNS} (${lastErr})`);
    }

    row.pass = true;
  } catch (e) {
    row.pass = false;
    row.error = e.message;
  }
  row.elapsed_ms = Date.now() - t0;
  results.push(row);
  const voteStr = row.runs_total ? ` [${row.passes}/${row.runs_total}]` : '';
  console.log(
    `[${row.pass ? 'PASS' : 'FAIL'}] ${row.id}${voteStr} (${row.stage}) ${row.elapsed_ms}ms${row.error ? '  ' + row.error.slice(0, 200) : ''}`,
  );
}

fs.writeFileSync(path.join(ROOT, 'src/config.json'), baseline);

const pass = results.filter((r) => r.pass).length;
const summary = {
  source: 'comate',
  ensemble_runs: ENSEMBLE_RUNS,
  total: results.length,
  pass,
  fail: results.length - pass,
  pass_rate: +(pass / results.length).toFixed(2),
  generated_at: new Date().toISOString(),
  results,
};
writeJson(REPORT_FILE, summary);
console.log(`\n[eval-comate] ${pass}/${results.length} passed -> ${REPORT_FILE}`);
