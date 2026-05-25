import { test, expect } from '@playwright/test';

async function bootGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => !!(window as any).__GAME__, null, { timeout: 10_000 });
  return page.evaluate(() => (window as any).__GAME__.genre as string);
}

/**
 * Robot test: holds ArrowRight, taps ArrowUp periodically, expects to reach
 * the goal within a budget. This catches configs that are schema-valid but
 * functionally unplayable (e.g. unreachable goals, missing climb path).
 */
test('platformer-robot: auto right + jump can reach goal', async ({ page }) => {
  const genre = await bootGame(page);
  test.skip(genre !== 'platformer', `genre=${genre}, robot test skipped`);

  await page.keyboard.down('ArrowRight');
  const budgetMs = 14_000;
  const start = Date.now();
  let won = false;
  let lastPlayer: { x: number; y: number } = { x: -1, y: -1 };
  let stuckTicks = 0;
  let furthestX = -Infinity;
  let lastProgressMs = Date.now();

  while (Date.now() - start < budgetMs) {
    // tap jump
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(550);
    const snap = await page.evaluate(() => {
      const g: any = (window as any).__GAME__;
      return { isWin: !!g?.isWin, x: g?.player?.x ?? 0, y: g?.player?.y ?? 0 };
    });
    if (snap.isWin) { won = true; break; }
    // track real horizontal progress
    if (snap.x > furthestX + 5) {
      furthestX = snap.x;
      lastProgressMs = Date.now();
    }
    // early-fail: no horizontal progress in 5s ⇒ stop wasting budget
    if (Date.now() - lastProgressMs > 5_000) break;
    // anti-stuck: if x didn't change for ~3 ticks, briefly release+repress right
    if (Math.abs(snap.x - lastPlayer.x) < 2) {
      stuckTicks += 1;
      if (stuckTicks >= 3) {
        await page.keyboard.up('ArrowRight');
        await page.waitForTimeout(120);
        await page.keyboard.down('ArrowRight');
        stuckTicks = 0;
      }
    } else {
      stuckTicks = 0;
    }
    lastPlayer = { x: snap.x, y: snap.y };
  }
  await page.keyboard.up('ArrowRight');

  expect(won, `robot did not reach goal in ${budgetMs}ms; last pos=${JSON.stringify(lastPlayer)}`).toBe(true);
});

/**
 * Runner robot: taps Space at a jittered rhythm (so it doesn't lock-step
 * with any specific spawnInterval). Expects to still be alive after 6s.
 * Path B: stay metronome-level — codegen has to make configs "playable by
 * a non-reactive player". If even a metronome can't survive, the config
 * is too punishing.
 */
test('runner-robot: survives 6s with periodic jumps', async ({ page }) => {
  const genre = await bootGame(page);
  test.skip(genre !== 'runner', `genre=${genre}, robot test skipped`);

  const start = Date.now();
  while (Date.now() - start < 6_000) {
    await page.keyboard.press('Space');
    // jitter 550..950ms so we don't accidentally sync with spawn intervals
    const wait = 550 + Math.floor(Math.random() * 400);
    await page.waitForTimeout(wait);
  }
  const state = await page.evaluate(() => {
    const g: any = (window as any).__GAME__;
    return { gameOver: !!g?.isGameOver, score: g?.score ?? 0, hp: g?.hp ?? 0 };
  });
  expect(state.gameOver, `runner died with score=${state.score} hp=${state.hp}`).toBe(false);
});
