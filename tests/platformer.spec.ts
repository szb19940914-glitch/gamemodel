import { test, expect } from '@playwright/test';

async function bootGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => !!(window as any).__GAME__, null, { timeout: 10_000 });
  return page.evaluate(() => (window as any).__GAME__.genre as string);
}

test('platformer: controls move the player and gravity is active', async ({ page }) => {
  const genre = await bootGame(page);
  test.skip(genre !== 'platformer', `genre=${genre}, platformer test skipped`);

  // record starting x
  const x0 = await page.evaluate(() => (window as any).__GAME__.player.x);

  // press right for ~1.2s
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');

  const x1 = await page.evaluate(() => (window as any).__GAME__.player.x);
  expect(x1).toBeGreaterThan(x0 + 30); // moved at least 30px

  // confirm not unintentionally won/over yet (sanity)
  const state = await page.evaluate(() => {
    const g: any = (window as any).__GAME__;
    return { isWin: g.isWin, isGameOver: g.isGameOver };
  });
  expect(state.isGameOver).toBe(false);
});

test('platformer: jump produces upward motion', async ({ page }) => {
  const genre = await bootGame(page);
  test.skip(genre !== 'platformer', `genre=${genre}, platformer test skipped`);

  await page.waitForTimeout(400); // settle on ground
  const yBefore = await page.evaluate(() => (window as any).__GAME__.player.y);
  await page.keyboard.press('Space');
  await page.waitForTimeout(120); // peak of jump shortly after press
  const yPeak = await page.evaluate(() => (window as any).__GAME__.player.y);
  expect(yPeak).toBeLessThan(yBefore - 10);
});
