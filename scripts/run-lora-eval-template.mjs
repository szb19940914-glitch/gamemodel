#!/usr/bin/env node
/**
 * Template for evaluating outputs produced by a trained LoRA.
 *
 * This does NOT run model inference. It checks that the expected files exist,
 * then invokes the existing schema + Playwright robot ensemble gate.
 *
 * Expected input:
 *   eval/lora-smoke-requests.json  - held-out natural-language requests
 *   eval/lora-smoke-outputs.json   - model-generated config object per id
 *
 * Output:
 *   eval/report-lora-smoke.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const requestsFile = process.env.REQUESTS_FILE || 'eval/lora-smoke-requests.json';
const outputsFile = process.env.OUTPUTS_FILE || 'eval/lora-smoke-outputs.json';
const reportFile = process.env.REPORT_FILE || 'eval/report-lora-smoke.json';
const ensembleRuns = process.env.ENSEMBLE_RUNS || '3';

function mustExist(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    console.error(`[lora-eval] missing ${file}`);
    if (file === outputsFile) {
      console.error('[lora-eval] Generate this file with your trained LoRA first. It must be a JSON object keyed by request id.');
    }
    process.exit(1);
  }
}

mustExist(requestsFile);
mustExist(outputsFile);

const requests = JSON.parse(fs.readFileSync(path.join(ROOT, requestsFile), 'utf8'));
const outputs = JSON.parse(fs.readFileSync(path.join(ROOT, outputsFile), 'utf8'));
const missing = requests.filter((r) => !outputs[r.id]).map((r) => r.id);
if (missing.length) {
  console.error(`[lora-eval] outputs missing ids: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`[lora-eval] requests: ${requests.length}`);
console.log(`[lora-eval] outputs: ${Object.keys(outputs).length}`);
console.log(`[lora-eval] ensemble runs: ${ensembleRuns}`);

execSync(
  `REQUESTS_FILE=${requestsFile} OUTPUTS_FILE=${outputsFile} REPORT_FILE=${reportFile} ENSEMBLE_RUNS=${ensembleRuns} node scripts/run-eval-comate.mjs`,
  { cwd: ROOT, stdio: 'inherit' },
);
