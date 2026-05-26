#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv-mlx}"
MODEL="${MODEL:-Qwen/Qwen2.5-Coder-1.5B-Instruct}"
DATA_DIR="${DATA_DIR:-mlx-data/runner-lora-v2}"
ADAPTER_PATH="${ADAPTER_PATH:-adapters/runner-qwen15b-v2}"
ITERS="${ITERS:-120}"
BATCH_SIZE="${BATCH_SIZE:-1}"
LEARNING_RATE="${LEARNING_RATE:-2e-5}"

if [ ! -d "$VENV_DIR" ]; then
  echo "[mlx-train] creating venv: $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

python -m pip install -U pip
python -m pip install -U mlx-lm

node scripts/build-schema-clean-sft.mjs
INPUT_JSONL=eval/sft-runner-schema-clean.jsonl OUT_DIR="$DATA_DIR" node scripts/prepare-mlx-sft.mjs

python -m mlx_lm lora \
  --model "$MODEL" \
  --train \
  --data "$DATA_DIR" \
  --mask-prompt \
  --iters "$ITERS" \
  --batch-size "$BATCH_SIZE" \
  --learning-rate "$LEARNING_RATE" \
  --steps-per-eval "${STEPS_PER_EVAL:-100}" \
  --val-batches "${VAL_BATCHES:-2}" \
  --save-every "${SAVE_EVERY:-10}" \
  --adapter-path "$ADAPTER_PATH"
