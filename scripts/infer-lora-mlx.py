#!/usr/bin/env python3
"""
Generate eval/lora-smoke-outputs.json using a trained MLX LoRA.
Must be run inside the .venv-mlx environment after training completes.
"""
import json, os, sys

MODEL = os.getenv("MODEL", "Qwen/Qwen2.5-Coder-1.5B-Instruct")
ADAPTER = os.getenv("ADAPTER_PATH", "adapters/runner-qwen15b-smoke")
REQUESTS_FILE = os.getenv("REQUESTS_FILE", "eval/lora-smoke-requests.json")
OUTPUTS_FILE = os.getenv("OUTPUTS_FILE", "eval/lora-smoke-outputs.json")
PROMPT_FILE = os.getenv("PROMPT_FILE", "prompts/codegen.md")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "900"))

def main():
    if not os.path.exists(ADAPTER):
        print(f"[infer] adapter not found: {ADAPTER}")
        print("[infer] Train first with: bash scripts/train-mlx-lora.sh")
        sys.exit(1)

    with open(PROMPT_FILE) as f:
        system_prompt = f.read().strip()

    with open(REQUESTS_FILE) as f:
        requests = json.load(f)

    from mlx_lm import load, generate

    model, tokenizer = load(MODEL, adapter_path=ADAPTER)

    outputs = {}
    parse_ok = 0
    for req in requests:
        prompt = tokenizer.apply_chat_template(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req["request"]},
            ],
            tokenize=False,
            add_generation_prompt=True,
        )
        result = generate(model, tokenizer, prompt=prompt, max_tokens=MAX_TOKENS, verbose=False)

        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        elif result.startswith("```"):
            result = result[3:]
        if result.endswith("```"):
            result = result[:-3]
        result = result.strip()

        try:
            cfg = json.loads(result)
            parse_ok += 1
        except json.JSONDecodeError as e:
            cfg = {"_raw": result, "_parse_error": str(e)}

        outputs[req["id"]] = cfg

    with open(OUTPUTS_FILE, "w") as f:
        json.dump(outputs, f, indent=2, ensure_ascii=False)

    print(f"[infer] wrote {len(outputs)} configs -> {OUTPUTS_FILE}")
    print(f"[infer] JSON parseable: {parse_ok}/{len(outputs)}")

if __name__ == "__main__":
    main()
