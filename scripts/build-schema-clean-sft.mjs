import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const inFile = process.env.INPUT_JSONL || 'eval/sft-runner.jsonl';
const outFile = process.env.OUT_JSONL || 'eval/sft-runner-schema-clean.jsonl';
const promptFile = process.env.PROMPT_FILE || 'prompts/sft-system-compact.md';

const systemPrompt = fs.readFileSync(path.join(ROOT, promptFile), 'utf8').trim();
const source = fs.readFileSync(path.join(ROOT, inFile), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);

const repaired = [];
let skipped = 0;

const moodByTheme = (theme = '', difficulty = 'normal') => {
  const t = theme.toLowerCase();
  if (/candy|toy|fairy|garden|meadow|carnival|bakery|pumpkin|flower|orchid/.test(t)) return 'playful';
  if (/zen|tea|forest|ocean|reef|cloud|meadow|sunset|dawn|riverside|botanical/.test(t)) return 'calm';
  if (/haunt|void|night|abyss|shadow|ghost|grave|monster|midnight|blackhole/.test(t)) return 'mysterious';
  if (difficulty === 'hard') return 'intense';
  return 'playful';
};

const rewardByDifficulty = (difficulty = 'normal') => difficulty === 'hard' ? 'survival' : 'score';

function cleanConfig(cfg) {
  const difficulty = ['easy', 'normal', 'hard'].includes(cfg?.meta?.difficulty) ? cfg.meta.difficulty : 'normal';
  const theme = String(cfg?.meta?.theme || 'arcade');
  const obstacle = Array.isArray(cfg?.obstacles) && cfg.obstacles[0] ? cfg.obstacles[0] : {};
  const defaults = {
    easy: { jumpVelocity: 600, gravity: 1250, scrollSpeed: 170, hp: 5, spawnInterval: 2.0, perPixel: 0.1 },
    normal: { jumpVelocity: 600, gravity: 1300, scrollSpeed: 200, hp: 3, spawnInterval: 1.7, perPixel: 0.13 },
    hard: { jumpVelocity: 700, gravity: 1500, scrollSpeed: 280, hp: 3, spawnInterval: 1.7, perPixel: 0.2 },
  }[difficulty];

  const title = String(cfg?.meta?.title || `${theme} runner`).slice(0, 60);
  const obstacleType = String(obstacle.type || 'block').replace(/[^a-zA-Z0-9_-]/g, '_') || 'block';

  return {
    meta: {
      title,
      genre: 'runner',
      theme,
      difficulty,
    },
    player: {
      speed: 0,
      jumpVelocity: defaults.jumpVelocity,
      doubleJump: true,
      hp: defaults.hp,
      color: /^0x[0-9a-fA-F]{6}$/.test(cfg?.player?.color || '') ? cfg.player.color : '0xffffff',
      size: typeof cfg?.player?.size === 'number' ? Math.min(64, Math.max(16, cfg.player.size)) : 32,
    },
    world: {
      gravity: defaults.gravity,
      scrollSpeed: defaults.scrollSpeed,
      groundColor: /^0x[0-9a-fA-F]{6}$/.test(cfg?.world?.groundColor || '') ? cfg.world.groundColor : '0x222222',
      skyColor: /^0x[0-9a-fA-F]{6}$/.test(cfg?.world?.skyColor || '') ? cfg.world.skyColor : '0x000022',
    },
    obstacles: [{
      type: obstacleType,
      spawnInterval: defaults.spawnInterval,
      color: /^0x[0-9a-fA-F]{6}$/.test(obstacle.color || '') ? obstacle.color : '0x888888',
      width: typeof obstacle.width === 'number' ? Math.min(40, Math.max(18, obstacle.width)) : 28,
      height: typeof obstacle.height === 'number' ? Math.min(40, Math.max(24, obstacle.height)) : 32,
    }],
    scoring: { type: 'distance', perPixel: defaults.perPixel },
    experience: {
      goalText: cfg?.experience?.goalText && typeof cfg.experience.goalText === 'string' ? cfg.experience.goalText.slice(0, 80) : `Survive the ${theme} run`,
      instructionText: 'Tap / Space to jump',
      failureText: cfg?.experience?.failureText && typeof cfg.experience.failureText === 'string' ? cfg.experience.failureText.slice(0, 80) : 'Try again!',
      successText: cfg?.experience?.successText && typeof cfg.experience.successText === 'string' ? cfg.experience.successText.slice(0, 80) : 'Great run!',
      mood: moodByTheme(theme, difficulty),
      reward: rewardByDifficulty(difficulty),
    },
  };
}

for (const row of source) {
  try {
    const user = row.messages?.find((m) => m.role === 'user')?.content;
    const assistant = row.messages?.find((m) => m.role === 'assistant')?.content;
    if (!user || !assistant) throw new Error('missing messages');
    const cfg = cleanConfig(JSON.parse(assistant));
    const errs = validate(cfg);
    if (errs.length) throw new Error(errs.join('; '));
    repaired.push(JSON.stringify({
      id: row.id,
      ensemble: row.ensemble,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: user },
        { role: 'assistant', content: JSON.stringify(cfg, null, 2) },
      ],
    }));
  } catch (err) {
    skipped++;
  }
}

fs.writeFileSync(path.join(ROOT, outFile), repaired.join('\n') + '\n');
console.log(`schema-clean: ${repaired.length} rows -> ${outFile}; skipped ${skipped}`);
