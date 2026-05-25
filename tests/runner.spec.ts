import { test, expect } from '@playwright/test';

async function bootGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => !!(window as any).__GAME__, null, { timeout: 10_000 });
  return page.evaluate(() => (window as any).__GAME__.genre as string);
}

test('runner: boots and accumulates score', async ({ page }) => {
  const genre = await bootGame(page);
  test.skip(genre !== 'runner', `genre=${genre}, runner test skipped`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  await page.keyboard.press('Space');
  await page.waitForTimeout(2000);
  const score = await page.evaluate(() => (window as any).__GAME__.score);
  expect(score).toBeGreaterThan(0);
});

test('runner: player can take a hit and game over fires', async ({ page }) => {
  const genre = await bootGame(page);
  test.skip(genre !== 'runner', `genre=${genre}, runner test skipped`);
  await page.waitForTimeout(8_000);
  const isOver = await page.evaluate(() => (window as any).__GAME__.isGameOver);
  expect(isOver).toBe(true);
});
