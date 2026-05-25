# LoRA SFT Training Plan

This project now has a runner-only SFT dataset for a first LoRA smoke test.

## Current Dataset

- Training file: `eval/sft-runner.jsonl`
- Size: 110 samples
- Format: chat JSONL
- Scope: Phaser runner `config.json` generation only
- Quality gate: robot ensemble pass `>= 2/3`
- Difficulty split: 53 easy, 9 normal, 48 hard
- Ensemble split: 68 samples at `3/3`, 42 samples at `2/3`

Each line looks like:

```json
{
  "id": "b4_01",
  "ensemble": "3/3",
  "messages": [
    { "role": "system", "content": "...prompts/codegen.md..." },
    { "role": "user", "content": "Castle courtyard jog, easy, small shields." },
    { "role": "assistant", "content": "{ ...config.json... }" }
  ]
}
```

## What This LoRA Should Learn

The first LoRA should not learn general game programming. It should learn one narrow behavior:

> Given a short game request, output a schema-valid and robot-playable runner `config.json`.

Do not include platformer samples yet. Platformer playability is currently limited by the metronome robot and should stay out of SFT gating until a smarter robot or SDK autoplay helper exists.

## Recommended Base Model

Use an instruction model that already follows JSON/chat formats well:

- Small local smoke test: Qwen2.5-Coder-1.5B-Instruct or Qwen2.5-1.5B-Instruct
- Better local baseline: Qwen2.5-Coder-7B-Instruct
- If GPU memory is tight: use 4-bit QLoRA

For the current 110 samples, start with a small model. The goal is to validate the full loop, not maximize quality yet.

## TRL SFTTrainer Smoke Test

Install outside this repo, preferably in a clean Python environment:

```bash
pip install -U "transformers>=4.45" "trl>=0.11" peft accelerate datasets bitsandbytes
```

Minimal training script:

```python
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer
from peft import LoraConfig

model_name = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
dataset = load_dataset("json", data_files="eval/sft-runner.jsonl", split="train")

def format_chat(example):
    return {"text": tokenizer.apply_chat_template(example["messages"], tokenize=False, add_generation_prompt=False)}

tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto", trust_remote_code=True)
dataset = dataset.map(format_chat, remove_columns=dataset.column_names)

peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    task_type="CAUSAL_LM",
)

args = TrainingArguments(
    output_dir="outputs/runner-lora-smoke",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=3,
    logging_steps=5,
    save_strategy="epoch",
    fp16=True,
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=4096,
    peft_config=peft_config,
    args=args,
)

trainer.train()
trainer.save_model("outputs/runner-lora-smoke/final")
```

If this overfits, reduce epochs to 1-2. With only 110 samples, overfitting is expected; the first goal is to prove the pipeline.

## Axolotl Alternative

If using Axolotl, convert the dataset using the same `messages` field and set the chat template for the chosen base model. Keep the first run simple:

- epochs: 2-3
- LoRA rank: 16
- learning rate: `2e-4`
- sequence length: 4096
- validation split: optional for smoke test; useful once dataset reaches 200+

## Post-Training Evaluation Loop

After LoRA training, generate model outputs on held-out requests and run the same robot gate:

1. Prepare a held-out request file, e.g. `eval/lora-smoke-requests.json`.
2. Use the trained LoRA to generate `eval/lora-smoke-outputs.json` with one `config.json` object per request id.
3. Run:

```bash
REQUESTS_FILE=eval/lora-smoke-requests.json \
OUTPUTS_FILE=eval/lora-smoke-outputs.json \
REPORT_FILE=eval/report-lora-smoke.json \
ENSEMBLE_RUNS=3 \
node scripts/run-eval-comate.mjs
```

4. Compare against the old Comate baseline:
   - schema pass rate
   - robot pass rate
   - ensemble `3/3` rate
   - recurring failure pattern: too-fast spawn, too-tall obstacle, multiple obstacle types, bad jump/gravity ratio

## Success Criteria

For a first smoke test:

- The model returns parseable JSON without prose/fences.
- `>= 80%` outputs pass schema validation.
- `>= 60%` outputs pass robot ensemble `>= 2/3` on fresh runner requests.

For the next useful milestone:

- 200-500 SFT samples
- held-out eval set with at least 50 runner requests
- robot pass rate `>= 80%`
- fewer than 10% of outputs requiring repair

## What Not To Do Yet

- Do not mix platformer into this LoRA.
- Do not train on failed configs as plain SFT positives.
- Do not optimize for visual variety before preserving playability.
- Do not trust shallow schema tests as the final metric.

## Next Dataset Work

If the smoke test works, generate two additional assets:

1. `eval/sft-runner-heldout-requests.json`: 50 fresh runner requests not seen in training.
2. Preference/negative dataset from known failures: `s05`, `s11`, `s12`, `s25`, `s30`, `b2_19`, `b2_21`, `b3_28`, `b3_30`, `b4_17`.
