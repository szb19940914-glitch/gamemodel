#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ADAPTER_DIR="adapters/runner-qwen15b-smoke"
HELDOUT_REQUESTS="eval/lora-smoke-requests.json"
HELDOUT_OUTPUTS="eval/lora-smoke-outputs.json"
REPORT="eval/report-lora-smoke.json"
FINAL_SUMMARY="eval/lora-training-summary.txt"

echo "=== Auto Post-Training Pipeline ===" | tee "$FINAL_SUMMARY"
echo "Started at: $(date)" | tee -a "$FINAL_SUMMARY"

# Wait for training to complete (check adapter existence)
echo "" | tee -a "$FINAL_SUMMARY"
echo "[1/4] Waiting for training to complete..." | tee -a "$FINAL_SUMMARY"
for i in {1..60}; do
  if [ -d "$ADAPTER_DIR" ] && [ -f "$ADAPTER_DIR/adapter_config.json" ]; then
    echo "✓ Training completed at $(date)" | tee -a "$FINAL_SUMMARY"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "✗ Timeout: adapter not found after 60 minutes" | tee -a "$FINAL_SUMMARY"
    exit 1
  fi
  sleep 60
done

# Step 2: Run inference
echo "" | tee -a "$FINAL_SUMMARY"
echo "[2/4] Running inference on held-out requests..." | tee -a "$FINAL_SUMMARY"
source .venv-mlx/bin/activate
python scripts/infer-lora-mlx.py 2>&1 | tee -a "$FINAL_SUMMARY"

if [ ! -f "$HELDOUT_OUTPUTS" ]; then
  echo "✗ Inference failed: $HELDOUT_OUTPUTS not created" | tee -a "$FINAL_SUMMARY"
  exit 1
fi
echo "✓ Inference completed at $(date)" | tee -a "$FINAL_SUMMARY"

# Step 3: Run robot eval
echo "" | tee -a "$FINAL_SUMMARY"
echo "[3/4] Running robot ensemble evaluation..." | tee -a "$FINAL_SUMMARY"
REQUESTS_FILE="$HELDOUT_REQUESTS" OUTPUTS_FILE="$HELDOUT_OUTPUTS" REPORT_FILE="$REPORT" ENSEMBLE_RUNS=3 node scripts/run-eval-comate.mjs 2>&1 | tee -a "$FINAL_SUMMARY"

if [ ! -f "$REPORT" ]; then
  echo "✗ Eval failed: $REPORT not created" | tee -a "$FINAL_SUMMARY"
  exit 1
fi
echo "✓ Evaluation completed at $(date)" | tee -a "$FINAL_SUMMARY"

# Step 4: Generate summary
echo "" | tee -a "$FINAL_SUMMARY"
echo "[4/4] Generating final summary..." | tee -a "$FINAL_SUMMARY"
node -e "
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('$REPORT', 'utf8'));
const outputs = JSON.parse(fs.readFileSync('$HELDOUT_OUTPUTS', 'utf8'));

const parseable = Object.values(outputs).filter(o => !o._parse_error).length;
const schemaPass = report.results.filter(r => !r.error?.includes('schema')).length;
const robotPass = report.pass;
const robotPassRate = report.pass_rate;

console.log('');
console.log('=== FINAL RESULTS ===');
console.log('Total held-out requests:', report.total);
console.log('JSON parseable:', parseable + '/' + report.total);
console.log('Schema pass (approx):', schemaPass);
console.log('Robot pass (>=2/3):', robotPass + '/' + report.total);
console.log('Robot pass rate:', (robotPassRate * 100).toFixed(1) + '%');
console.log('');
console.log('Interpretation:');
if (robotPassRate >= 0.8) {
  console.log('✓ Excellent! Model learned the recipe well.');
} else if (robotPassRate >= 0.6) {
  console.log('○ Good progress. Consider adding more training data.');
} else if (robotPassRate >= 0.4) {
  console.log('△ Partial learning. Need significantly more data or prompt tuning.');
} else {
  console.log('✗ Poor performance. Check prompt, data quality, and training parameters.');
}
console.log('');
console.log('Next steps:');
if (robotPassRate < 0.6) {
  console.log('1. Inspect failures in: $REPORT');
  console.log('2. Add 100-200 more easy/hard samples');
  console.log('3. Re-train with: bash scripts/train-mlx-lora.sh');
} else {
  console.log('1. Model is ready for smoke-test deployment');
  console.log('2. Consider expanding to more themes/difficulties');
  console.log('3. Optional: add experience fields (mood, goalText)');
}
" | tee -a "$FINAL_SUMMARY"

echo "" | tee -a "$FINAL_SUMMARY"
echo "=== Pipeline completed at $(date) ===" | tee -a "$FINAL_SUMMARY"
echo "Results saved to: $FINAL_SUMMARY" | tee -a "$FINAL_SUMMARY"
