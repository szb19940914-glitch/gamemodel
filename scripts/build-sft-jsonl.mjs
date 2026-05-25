/**
 * Build SFT training JSONL from eval report. Each line is a chat-format
 * sample: system = codegen prompt, user = request, assistant = config JSON.
 * Only includes cases with passes >= 2/3 in ensemble.
 *
 * Output: eval/sft-runner.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const REPORT = process.env.REPORT_FILE || 'eval/report-sft-runner.json';
const REQUESTS = process.env.REQUESTS_FILE || 'eval/sft-runner-requests.json';
const OUTPUTS = process.env.OUTPUTS_FILE || 'eval/sft-runner-outputs.json';
const PROMPT = process.env.PROMPT_FILE || 'prompts/codegen.md';
const OUT_JSONL = process.env.OUT_JSONL || 'eval/sft-runner.jsonl';
const MIN_PASSES = parseInt(process.env.MIN_PASSES || '2', 10);

const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT), 'utf8'));
const requests = JSON.parse(fs.readFileSync(path.join(ROOT, REQUESTS), 'utf8'));
const outputs = JSON.parse(fs.readFileSync(path.join(ROOT, OUTPUTS), 'utf8'));
const systemPrompt = fs.readFileSync(path.join(ROOT, PROMPT), 'utf8');

const reqMap = new Map(requests.map((r) => [r.id, r.request]));
const lines = [];
let kept = 0;
let skipped = 0;
const skippedDetail = [];

for (const r of report.results) {
  const passes = r.passes ?? (r.pass ? 1 : 0);
  const total = r.runs_total ?? 1;
  if (passes < MIN_PASSES) {
    skipped++;
    skippedDetail.push(`${r.id}: ${passes}/${total}`);
    continue;
  }
  const req = reqMap.get(r.id);
  const cfg = outputs[r.id];
  if (!req || !cfg) continue;
  lines.push(JSON.stringify({
    id: r.id,
    ensemble: `${passes}/${total}`,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: req },
      { role: 'assistant', content: JSON.stringify(cfg, null, 2) },
    ],
  }));
  kept++;
}

fs.writeFileSync(path.join(ROOT, OUT_JSONL), lines.join('\n') + '\n');
console.log(`SFT JSONL: ${kept} kept, ${skipped} skipped (< ${MIN_PASSES}/3)`);
if (skippedDetail.length) console.log(`  skipped: ${skippedDetail.join(', ')}`);
console.log(`-> ${OUT_JSONL}`);
