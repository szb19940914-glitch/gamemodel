/**
 * SFT batch 3 — another 30 cases (15 easy + 15 hard) with fresh themes.
 * Recipe v0.3, no overlap with batch 1 or batch 2.
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

const cases = [
  // 15 easy
  ['prairie',    'easy', 'Prairie ride, easy, dodge tumbleweeds.',           { player: '0xddbb66', ground: '0xbb9966', sky: '0xffeeaa' }, { type: 'tumbleweed', color: '0x886633', w: 30, h: 30 }],
  ['rainforest', 'easy', 'Rainforest stroll, easy, fallen palm fronds.',     { player: '0x44aa66', ground: '0x224422', sky: '0x99cc99' }, { type: 'frond',      color: '0x336622', w: 32, h: 28 }],
  ['treetop',    'easy', 'Treetop hop, easy, bird nests.',                   { player: '0xffcc88', ground: '0x664422', sky: '0xaaeeff' }, { type: 'nest',       color: '0x885533', w: 30, h: 30 }],
  ['harbor',     'easy', 'Harbor jog, easy, fishing nets.',                  { player: '0x88aaff', ground: '0x886655', sky: '0xaaccdd' }, { type: 'net',        color: '0x554433', w: 32, h: 28 }],
  ['bridge',     'easy', 'Old bridge run, easy, broken planks.',             { player: '0xaa6644', ground: '0x664422', sky: '0xddccaa' }, { type: 'plank',      color: '0x553322', w: 32, h: 26 }],
  ['canyon',     'easy', 'Canyon trek, easy, small rockfalls.',              { player: '0xffaa66', ground: '0xcc7744', sky: '0xffeebb' }, { type: 'pebble',     color: '0x884422', w: 26, h: 28 }],
  ['reef',       'easy', 'Coral reef glide, easy, soft anemones.',           { player: '0xff66aa', ground: '0xff8866', sky: '0x66bbdd' }, { type: 'anemone',    color: '0xaa4488', w: 26, h: 32 }],
  ['glacier',    'easy', 'Glacier walk, easy, snow chunks.',                 { player: '0x88ccff', ground: '0xeeeeff', sky: '0xccddff' }, { type: 'chunk',      color: '0xddeeff', w: 30, h: 28 }],
  ['marina',     'easy', 'Marina jog, easy, mooring buoys.',                 { player: '0x4488dd', ground: '0xaa9988', sky: '0xaaccee' }, { type: 'buoy',       color: '0xffaa44', w: 24, h: 30 }],
  ['orchid',     'easy', 'Orchid garden hop, easy, flowerbeds.',             { player: '0xff99cc', ground: '0x88aa66', sky: '0xddccff' }, { type: 'flower',     color: '0xff6699', w: 28, h: 30 }],
  ['observatory','easy', 'Observatory dome jog, easy, telescope cases.',     { player: '0xddccff', ground: '0x444477', sky: '0x222244' }, { type: 'case',       color: '0x666699', w: 30, h: 32 }],
  ['bakery',     'easy', 'Bakery hop, easy, flour sacks.',                   { player: '0xffddaa', ground: '0xaa7755', sky: '0xffeecc' }, { type: 'sack',       color: '0xddccaa', w: 32, h: 32 }],
  ['lavender',   'easy', 'Lavender field amble, easy, beehives.',            { player: '0xaa88dd', ground: '0x886699', sky: '0xddccee' }, { type: 'hive',       color: '0xddaa44', w: 30, h: 30 }],
  ['icefloe',    'easy', 'Ice floe hop, easy, penguin clusters.',            { player: '0x66ccff', ground: '0xeeeeff', sky: '0xaaccff' }, { type: 'cluster',    color: '0x222244', w: 28, h: 32 }],
  ['hangar',     'easy', 'Quiet airplane hangar, easy, fuel drums.',         { player: '0x88aacc', ground: '0x666666', sky: '0x99aacc' }, { type: 'drum',       color: '0x884422', w: 28, h: 30 }],

  // 15 hard
  ['inferno',    'hard', 'Hard inferno run, fire whips.',                    { player: '0xffaa00', ground: '0x220000', sky: '0xaa1100' }, { type: 'whip',       color: '0xff3300', w: 20, h: 38 }],
  ['stormcloud', 'hard', 'Hard stormcloud sprint, lightning rods.',          { player: '0xffff66', ground: '0x222244', sky: '0x444466' }, { type: 'rod',        color: '0xffff00', w: 18, h: 40 }],
  ['shadowrealm','hard', 'Hard shadow realm, wraith claws.',                 { player: '0x6644aa', ground: '0x110011', sky: '0x220033' }, { type: 'claw',       color: '0x440055', w: 22, h: 38 }],
  ['toxic',      'hard', 'Hard toxic swamp run, acid bubbles.',              { player: '0x66ff66', ground: '0x224422', sky: '0x336633' }, { type: 'bubble',     color: '0x88ff00', w: 24, h: 36 }],
  ['cyberlab',   'hard', 'Hard cyberlab run, plasma traps.',                 { player: '0x00ffaa', ground: '0x111133', sky: '0x222255' }, { type: 'plasma',     color: '0xff00ff', w: 20, h: 40 }],
  ['warzone',    'hard', 'Hard warzone sprint, mines and barricades.',       { player: '0x886644', ground: '0x553322', sky: '0x554433' }, { type: 'mine',       color: '0x442211', w: 28, h: 32 }],
  ['blackhole',  'hard', 'Hard blackhole edge, gravity wells.',              { player: '0xffffff', ground: '0x000000', sky: '0x110022' }, { type: 'well',       color: '0x440066', w: 26, h: 38 }],
  ['volcanic',   'hard', 'Hard volcanic eruption sprint, ash clouds.',       { player: '0xff8844', ground: '0x331100', sky: '0x884422' }, { type: 'ash',        color: '0x553311', w: 32, h: 36 }],
  ['mecha',      'hard', 'Hard mecha hangar, robot debris.',                 { player: '0xaaaaff', ground: '0x444466', sky: '0x222244' }, { type: 'debris',     color: '0x666688', w: 30, h: 38 }],
  ['hellgate',   'hard', 'Hard hellgate run, demon spikes.',                 { player: '0xff4422', ground: '0x220000', sky: '0x440011' }, { type: 'demonspike', color: '0xff2200', w: 22, h: 40 }],
  ['cavefall',   'hard', 'Hard cavefall run, stalactite drops.',             { player: '0xddccaa', ground: '0x221100', sky: '0x111111' }, { type: 'stalactite', color: '0x553322', w: 18, h: 40 }],
  ['frostbite',  'hard', 'Hard frostbite run, ice spikes.',                  { player: '0xaadeff', ground: '0xeeeeff', sky: '0xaaccdd' }, { type: 'icespike',   color: '0x88ccee', w: 22, h: 40 }],
  ['arcade',     'hard', 'Hard arcade run, glitch walls.',                   { player: '0x00ffff', ground: '0x220044', sky: '0x110033' }, { type: 'glitch',     color: '0xff00aa', w: 20, h: 38 }],
  ['samurai',    'hard', 'Hard samurai dojo, blade traps.',                  { player: '0xdd4422', ground: '0x442211', sky: '0xddccaa' }, { type: 'blade',      color: '0xcccccc', w: 22, h: 38 }],
  ['quantum',    'hard', 'Hard quantum lab, particle beams.',                { player: '0x66ccff', ground: '0x222244', sky: '0x000033' }, { type: 'beam',       color: '0xffff66', w: 18, h: 40 }],
];

const requests = [];
const outputs = {};
cases.forEach(([theme, diff, request, palette, obs], i) => {
  const id = `b3_${String(i + 1).padStart(2, '0')}`;
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

fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-b3-requests.json'), JSON.stringify(requests, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-b3-outputs.json'), JSON.stringify(outputs, null, 2) + '\n');
console.log(`generated ${cases.length} batch-3 cases (15 easy + 15 hard) -> eval/sft-runner-b3-{requests,outputs}.json`);
