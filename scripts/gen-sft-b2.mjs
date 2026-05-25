/**
 * SFT batch 2 — 30 more cases (15 easy + 15 hard) using recipe v0.3.
 * Skips normal difficulty (pass rate too noisy). All themes new (no overlap
 * with batch 1). Output: eval/sft-runner-b2-{requests,outputs}.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DIFF = {
  easy: { jumpV: 600, gravity: 1250, scroll: 170, hp: 5, spawn: 2.0, perPx: 0.1 },
  hard: { jumpV: 700, gravity: 1500, scroll: 280, hp: 3, spawn: 1.7, perPx: 0.2 },
};

// 15 easy + 15 hard, all new themes
const cases = [
  // --- 15 easy ---
  ['jungle',     'easy', 'Jungle stroll, easy, vine drop hurdles.',          { player: '0x88dd66', ground: '0x335522', sky: '0xaaeeaa' }, { type: 'vine',     color: '0x335511', w: 22, h: 36 }],
  ['savanna',    'easy', 'Lazy savanna trot dodging termite mounds.',        { player: '0xddaa66', ground: '0xbb9955', sky: '0xffeeaa' }, { type: 'mound',    color: '0x886633', w: 30, h: 30 }],
  ['meadow',     'easy', 'Sunny meadow run, easy, hay bales.',               { player: '0xffdd88', ground: '0x88cc44', sky: '0xddeeff' }, { type: 'hay',      color: '0xddbb55', w: 32, h: 32 }],
  ['lagoon',     'easy', 'Tropical lagoon hop with floating buoys.',         { player: '0x44ccff', ground: '0xddccaa', sky: '0xaaeeff' }, { type: 'buoy',     color: '0xff6644', w: 24, h: 32 }],
  ['orchard',    'easy', 'Apple orchard run, easy, fallen baskets.',         { player: '0xcc4444', ground: '0x664422', sky: '0xddeebb' }, { type: 'basket',   color: '0x885522', w: 30, h: 28 }],
  ['garden',     'easy', 'Royal garden jog dodging hedge bushes, easy.',     { player: '0xeebbdd', ground: '0x336622', sky: '0xddeeff' }, { type: 'hedge',    color: '0x224422', w: 32, h: 36 }],
  ['library',    'easy', 'Quiet library run, easy, fallen books.',           { player: '0x886644', ground: '0xaa8855', sky: '0xddccaa' }, { type: 'book',     color: '0x884422', w: 26, h: 28 }],
  ['shrine',     'easy', 'Peaceful shrine run, easy, stone lanterns.',       { player: '0xffaaaa', ground: '0x664422', sky: '0xddccdd' }, { type: 'lantern',  color: '0x666666', w: 24, h: 36 }],
  ['plaza',      'easy', 'Town plaza run, easy, market crates.',             { player: '0xccddaa', ground: '0x886655', sky: '0xaaccff' }, { type: 'crate',    color: '0x664422', w: 30, h: 30 }],
  ['lighthouse', 'easy', 'Coastal lighthouse jog, easy, lobster traps.',     { player: '0x4488cc', ground: '0xaa9988', sky: '0xccddee' }, { type: 'trap',     color: '0x553311', w: 28, h: 28 }],
  ['dawn',       'easy', 'Soft dawn run, easy, dewy flowerpots.',            { player: '0xffccaa', ground: '0x886655', sky: '0xffddcc' }, { type: 'pot',      color: '0xaa6644', w: 26, h: 30 }],
  ['vineyard',   'easy', 'Vineyard amble, easy, wine barrels.',              { player: '0xaa3366', ground: '0x664422', sky: '0xeeccaa' }, { type: 'barrel',   color: '0x553311', w: 30, h: 32 }],
  ['museum',     'easy', 'Museum hall run, easy, display pedestals.',        { player: '0xcccccc', ground: '0x554433', sky: '0xddccbb' }, { type: 'pedestal', color: '0x886644', w: 26, h: 36 }],
  ['aquarium',   'easy', 'Aquarium tunnel run, easy, kelp clumps.',          { player: '0xff9966', ground: '0x224477', sky: '0x4488cc' }, { type: 'kelp',     color: '0x336644', w: 24, h: 36 }],
  ['twilight',   'easy', 'Twilight stroll, easy, glow stones.',              { player: '0xddccff', ground: '0x332244', sky: '0x664488' }, { type: 'stone',    color: '0x9966cc', w: 28, h: 28 }],

  // --- 15 hard ---
  ['rift',       'hard', 'Hard dimensional rift run, energy spikes.',        { player: '0xff00ff', ground: '0x110022', sky: '0x000033' }, { type: 'spike',    color: '0x66ffff', w: 22, h: 38 }],
  ['abyss',      'hard', 'Hard deep abyss run, anglerfish lures.',           { player: '0x4466ff', ground: '0x000022', sky: '0x000011' }, { type: 'lure',     color: '0xffff44', w: 24, h: 36 }],
  ['magma',      'hard', 'Hard magma corridor, exploding geysers.',          { player: '0xffaa00', ground: '0x330000', sky: '0xaa3300' }, { type: 'geyser',   color: '0xff4400', w: 26, h: 40 }],
  ['wasteland',  'hard', 'Hard wasteland sprint, rusted spikes.',            { player: '0xaa6633', ground: '0x553322', sky: '0x886633' }, { type: 'spike',    color: '0x664433', w: 22, h: 38 }],
  ['nightmare',  'hard', 'Hard nightmare run, shadow tendrils.',             { player: '0x6644aa', ground: '0x110011', sky: '0x220022' }, { type: 'tendril',  color: '0x440066', w: 18, h: 38 }],
  ['void',       'hard', 'Hard void chase, anti-matter shards.',             { player: '0xffffff', ground: '0x111111', sky: '0x000000' }, { type: 'shard',    color: '0xff66cc', w: 22, h: 36 }],
  ['lab',        'hard', 'Hard lab escape, hard, laser grids.',              { player: '0x66ddff', ground: '0xcccccc', sky: '0xeeeeff' }, { type: 'grid',     color: '0xff3333', w: 18, h: 40 }],
  ['factory',    'hard', 'Hard factory floor, conveyor crates.',             { player: '0xffcc00', ground: '0x444444', sky: '0x666677' }, { type: 'crate',    color: '0x886611', w: 32, h: 32 }],
  ['junkyard',   'hard', 'Hard junkyard run, scrap piles.',                  { player: '0xaaaa66', ground: '0x554433', sky: '0x776644' }, { type: 'scrap',    color: '0x886633', w: 30, h: 38 }],
  ['stadium',    'hard', 'Hard stadium hurdles, electrified gates.',         { player: '0xffaa00', ground: '0x336622', sky: '0x88aaff' }, { type: 'gate',     color: '0xff3300', w: 22, h: 38 }],
  ['rocket',     'hard', 'Hard rocket launchpad run, fuel tanks.',           { player: '0xff6644', ground: '0x444466', sky: '0x222244' }, { type: 'tank',     color: '0xffaa44', w: 32, h: 38 }],
  ['alien',      'hard', 'Hard alien hive run, slime pillars.',              { player: '0x44ff88', ground: '0x223344', sky: '0x664488' }, { type: 'slime',    color: '0x88ff44', w: 24, h: 38 }],
  ['ruins',      'hard', 'Hard ancient ruins, falling columns.',             { player: '0xddccaa', ground: '0x554433', sky: '0xaa8866' }, { type: 'column',   color: '0x886655', w: 22, h: 40 }],
  ['midnight',   'hard', 'Hard midnight run, shadow blades.',                { player: '0xaaaaff', ground: '0x000022', sky: '0x000033' }, { type: 'blade',    color: '0x6666ff', w: 18, h: 40 }],
  ['mirror',     'hard', 'Hard mirror world run, glass shards.',             { player: '0xeeeeee', ground: '0x224466', sky: '0xaaccdd' }, { type: 'shard',    color: '0x88aacc', w: 22, h: 40 }],
];

const requests = [];
const outputs = {};
cases.forEach(([theme, diff, request, palette, obs], i) => {
  const id = `b2_${String(i + 1).padStart(2, '0')}`;
  const d = DIFF[diff];
  requests.push({ id, request });
  outputs[id] = {
    meta: { title: `${theme[0].toUpperCase() + theme.slice(1)} ${diff[0].toUpperCase() + diff.slice(1)}`, genre: 'runner', theme, difficulty: diff },
    player: { speed: 0, jumpVelocity: d.jumpV, doubleJump: true, hp: d.hp, color: palette.player, size: 32 },
    world: { gravity: d.gravity, scrollSpeed: d.scroll, groundColor: palette.ground, skyColor: palette.sky },
    obstacles: [{ type: obs.type, spawnInterval: d.spawn, color: obs.color, width: obs.w, height: obs.h }],
    scoring: { type: 'distance', perPixel: d.perPx },
  };
});

fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-b2-requests.json'), JSON.stringify(requests, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-b2-outputs.json'), JSON.stringify(outputs, null, 2) + '\n');
console.log(`generated ${cases.length} batch-2 cases (15 easy + 15 hard) -> eval/sft-runner-b2-{requests,outputs}.json`);
