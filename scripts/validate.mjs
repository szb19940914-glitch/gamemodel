// Schema validator shared by both eval runners.
// Genre-aware: dispatches by cfg.meta.genre.

export const COLOR_RE = /^0x[0-9a-fA-F]{6}$/;

const RUNNER_RANGES = {
  'player.jumpVelocity': [300, 900],
  'player.hp': [1, 5],
  'player.size': [16, 64],
  'world.gravity': [600, 2000],
  'world.scrollSpeed': [100, 600],
  'scoring.perPixel': [0.01, 0.5],
};
const RUNNER_OB = { spawnInterval: [0.5, 3.0], width: [12, 80], height: [12, 80] };
const EXPERIENCE_ENUMS = {
  mood: ['calm', 'playful', 'intense', 'mysterious'],
  reward: ['score', 'survival', 'collection'],
};
const EXPERIENCE_TEXT_FIELDS = ['goalText', 'instructionText', 'successText', 'failureText'];

const PLAT_RANGES = {
  'player.jumpVelocity': [300, 900],
  'player.moveSpeed': [100, 300],
  'player.hp': [1, 5],
  'player.size': [16, 64],
  'world.gravity': [600, 2000],
  'world.width': [800, 2400],
};
const PLAT_PLATFORM = {
  x: [0, 2400],
  y: [100, 360],
  width: [40, 400],
  height: [8, 40],
};
const PLAT_GOAL = { x: [60, 2380], y: [60, 380] };

function validateExperience(cfg, errs) {
  if (cfg.experience === undefined) return;
  if (!cfg.experience || typeof cfg.experience !== 'object' || Array.isArray(cfg.experience)) {
    errs.push('experience must be object');
    return;
  }
  for (const k of EXPERIENCE_TEXT_FIELDS) {
    const v = cfg.experience[k];
    if (v !== undefined && (typeof v !== 'string' || v.length > 80)) errs.push(`experience.${k} must be string <=80 chars`);
  }
  for (const [k, vals] of Object.entries(EXPERIENCE_ENUMS)) {
    const v = cfg.experience[k];
    if (v !== undefined && !vals.includes(v)) errs.push(`experience.${k} must be one of ${vals.join(',')}`);
  }
}

export function validate(cfg) {
  const get = (p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), cfg);
  const errs = [];

  if (!cfg.meta || !['runner', 'platformer'].includes(cfg.meta.genre)) {
    errs.push('meta.genre must be runner or platformer');
    return errs;
  }

  validateExperience(cfg, errs);

  if (cfg.meta.genre === 'runner') {
    for (const [k, [lo, hi]] of Object.entries(RUNNER_RANGES)) {
      const v = get(k);
      if (typeof v !== 'number' || v < lo || v > hi) errs.push(`${k}=${v} out of [${lo},${hi}]`);
    }
    for (const k of ['player.color', 'world.groundColor', 'world.skyColor']) {
      if (!COLOR_RE.test(get(k) || '')) errs.push(`${k} bad color`);
    }
    if (typeof cfg.player?.doubleJump !== 'boolean') errs.push('player.doubleJump must be boolean');
    if (!Array.isArray(cfg.obstacles) || cfg.obstacles.length < 1 || cfg.obstacles.length > 3) {
      errs.push('obstacles must be 1..3');
    } else {
      cfg.obstacles.forEach((o, i) => {
        for (const [k, [lo, hi]] of Object.entries(RUNNER_OB)) {
          if (typeof o[k] !== 'number' || o[k] < lo || o[k] > hi)
            errs.push(`obstacles[${i}].${k}=${o[k]} out of [${lo},${hi}]`);
        }
        if (!COLOR_RE.test(o.color || '')) errs.push(`obstacles[${i}].color bad`);
        if (!o.type) errs.push(`obstacles[${i}].type missing`);
      });
    }
    if (cfg.scoring?.type !== 'distance') errs.push('scoring.type must be distance');
  } else {
    for (const [k, [lo, hi]] of Object.entries(PLAT_RANGES)) {
      const v = get(k);
      if (typeof v !== 'number' || v < lo || v > hi) errs.push(`${k}=${v} out of [${lo},${hi}]`);
    }
    for (const k of ['player.color', 'world.groundColor', 'world.skyColor', 'goal.color']) {
      if (!COLOR_RE.test(get(k) || '')) errs.push(`${k} bad color`);
    }
    if (typeof cfg.player?.doubleJump !== 'boolean') errs.push('player.doubleJump must be boolean');
    if (!Array.isArray(cfg.platforms) || cfg.platforms.length < 1 || cfg.platforms.length > 10) {
      errs.push('platforms must be 1..10');
    } else {
      cfg.platforms.forEach((p, i) => {
        for (const [k, [lo, hi]] of Object.entries(PLAT_PLATFORM)) {
          if (typeof p[k] !== 'number' || p[k] < lo || p[k] > hi)
            errs.push(`platforms[${i}].${k}=${p[k]} out of [${lo},${hi}]`);
        }
        if (!COLOR_RE.test(p.color || '')) errs.push(`platforms[${i}].color bad`);
      });
    }
    if (!cfg.goal) errs.push('goal missing');
    else
      for (const [k, [lo, hi]] of Object.entries(PLAT_GOAL)) {
        const v = cfg.goal[k];
        if (typeof v !== 'number' || v < lo || v > hi) errs.push(`goal.${k}=${v} out of [${lo},${hi}]`);
      }
  }
  return errs;
}
