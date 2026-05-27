import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const baseFile = process.env.BASE_JSONL || 'eval/sft-runner-schema-clean.jsonl';
const targetedFile = process.env.TARGETED_JSONL || 'eval/sft-runner-v3-targeted.jsonl';
const outFile = process.env.OUT_JSONL || 'eval/sft-runner-v3.jsonl';
const repeat = Number(process.env.TARGETED_REPEAT || '4');

const base = fs.readFileSync(path.join(ROOT, baseFile), 'utf8').trim().split('\n').filter(Boolean);
const targeted = fs.readFileSync(path.join(ROOT, targetedFile), 'utf8').trim().split('\n').filter(Boolean);
const rows = [...base];
for (let i = 0; i < repeat; i++) {
  for (const line of targeted) {
    const row = JSON.parse(line);
    row.id = `${row.id}_r${i + 1}`;
    rows.push(JSON.stringify(row));
  }
}
fs.writeFileSync(path.join(ROOT, outFile), rows.join('\n') + '\n');
console.log(`v3 dataset: base ${base.length} + targeted ${targeted.length} x ${repeat} = ${rows.length} -> ${outFile}`);
