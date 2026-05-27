import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repairRunnerConfig } from './repair-configs.mjs';
import { validate } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const reportFile = process.env.REPORT_FILE || 'eval/report-lora-smoke-v2.json';
const requestsFile = process.env.REQUESTS_FILE || 'eval/lora-smoke-requests.json';
const outputsFile = process.env.OUTPUTS_FILE || 'eval/lora-smoke-outputs-v2.json';
const outRequests = process.env.OUT_REQUESTS || 'eval/sft-runner-v3-targeted-requests.json';
const outOutputs = process.env.OUT_OUTPUTS || 'eval/sft-runner-v3-targeted-outputs.json';
const outJsonl = process.env.OUT_JSONL || 'eval/sft-runner-v3-targeted.jsonl';
const promptFile = process.env.PROMPT_FILE || 'prompts/sft-system-compact.md';

const report = JSON.parse(fs.readFileSync(path.join(ROOT, reportFile), 'utf8'));
const requests = JSON.parse(fs.readFileSync(path.join(ROOT, requestsFile), 'utf8'));
const outputs = JSON.parse(fs.readFileSync(path.join(ROOT, outputsFile), 'utf8'));
const systemPrompt = fs.readFileSync(path.join(ROOT, promptFile), 'utf8').trim();
const requestById = new Map(requests.map((r) => [r.id, r.request]));

const targetRows = report.results.filter((r) => r.passes === 1 || r.pass === false);
const targetRequests = [];
const targetOutputs = {};
const lines = [];

function makeSafer(cfg, id) {
  const safe = repairRunnerConfig(cfg);
  const diff = safe.meta.difficulty;
  if (diff === 'normal') {
    safe.world.scrollSpeed = Math.min(safe.world.scrollSpeed, 180);
    safe.obstacles[0].spawnInterval = Math.max(safe.obstacles[0].spawnInterval, 2.0);
    safe.player.hp = Math.max(safe.player.hp, 4);
  } else if (diff === 'hard') {
    safe.world.scrollSpeed = Math.min(safe.world.scrollSpeed, 250);
    safe.obstacles[0].spawnInterval = Math.max(safe.obstacles[0].spawnInterval, 1.9);
    safe.player.hp = Math.max(safe.player.hp, 4);
    safe.obstacles[0].height = Math.min(safe.obstacles[0].height, 36);
  } else {
    safe.world.scrollSpeed = Math.min(safe.world.scrollSpeed, 160);
    safe.obstacles[0].spawnInterval = Math.max(safe.obstacles[0].spawnInterval, 2.1);
  }
  safe.experience.goalText = safe.experience.goalText || `Survive ${safe.meta.theme}`;
  safe.meta.title = `${safe.meta.title} Safe`.slice(0, 60);
  return safe;
}

for (const r of targetRows) {
  const req = requestById.get(r.id);
  const cfg = outputs[r.id];
  if (!req || !cfg) continue;
  const safe = makeSafer(cfg, r.id);
  const errs = validate(safe);
  if (errs.length) throw new Error(`${r.id}: ${errs.join('; ')}`);
  const id = `v3_${r.id}`;
  const request = `${req} Keep it clearly playable: safe timing, one obstacle type, and forgiving jumps.`;
  targetRequests.push({ id, request });
  targetOutputs[id] = safe;
  lines.push(JSON.stringify({
    id,
    source: r.id,
    failure: r.error || `${r.passes || 0}/${r.runs_total || 3}`,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request },
      { role: 'assistant', content: JSON.stringify(safe, null, 2) },
    ],
  }));
}

fs.writeFileSync(path.join(ROOT, outRequests), JSON.stringify(targetRequests, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, outOutputs), JSON.stringify(targetOutputs, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, outJsonl), lines.join('\n') + '\n');
console.log(`targeted v3: ${lines.length} samples`);
console.log(`-> ${outRequests}`);
console.log(`-> ${outOutputs}`);
console.log(`-> ${outJsonl}`);
