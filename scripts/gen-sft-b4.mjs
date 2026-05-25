/**
 * SFT batch 4 — another 30 cases (15 easy + 15 hard) with fresh themes.
 * Goal: push eval/sft-runner.jsonl beyond 100 samples.
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
  ['castle',      'easy', 'Castle courtyard jog, easy, small shields.',       { player: '0xddccaa', ground: '0x776655', sky: '0xaaccff' }, { type: 'shield',   color: '0x999999', w: 26, h: 32 }],
  ['farm',        'easy', 'Farm lane run, easy, pumpkin hurdles.',            { player: '0xffaa44', ground: '0x886633', sky: '0xffdd99' }, { type: 'pumpkin',  color: '0xff7733', w: 30, h: 30 }],
  ['temple',      'easy', 'Temple path run, easy, incense stands.',           { player: '0xffcc66', ground: '0x886644', sky: '0xddccaa' }, { type: 'stand',    color: '0x664422', w: 24, h: 34 }],
  ['moonlit',     'easy', 'Moonlit road jog, easy, signposts.',               { player: '0xbbccff', ground: '0x333355', sky: '0x111133' }, { type: 'signpost', color: '0x886633', w: 24, h: 34 }],
  ['carnival',    'easy', 'Carnival run, easy, toy blocks.',                  { player: '0xff66aa', ground: '0x773366', sky: '0xffccff' }, { type: 'toyblock', color: '0x33ccff', w: 30, h: 30 }],
  ['spa',         'easy', 'Hot spring path, easy, towel baskets.',            { player: '0xffddcc', ground: '0xaa8877', sky: '0xffeeee' }, { type: 'basket',   color: '0xccaa88', w: 30, h: 30 }],
  ['trainyard',   'easy', 'Train yard stroll, easy, small crates.',           { player: '0x6699cc', ground: '0x555555', sky: '0x99bbcc' }, { type: 'crate',    color: '0x664422', w: 30, h: 30 }],
  ['botanical',   'easy', 'Botanical dome run, easy, seed pods.',             { player: '0x88dd88', ground: '0x336633', sky: '0xccffdd' }, { type: 'seedpod',  color: '0x669944', w: 28, h: 30 }],
  ['riverside',   'easy', 'Riverside path, easy, picnic baskets.',            { player: '0x66aadd', ground: '0x77aa55', sky: '0xbbddff' }, { type: 'picnic',   color: '0xcc7744', w: 30, h: 28 }],
  ['clocktower',  'easy', 'Clocktower square run, easy, gear piles.',         { player: '0xddaa66', ground: '0x665544', sky: '0xccbb99' }, { type: 'gear',     color: '0x888888', w: 28, h: 30 }],
  ['snowvillage', 'easy', 'Snow village run, easy, gift boxes.',              { player: '0xff6666', ground: '0xeeeeff', sky: '0xccddff' }, { type: 'gift',     color: '0x66ccff', w: 30, h: 30 }],
  ['sunflower',   'easy', 'Sunflower field jog, easy, watering cans.',        { player: '0xffff66', ground: '0x88aa44', sky: '0xffee99' }, { type: 'can',      color: '0x6699aa', w: 26, h: 32 }],
  ['cloud',       'easy', 'Cloud road hop, easy, puff blocks.',               { player: '0xaaaaff', ground: '0xffffff', sky: '0xaaccff' }, { type: 'puff',     color: '0xeeeeff', w: 30, h: 28 }],
  ['beach',       'easy', 'Beach boardwalk run, easy, sand buckets.',         { player: '0xffcc88', ground: '0xddaa66', sky: '0x88ccff' }, { type: 'bucket',   color: '0xff6644', w: 26, h: 30 }],
  ['tea',         'easy', 'Tea garden stroll, easy, ceramic pots.',           { player: '0x99cc88', ground: '0x775533', sky: '0xddeebb' }, { type: 'teapot',   color: '0xccaa88', w: 28, h: 30 }],

  // 15 hard
  ['meteor',      'hard', 'Hard meteor shower run, burning rocks.',           { player: '0xffcc44', ground: '0x331111', sky: '0x110011' }, { type: 'meteor',   color: '0xff5522', w: 28, h: 38 }],
  ['doomsday',    'hard', 'Hard doomsday highway, wreck barriers.',           { player: '0xaa7744', ground: '0x332211', sky: '0x663333' }, { type: 'wreck',    color: '0x554433', w: 30, h: 38 }],
  ['reactor',     'hard', 'Hard reactor core sprint, coolant vents.',         { player: '0x66ffcc', ground: '0x222244', sky: '0x001122' }, { type: 'vent',     color: '0x00ffaa', w: 24, h: 40 }],
  ['necropolis',  'hard', 'Hard necropolis run, bone spikes.',                { player: '0xccbb99', ground: '0x221122', sky: '0x332244' }, { type: 'bonespike',color: '0xddddcc', w: 22, h: 40 }],
  ['thunder',     'hard', 'Hard thunder peak, charged crystals.',             { player: '0xffff99', ground: '0x333355', sky: '0x444488' }, { type: 'crystal',  color: '0x99ccff', w: 24, h: 40 }],
  ['acidworks',   'hard', 'Hard acidworks run, leaking barrels.',             { player: '0x99ff66', ground: '0x223322', sky: '0x335533' }, { type: 'barrel',   color: '0x66aa33', w: 30, h: 36 }],
  ['orbital',     'hard', 'Hard orbital station, broken satellites.',         { player: '0xeeeeff', ground: '0x111133', sky: '0x000011' }, { type: 'satellite',color: '0xaaaacc', w: 30, h: 38 }],
  ['subway',      'hard', 'Hard subway tunnel run, signal posts.',            { player: '0xffcc33', ground: '0x333333', sky: '0x111111' }, { type: 'signal',   color: '0xff3333', w: 22, h: 40 }],
  ['fortress',    'hard', 'Hard fortress escape, iron spikes.',               { player: '0xbbbbbb', ground: '0x444444', sky: '0x666688' }, { type: 'ironspike',color: '0x999999', w: 22, h: 40 }],
  ['serpent',     'hard', 'Hard serpent temple, poison fangs.',               { player: '0x88cc44', ground: '0x333311', sky: '0x445522' }, { type: 'fang',     color: '0xccff66', w: 20, h: 38 }],
  ['redplanet',   'hard', 'Hard red planet sprint, jagged ore.',              { player: '0xff8844', ground: '0x883322', sky: '0xaa5533' }, { type: 'ore',      color: '0x662211', w: 28, h: 38 }],
  ['ghostship',   'hard', 'Hard ghost ship deck, cursed anchors.',            { player: '0xaaddff', ground: '0x334455', sky: '0x112233' }, { type: 'anchor',   color: '0x667788', w: 28, h: 38 }],
  ['diamondmine', 'hard', 'Hard diamond mine, sharp crystal clusters.',       { player: '0x66ccff', ground: '0x332244', sky: '0x111122' }, { type: 'cluster',  color: '0x88ffff', w: 24, h: 40 }],
  ['skyforge',    'hard', 'Hard sky forge run, molten anvils.',               { player: '0xffbb66', ground: '0x443322', sky: '0x775544' }, { type: 'anvil',    color: '0x555555', w: 30, h: 38 }],
  ['timewarp',    'hard', 'Hard time warp, clock blades.',                    { player: '0xffffaa', ground: '0x221133', sky: '0x332266' }, { type: 'clockblade',color: '0xffdd66', w: 22, h: 40 }],
];

const requests = [];
const outputs = {};
cases.forEach(([theme, diff, request, palette, obs], i) => {
  const id = `b4_${String(i + 1).padStart(2, '0')}`;
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

fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-b4-requests.json'), JSON.stringify(requests, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-b4-outputs.json'), JSON.stringify(outputs, null, 2) + '\n');
console.log(`generated ${cases.length} batch-4 cases (15 easy + 15 hard) -> eval/sft-runner-b4-{requests,outputs}.json`);
