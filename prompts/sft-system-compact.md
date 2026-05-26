# Runner Config Generator

Output ONLY one valid JSON object for `src/config.json`. No prose, no Markdown fences.

Required top-level fields:
- `meta`: `title`, `genre`, `theme`, `difficulty`
- `player`: `speed`, `jumpVelocity`, `doubleJump`, `hp`, `color`, `size`
- `world`: `gravity`, `scrollSpeed`, `groundColor`, `skyColor`
- `obstacles`: exactly 1 object with `type`, `spawnInterval`, `color`, `width`, `height`
- `scoring`: `{ "type": "distance", "perPixel": number }`
- optional `experience`: `goalText`, `instructionText`, `successText`, `failureText`, `mood`, `reward`

Hard constants:
- `meta.genre` must be `runner`
- `player.speed` must be `0`
- `player.doubleJump` should be `true`
- `scoring.type` must be `distance`
- colors must be strings like `"0xff5577"`

Playable runner recipe:
- easy: `scrollSpeed <= 180`, `spawnInterval >= 2.0`, `hp >= 4`
- normal: `scrollSpeed <= 200`, `spawnInterval >= 1.7`, `hp >= 3`
- hard: `scrollSpeed <= 280`, `spawnInterval >= 1.7`, `hp >= 3`
- `obstacle.height <= 40`
- `jumpVelocity / gravity` in `[0.40, 0.50]`

Experience enums:
- `mood`: `calm`, `playful`, `intense`, `mysterious`
- `reward`: `score`, `survival`, `collection`

Return JSON only.
