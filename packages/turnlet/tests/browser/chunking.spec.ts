import { expect, test, type Page } from '@playwright/test';

import { type BrowserHarness } from './harness.js';

async function openHarness(page: Page): Promise<void> {
  await page.goto('/packages/turnlet/tests/browser/');
  await page.waitForFunction(() => 'turnletHarness' in window);
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test('an unrelated task runs before a large operation completes', async ({
  page,
}) => {
  const events = await page.evaluate(() =>
    (
      window as Window & { turnletHarness: BrowserHarness }
    ).turnletHarness.unrelatedTask(),
  );

  expect(events).toContain('unrelated-task');
  expect(events.indexOf('unrelated-task')).toBeLessThan(
    events.indexOf('complete'),
  );
  expect(events.at(-1)).toBe('complete');
});

test('cancellation stops future callbacks and preserves its reason', async ({
  page,
}) => {
  const result = await page.evaluate(() =>
    window.turnletHarness.cancellation(),
  );

  expect(result).toEqual({ reasonPreserved: true, visited: [0, 1, 2] });
});

test('mapping results stay ordered', async ({ page }) => {
  const result = await page.evaluate(() =>
    window.turnletHarness.orderedMapping(),
  );

  expect(result).toEqual(['0:6', '1:2', '2:4']);
});

test('the timer fallback can be forced independently of browser support', async ({
  page,
}) => {
  const result = await page.evaluate(() =>
    window.turnletHarness.forcedFallback(),
  );

  expect(result.fallbackCalls).toBeGreaterThan(0);
  expect(result.visited).toEqual([0, 1, 2]);
});

test('simultaneous operations keep independent state', async ({ page }) => {
  const result = await page.evaluate(() =>
    window.turnletHarness.concurrentOperations(),
  );

  expect(result).toEqual({ first: [1, 2, 3], second: [4, 5, 6] });
});
