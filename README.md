# game-pipeline (Level 0)

End-to-end "one-sentence → playable Phaser game" pipeline, no model training.

## Layout
- `src/` Phaser project (template). AI codegen only edits `src/config.json`.
- `src/sdk/` Stable SDK; codegen layer is forbidden from touching this.
- `docs/` Knowledge base for RAG / system prompt.
- `prompts/` System prompt templates for the codegen agent.
- `eval/requests.json` Evaluation request set.
- `tests/` Playwright auto-tests that verify a generated game is playable.

## Quick start
```bash
cd game-pipeline
npm install
npx playwright install chromium
npm run dev      # http://localhost:5173
# in another shell:
npm test         # runs Playwright against the running game
```

## Codegen loop (manual for v0.1)
1. Pick a request from `eval/requests.json`.
2. Feed `prompts/codegen.md` + `docs/gdd-schema.md` + the request to your LLM.
3. Replace `src/config.json` with the model's output.
4. Run `npm test`. Pass = success. Fail = feed the error back to the LLM.

## Next steps
- Add more obstacle behaviors to SDK
- Add `genre: platformer` and second template
- Script the codegen loop end-to-end
- Build a failure-mode log to drive Level 1 SFT data
