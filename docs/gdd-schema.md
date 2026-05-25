# GDD Schema v0.2

`src/config.json` must conform to this schema. Codegen produces a config that
satisfies it; SDK consumes it. **Hex colors are JSON strings** like `"0xff5577"`.
The top-level structure is selected by `meta.genre`.

## Common: meta

```jsonc
{
  "meta": {
    "title": "string",
    "genre": "runner | platformer",
    "theme": "string",
    "difficulty": "easy | normal | hard"
  }
}
```

## Optional: experience

These fields improve player-facing experience without changing core physics. They are optional and safe to omit.

```jsonc
{
  "experience": {
    "goalText": "string <= 80 chars",          // e.g. "Survive the neon chase"
    "instructionText": "string <= 80 chars",   // e.g. "Tap / Space to jump"
    "successText": "string <= 80 chars",
    "failureText": "string <= 80 chars",
    "mood": "calm | playful | intense | mysterious",
    "reward": "score | survival | collection"
  }
}
```

Use `experience` to reflect user intent such as audience, tone, session goal, and feedback style. Do not use it to bypass playability recipes.

---

## Genre: runner

```jsonc
{
  "meta": { "genre": "runner", ... },
  "player": {
    "speed": 0,
    "jumpVelocity": 300..900,
    "doubleJump": true,
    "hp": 1..5,
    "color": "0xRRGGBB",
    "size": 16..64
  },
  "world": {
    "gravity": 600..2000,
    "scrollSpeed": 100..600,
    "groundColor": "0xRRGGBB",
    "skyColor": "0xRRGGBB"
  },
  "obstacles": [   // 1..3
    {
      "type": "string",
      "spawnInterval": 0.5..3.0,
      "color": "0xRRGGBB",
      "width": 12..80,
      "height": 12..80
    }
  ],
  "scoring": { "type": "distance", "perPixel": 0.01..0.5 }
}
```

### Runner difficulty defaults

- normal: scrollSpeed 250, gravity 1200, spawnInterval 1.4
- easy:   scrollSpeed 180, gravity 1000, spawnInterval 1.8
- hard:   scrollSpeed 350, gravity 1400, spawnInterval 1.0

---

## Genre: platformer

```jsonc
{
  "meta": { "genre": "platformer", ... },
  "player": {
    "jumpVelocity": 300..900,
    "moveSpeed": 100..300,
    "doubleJump": true,
    "hp": 1..5,
    "color": "0xRRGGBB",
    "size": 16..64
  },
  "world": {
    "gravity": 600..2000,
    "groundColor": "0xRRGGBB",
    "skyColor": "0xRRGGBB",
    "width": 800..2400        // total level width in px (canvas is 800)
  },
  "platforms": [   // 1..10
    { "x": 0..2400, "y": 100..360, "width": 40..400, "height": 8..40, "color": "0xRRGGBB" }
  ],
  "goal": { "x": 60..2380, "y": 60..380, "color": "0xRRGGBB" }
}
```

### Platformer difficulty defaults

- easy:   moveSpeed 220, world.width 800, 2-3 platforms, goal close to spawn
- normal: moveSpeed 200, world.width 1200, 4-5 platforms, goal at far end
- hard:   moveSpeed 180, world.width 1800, 6-8 platforms, gaps narrower

### Platformer placement rules

- Spawn is fixed at (60, world.height-80). Place lowest reachable platform such
  that the player can reach it from spawn.
- Goal must be reachable: at least one path of platforms whose vertical gaps are
  no more than ~160 (single-jump reach) or 240 (double-jump reach).
- Keep platforms within `world.width` and y in [100, 360].

## Hard rules (both genres)

1. Numeric fields must be within their ranges.
2. Colors must match `^0x[0-9a-fA-F]{6}$`.
3. Do not add fields outside this schema.
4. `experience` is optional, but if present its text fields must be strings <= 80 chars and enum fields must use the listed values.
