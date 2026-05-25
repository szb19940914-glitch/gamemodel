/**
 * Regenerate the 10 SFT cases that failed normal-difficulty (s02/s05/s11/
 * s12/s15/s20/s22/s25/s28/s30) with a tighter recipe v0.3:
 *   normal: spawn 1.7, scroll 200, perPx 0.13
 * Other fields keep the same theme palette/obstacle as the original case.
 * Output: eval/sft-runner-fix-{requests,outputs}.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FAIL_IDS = ['s02', 's05', 's11', 's12', 's15', 's20', 's22', 's25', 's28', 's30'];
const NORMAL_V3 = { jumpV: 600, gravity: 1300, scroll: 200, hp: 3, spawn: 1.7, perPx: 0.13 };

const reqs = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/sft-runner-requests.json'), 'utf8'));
const outs = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/sft-runner-outputs.json'), 'utf8'));

const newReqs = [];
const newOuts = {};

for (const id of FAIL_IDS) {
  const req = reqs.find((r) => r.id === id);
  const orig = outs[id];
  if (!req || !orig) continue;
  newReqs.push(req);
  // Clone but override player/world/spawnInterval/scoring per recipe v0.3.
  newOuts[id] = {
    ...orig,
    player: { ...orig.player, jumpVelocity: NORMAL_V3.jumpV, hp: NORMAL_V3.hp },
    world: { ...orig.world, gravity: NORMAL_V3.gravity, scrollSpeed: NORMAL_V3.scroll },
    obstacles: orig.obstacles.map((o) => ({ ...o, spawnInterval: NORMAL_V3.spawn })),
    scoring: { ...orig.scoring, perPixel: NORMAL_V3.perPx },
  };
}

fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-fix-requests.json'), JSON.stringify(newReqs, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'eval/sft-runner-fix-outputs.json'), JSON.stringify(newOuts, null, 2) + '\n');
console.log(`regenerated ${newReqs.length} fail cases with recipe v0.3 (normal: spawn 1.7, scroll 200)`);
