/**
 * SFT data generator — produces (request, config) pairs that follow the
 * runner recipe in prompts/codegen.md. Output: eval/sft-runner-requests.json
 * and eval/sft-runner-outputs.json. Run after this:
 *   node scripts/run-eval-comate.mjs (with REQUESTS/OUTPUTS env vars)
 * to filter to the passing subset, then `node scripts/build-sft-jsonl.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Recipe-conforming defaults per difficulty. Only theme palette varies per case.
const DIFF = {
  easy:   { jumpV: 600, gravity: 1250, scroll: 170, hp: 5, spawn: 2.0, perPx: 0.1 },
  normal: { jumpV: 600, gravity: 1300, scroll: 230, hp: 3, spawn: 1.5, perPx: 0.15 },
  hard:   { jumpV: 700, gravity: 1500, scroll: 280, hp: 3, spawn: 1.7, perPx: 0.2 },
};

// (theme, difficulty, request_text, palette, obstacle)
const cases = [
  ['forest',     'easy',   'Forest run, easy. Single log obstacles.',           { player: '0x88cc44', ground: '0x4a3622', sky: '0x9ed6ff' }, { type: 'log',     color: '0x654321', w: 28, h: 36 }],
  ['forest',     'normal', 'Quick forest dash with branches in the way.',       { player: '0x66bb44', ground: '0x3a2a1a', sky: '0xa0e070' }, { type: 'branch',  color: '0x4a3a1a', w: 30, h: 30 }],
  ['forest',     'hard',   'Hard forest run with thorny bushes.',               { player: '0x336644', ground: '0x2a1a0a', sky: '0x556644' }, { type: 'thorn',   color: '0x224422', w: 24, h: 38 }],
  ['desert',     'easy',   'Sunny desert run, casual cactus dodging.',          { player: '0xffcc88', ground: '0xd2a679', sky: '0xffe8b0' }, { type: 'cactus',  color: '0x44aa44', w: 22, h: 36 }],
  ['desert',     'normal', 'Desert sprint with rocks.',                         { player: '0xff9966', ground: '0xc89060', sky: '0xffcc99' }, { type: 'rock',    color: '0x806040', w: 32, h: 32 }],
  ['desert',     'hard',   'Brutal desert run, sandstorms and tumbleweeds.',    { player: '0xff8866', ground: '0xa07050', sky: '0xddaa66' }, { type: 'tumbleweed', color: '0x886633', w: 26, h: 38 }],
  ['space',      'easy',   'Chill space float, slow asteroids.',                { player: '0xffffff', ground: '0x222244', sky: '0x000022' }, { type: 'asteroid',color: '0x888888', w: 30, h: 30 }],
  ['space',      'normal', 'Space runner with debris.',                         { player: '0xeeeeff', ground: '0x111133', sky: '0x000011' }, { type: 'debris',  color: '0xaaaaaa', w: 32, h: 28 }],
  ['space',      'hard',   'Aggressive space run, missiles incoming.',          { player: '0xff4466', ground: '0x110022', sky: '0x000022' }, { type: 'missile', color: '0xff6666', w: 28, h: 36 }],
  ['ocean',      'easy',   'Underwater run, easy, slow jellyfish.',             { player: '0x88ddff', ground: '0x224466', sky: '0x66bbdd' }, { type: 'jellyfish',color: '0xff88dd', w: 28, h: 32 }],
  ['ocean',      'normal', 'Coral reef dash with sea urchins.',                 { player: '0xffaa44', ground: '0xff8866', sky: '0x44aaff' }, { type: 'urchin',  color: '0x442266', w: 26, h: 30 }],
  ['cyberpunk',  'normal', 'Neon city run with hover drones.',                  { player: '0xff00aa', ground: '0x111144', sky: '0x000033' }, { type: 'drone',   color: '0x00ffff', w: 34, h: 30 }],
  ['cyberpunk',  'hard',   'Hard cyberpunk chase, lasers and turrets.',         { player: '0xff0066', ground: '0x110033', sky: '0x220044' }, { type: 'laser',   color: '0xff3300', w: 22, h: 38 }],
  ['candy',      'easy',   'Sweet candy land, easy, lollipop hurdles.',         { player: '0xff66cc', ground: '0xff99cc', sky: '0xffeeff' }, { type: 'lollipop',color: '0xff3366', w: 28, h: 36 }],
  ['ice',        'normal', 'Ice cave run with falling icicles.',                { player: '0xaaddff', ground: '0xeeeeff', sky: '0xccddff' }, { type: 'icicle',  color: '0x88ccee', w: 18, h: 36 }],
  ['volcano',    'hard',   'Volcanic run, lava jets and rocks.',                { player: '0xff6644', ground: '0x331100', sky: '0xaa3322' }, { type: 'lavarock',color: '0x882200', w: 28, h: 40 }],
  ['city',       'normal', 'Urban rooftop run with AC units.',                  { player: '0x4488cc', ground: '0x666666', sky: '0xaaaacc' }, { type: 'acunit',  color: '0x444444', w: 36, h: 32 }],
  ['medieval',   'normal', 'Medieval village run, barrels in the way.',         { player: '0xddbb88', ground: '0x664422', sky: '0xaaccdd' }, { type: 'barrel',  color: '0x6b4423', w: 30, h: 36 }],
  ['mountain',   'hard',   'Mountain peak run, dodge falling rocks.',           { player: '0xccbbaa', ground: '0x554433', sky: '0x99aabb' }, { type: 'boulder', color: '0x554422', w: 34, h: 36 }],
  ['underground','normal', 'Mine cart run with stalagmites.',                   { player: '0xddaa66', ground: '0x332211', sky: '0x111111' }, { type: 'stalagmite',color: '0x665533', w: 22, h: 38 }],
  ['sunset',     'easy',   'Relaxed sunset jog, easy obstacles.',               { player: '0xffaa66', ground: '0x884444', sky: '0xffcc99' }, { type: 'cone',    color: '0xff6633', w: 24, h: 32 }],
  ['noir',       'normal', 'Black-and-white noir alley run.',                   { player: '0xeeeeee', ground: '0x222222', sky: '0x444444' }, { type: 'crate',   color: '0x666666', w: 32, h: 32 }],
  ['pirate',     'normal', 'Pirate ship deck run with rolling barrels.',        { player: '0xddbb55', ground: '0x664422', sky: '0x4488aa' }, { type: 'barrel',  color: '0x553311', w: 32, h: 32 }],
  ['fairy',      'easy',   'Fairy garden hop, easy mushroom obstacles.',        { player: '0xff99dd', ground: '0x66aa66', sky: '0xddccff' }, { type: 'mushroom',color: '0xcc4466', w: 28, h: 30 }],
  ['monster',    'hard',   'Halloween graveyard run, hard, tombstones.',        { player: '0x9966ff', ground: '0x222233', sky: '0x441166' }, { type: 'tombstone',color: '0x666666', w: 28, h: 38 }],
  ['zen',        'easy',   'Minimal zen run, single white block obstacles.',    { player: '0x222222', ground: '0xeeeeee', sky: '0xffffff' }, { type: 'block',   color: '0x888888', w: 28, h: 28 }],
  ['neon',       'hard',   'Hard neon arcade run, glowing barriers.',           { player: '0x00ffaa', ground: '0x000022', sky: '0x110033' }, { type: 'barrier', color: '0xff00ff', w: 18, h: 40 }],
  ['disco',      'normal', 'Disco runner, dodge spinning discs.',               { player: '0xffff66', ground: '0x220033', sky: '0xff66cc' }, { type: 'disc',    color: '0x33ffff', w: 30, h: 30 }],
  ['apocalypse', 'hard',   'Post-apocalyptic ruin run, hard.',                  { player: '0xaa6633', ground: '0x332211', sky: '0x665544' }, { type: 'wreck',   color: '0x554433', w: 32, h: 38 }],
  ['arctic',     'normal', 'Arctic tundra dash with snow piles.',               { player: '0x66aaff', ground: '0xeeeeff', sky: '0xddeeff' }, { type: 'snowpile',color: '0xddddee', w: 34, h: 30 }],
];

const requests = [];
const outputs = {};

cases.forEach(([theme, diff, request, palette, obstacle], i) => {
  const id = `s${String(i + 1).padStart(2, '0')}`;
  const d = DIFF[diff];
  requests.push({ id, request });
  outputs[id] = {
    meta: { title: `${theme[0].toUpperCase() + theme.slice(1)} ${diff[0].toUpperCase() + diff.slice(1)}`, genre: 'runner', theme, difficulty: diff },
    player: { speed: 0, jumpVelocity: d.jumpV, doubleJump: true, hp: d.hp, color: palette.player, size: 32 },
    world: { gravity: d.gravity, scrollSpeed: d.scroll, groundColor: palette.ground, skyColor: palette.sky },
    obstacles: [{ type: obstacle.type, spawnInterval: d.spawn, color: obstacle.color, width: obstacle.w, height: obstacle.h }],
    scoring: { type: 'distance', perPixel: d.perPx },
  };
});

fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-requests.json'), JSON.stringify(requests, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-outputs.json'), JSON.stringify(outputs, null, 2) + '\n');
console.log(`generated ${cases.length} cases -> eval/sft-runner-{requests,outputs}.json`);
