#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VENV_DIR="${VENV_DIR:-.venv-mlx}"
if [ ! -d "$VENV_DIR" ]; then
  echo "[lora-infer] venv not found. Train first: bash scripts/train-mlx-lora.sh"
  exit 1
fi

source "$VENV_DIR/bin/activate"
python scripts/infer-lora-mlx.py
