import { expect, test } from '@playwright/test';

test('real keyboard interaction reports session INP and matching breakdown', async ({
  page,
}) => {
  await page.goto('/?mode=blocking&size=large');
  await expect(page.locator('#inp-value')).toHaveAttribute(
    'data-state',
    'waiting',
  );
  await expect(page.locator('#completion-value')).toHaveText('Waiting');
  const input = page.getByLabel('Find something good');
  await expect(input).toBeEnabled();
  await input.click();
  await input.pressSequentially('ceramix', { delay: 80 });
  await expect(page.locator('#completion-value')).toHaveAttribute(
    'data-state',
    'measured',
  );
  await expect(page.locator('#inp-value')).toHaveAttribute(
    'data-state',
    'measured',
    { timeout: 15000 },
  );
  await expect(page.locator('#inp-target')).toContainText('#query');
  const values = await page
    .locator(
      '#inp-value, #input-delay, #processing-duration, #presentation-delay',
    )
    .allTextContents();
  const [inp, delay, processing, presentation] = values.map(parseFloat);
  expect(inp).toBeGreaterThan(0);
  // Display rounding and browser duration quantization allow a small discrepancy.
  expect(Math.abs(inp! - delay! - processing! - presentation!)).toBeLessThan(9);
});

test('reset starts a fresh measurement session with the applied configuration', async ({
  page,
}) => {
  await page.goto('/?mode=turnlet&size=small&seed=7');
  await page.getByLabel('Find something good').fill('lamp');
  await expect(page.locator('#completion-value')).toHaveAttribute(
    'data-state',
    'measured',
  );
  await page.getByLabel('Catalogue seed').fill('99');
  const oldOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.getByLabel('Catalogue seed')).toHaveValue('7');
  await expect(page.locator('#completion-value')).toHaveText('Waiting');
  await expect(page.locator('#inp-value')).toHaveText('Waiting');
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(oldOrigin);
});

test('unsupported INP does not hide available search completion timing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'PerformanceEventTiming', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/?size=small');
  await expect(page.locator('#inp-value')).toHaveText('Unavailable');
  await page.getByLabel('Find something good').fill('lamp');
  await expect(page.locator('#completion-value')).toHaveAttribute(
    'data-state',
    'measured',
  );
  await expect(page.locator('#inp-value')).toHaveText('Unavailable');
  await page.getByLabel('Find something good').fill('');
  await expect(page.locator('#completion-value')).toHaveText('Waiting');
});
