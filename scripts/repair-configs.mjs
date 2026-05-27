import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const inputFile = process.env.INPUT_OUTPUTS || 'eval/lora-smoke-outputs-v2.json';
const outputFile = process.env.OUT_OUTPUTS || 'eval/lora-smoke-outputs-v2-repaired.json';

const clamp = (v, lo, hi, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};
const color = (v, fallback) => /^0x[0-9a-fA-F]{6}$/.test(v || '') ? v : fallback;
const enumVal = (v, vals, fallback) => vals.includes(v) ? v : fallback;

function difficultyDefaults(diff) {
  if (diff === 'easy') return { jumpVelocity: 600, gravity: 1250, scrollSpeed: 170, hp: 5, spawnInterval: 2.0, perPixel: 0.1 };
  if (diff === 'hard') return { jumpVelocity: 700, gravity: 1500, scrollSpeed: 280, hp: 3, spawnInterval: 1.7, perPixel: 0.2 };
  return { jumpVelocity: 600, gravity: 1300, scrollSpeed: 200, hp: 3, spawnInterval: 1.8, perPixel: 0.13 };
}

export function repairRunnerConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? structuredClone(raw) : {};
  const meta = cfg.meta && typeof cfg.meta === 'object' ? cfg.meta : {};
  const difficulty = enumVal(meta.difficulty, ['easy', 'normal', 'hard'], 'normal');
  const d = difficultyDefaults(difficulty);
  const theme = String(meta.theme || 'arcade').slice(0, 40) || 'arcade';

  cfg.meta = {
    title: String(meta.title || `${theme} ${difficulty}`).slice(0, 60),
    genre: 'runner',
    theme,
    difficulty,
  };

  cfg.player = cfg.player && typeof cfg.player === 'object' ? cfg.player : {};
  cfg.player.speed = 0;
  cfg.player.jumpVelocity = clamp(cfg.player.jumpVelocity, 300, 900, d.jumpVelocity);
  cfg.player.doubleJump = typeof cfg.player.doubleJump === 'boolean' ? cfg.player.doubleJump : true;
  cfg.player.hp = clamp(cfg.player.hp, 1, 5, d.hp);
  cfg.player.color = color(cfg.player.color, '0xffffff');
  cfg.player.size = clamp(cfg.player.size, 16, 64, 32);

  cfg.world = cfg.world && typeof cfg.world === 'object' ? cfg.world : {};
  cfg.world.gravity = clamp(cfg.world.gravity, 600, 2000, d.gravity);
  const ratio = cfg.player.jumpVelocity / cfg.world.gravity;
  if (ratio < 0.40 || ratio > 0.50) {
    cfg.player.jumpVelocity = d.jumpVelocity;
    cfg.world.gravity = d.gravity;
  }
  cfg.world.scrollSpeed = clamp(cfg.world.scrollSpeed, 100, difficulty === 'hard' ? 280 : difficulty === 'normal' ? 200 : 180, d.scrollSpeed);
  cfg.world.groundColor = color(cfg.world.groundColor, '0x222222');
  cfg.world.skyColor = color(cfg.world.skyColor, '0x000022');

  const firstObstacle = Array.isArray(cfg.obstacles) && cfg.obstacles[0] && typeof cfg.obstacles[0] === 'object' ? cfg.obstacles[0] : {};
  cfg.obstacles = [{
    type: String(firstObstacle.type || 'block').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'block',
    spawnInterval: clamp(firstObstacle.spawnInterval, d.spawnInterval, 3.0, d.spawnInterval),
    color: color(firstObstacle.color, '0x888888'),
    width: clamp(firstObstacle.width, 18, 40, 28),
    height: clamp(firstObstacle.height, 24, 40, 32),
  }];

  if (!cfg.player.doubleJump) {
    cfg.obstacles[0].spawnInterval = Math.max(cfg.obstacles[0].spawnInterval, 1.8);
    cfg.obstacles[0].height = Math.min(cfg.obstacles[0].height, 30);
  }

  cfg.scoring = { type: 'distance', perPixel: clamp(cfg.scoring?.perPixel, 0.01, 0.5, d.perPixel) };

  const exp = cfg.experience && typeof cfg.experience === 'object' ? cfg.experience : {};
  cfg.experience = {
    goalText: String(exp.goalText || `Survive the ${theme} run`).slice(0, 80),
    instructionText: String(exp.instructionText || 'Tap / Space to jump').slice(0, 80),
    failureText: String(exp.failureText || 'Try again!').slice(0, 80),
    successText: String(exp.successText || 'Great run!').slice(0, 80),
    mood: enumVal(exp.mood, ['calm', 'playful', 'intense', 'mysterious'], difficulty === 'hard' ? 'intense' : 'playful'),
    reward: enumVal(exp.reward, ['score', 'survival', 'collection'], difficulty === 'hard' ? 'survival' : 'score'),
  };

  return cfg;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputs = JSON.parse(fs.readFileSync(path.join(ROOT, inputFile), 'utf8'));
  const repaired = {};
  const changed = [];
  const invalid = [];
  for (const [id, cfg] of Object.entries(outputs)) {
    repaired[id] = repairRunnerConfig(cfg);
    if (JSON.stringify(repaired[id]) !== JSON.stringify(cfg)) changed.push(id);
    const errs = validate(repaired[id]);
    if (errs.length) invalid.push(`${id}: ${errs.join('; ')}`);
  }
  if (invalid.length) {
    console.error(invalid.join('\n'));
    process.exit(1);
  }
  fs.writeFileSync(path.join(ROOT, outputFile), JSON.stringify(repaired, null, 2) + '\n');
  console.log(`repaired ${changed.length}/${Object.keys(outputs).length} configs -> ${outputFile}`);
  if (changed.length) console.log(`changed: ${changed.join(', ')}`);
}
