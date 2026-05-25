# GameSDK API (v0.3)

The codegen layer is **only allowed to emit `src/config.json`**. It must not
modify SDK code or main.ts. Choose the genre via `meta.genre`; the bootstrap in
main.ts dispatches to the correct SDK.

## Genre: runner — `GameSDK`

Lifecycle: `setupWorld()`, `setupPlayer()`, `setupObstacles()`, `setupScoring()`.
Update: call `update(time, delta)` every frame.
Read-only state: `score`, `hp`, `isGameOver`.
Controls: Space or click/tap = jump.
Experience support: optional `experience.goalText`, `experience.instructionText`, and `experience.failureText` render as player-facing UI copy. `experience.mood` adds light ambient decoration for `playful`, `mysterious`, and `intense`.

## Genre: platformer — `PlatformerSDK`

Lifecycle: `setupWorld()`, `setupPlayer()`, `setupGoal()`, `setupUI()`.
Update: call `update(time, delta)` every frame.
Read-only state: `hp`, `isGameOver`, `isWin`.
Controls: ←/→ or A/D = move, ↑ or Space = jump.
Win condition: player overlaps goal.
