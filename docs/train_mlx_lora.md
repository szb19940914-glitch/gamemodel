# MLX LoRA Training on Mac

This is the local Mac path for training the first runner-codegen LoRA without an NVIDIA GPU.

## Goal

Train a small LoRA that maps:

```text
user request -> playable Phaser runner config.json
```

Use the existing dataset:

```text
eval/sft-runner.jsonl
```

Current dataset size: 110 samples.

## Hardware Expectations

Recommended:

- Apple Silicon Mac: M1/M2/M3/M4
- Memory: 16GB minimum, 32GB better
- Model: start with `Qwen/Qwen2.5-Coder-1.5B-Instruct`

Avoid 7B for the first local smoke test unless you have enough memory and patience.

## 1. Install MLX

Create a clean Python environment outside the repo if possible:

```bash
python3 -m venv .venv-mlx
source .venv-mlx/bin/activate
pip install -U pip
pip install -U mlx-lm
```

Check the command is available:

```bash
python -m mlx_lm --help
```

## 2. Prepare MLX Dataset

From `game-pipeline/`:

```bash
node scripts/prepare-mlx-sft.mjs
```

This writes:

```text
mlx-data/runner-lora/train.jsonl
mlx-data/runner-lora/valid.jsonl
```

The converter creates one `text` field per row using Qwen-style chat tokens:

```text
<|im_start|>system
...
<|im_end|>
<|im_start|>user
...
<|im_end|>
<|im_start|>assistant
{ ...config.json... }
<|im_end|>
```

## 3. Train LoRA

Start small:

```bash
python -m mlx_lm.lora \
  --model Qwen/Qwen2.5-Coder-1.5B-Instruct \
  --train \
  --data mlx-data/runner-lora \
  --iters 300 \
  --batch-size 1 \
  --learning-rate 2e-5 \
  --adapter-path adapters/runner-qwen15b-smoke
```

If it is too slow, use:

```bash
--iters 100
```

If memory allows and loss is unstable, try:

```bash
--batch-size 2
```

## 4. Quick Inference Test

After training, test one prompt:

```bash
python -m mlx_lm.generate \
  --model Qwen/Qwen2.5-Coder-1.5B-Instruct \
  --adapter-path adapters/runner-qwen15b-smoke \
  --prompt '<|im_start|>system
You are a Phaser game codegen assistant for the game-pipeline project. Output ONLY JSON config.json.
<|im_end|>
<|im_start|>user
Easy moon garden runner, dodge small glowing stones.
<|im_end|>
<|im_start|>assistant
' \
  --max-tokens 900
```

The output should be a single JSON object. If it includes prose or Markdown fences, reduce generation temperature or train longer.

## 5. Generate Held-Out Outputs

Use these held-out requests:

```text
eval/lora-smoke-requests.json
```

The model outputs must be saved as:

```text
eval/lora-smoke-outputs.json
```

Required shape:

```json
{
  "lora_h01": { "meta": { "genre": "runner" }, "player": {}, "world": {}, "obstacles": [], "scoring": {} }
}
```

## 6. Evaluate Back in Game Pipeline

From `game-pipeline/`:

```bash
node scripts/run-lora-eval-template.mjs
```

This runs:

- schema validation
- Playwright game launch
- robot ensemble with `ENSEMBLE_RUNS=3`

Report:

```text
eval/report-lora-smoke.json
```

## First Success Target

For the first Mac MLX smoke test:

- JSON parse rate: `>= 80%`
- schema pass rate: `>= 80%`
- robot pass rate: `>= 60%`

If robot pass is below 60%, do not change engines. Instead:

1. inspect failures in `eval/report-lora-smoke.json`
2. add 100-200 more easy/hard SFT samples
3. retrain with the same MLX path

## Notes

- Keep platformer out of this LoRA for now.
- Keep generation temperature low when producing eval outputs.
- Always evaluate with robot ensemble, not only schema validation.
