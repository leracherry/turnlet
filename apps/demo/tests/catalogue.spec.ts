import { expect, test } from '@playwright/test';

test('both modes return identical ranked results', async ({ page }) => {
  const results: string[][] = [];
  for (const mode of ['blocking', 'turnlet']) {
    await page.goto('/?mode=' + mode + '&size=small&seed=42');
    await page.getByLabel('Find something good').fill('ceramix');
    await expect(page.locator('#results')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    results.push(
      await page
        .locator('.card')
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute('data-id')!),
        ),
    );
  }
  expect(results[0]!.length).toBeGreaterThan(0);
  expect(results[0]).toEqual(results[1]);
});

test('rapid input and clearing own the final results', async ({ page }) => {
  await page.goto('/?mode=turnlet&size=large');
  const input = page.getByLabel('Find something good');
  await input.fill('ceramix');
  await input.fill('forest');
  await input.fill('lamp');
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.card').first()).toContainText('Lamp');
  await input.fill('ceramix');
  await input.fill('');
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.card')).toHaveCount(50);
  await expect(page.locator('.card').first()).toHaveAttribute('data-id', '0');
  await expect(input).toBeFocused();
});

test('apply restarts the document and validates URL settings', async ({
  page,
}) => {
  await page.goto('/?mode=invalid&size=999999&seed=-1');
  await expect(page.getByLabel('Search mode')).toHaveValue('turnlet');
  await expect(page.getByLabel('Workload')).toHaveValue('medium');
  await expect(page.getByLabel('Catalogue seed')).toHaveValue('42');
  await page.evaluate(() => {
    document.documentElement.dataset.session = 'old';
  });
  await page.getByLabel('Search mode').selectOption('blocking');
  await page.getByLabel('Workload').selectOption('small');
  await page.getByLabel('Catalogue seed').fill('7');
  await page.getByRole('button', { name: 'Apply and restart' }).click();
  await expect(page).toHaveURL(/mode=blocking&size=small&seed=7/);
  expect(
    await page.evaluate(() => document.documentElement.dataset.session),
  ).toBeUndefined();
  await expect(page.getByRole('status')).toContainText('500 matches');
});

test('keyboard search, empty state, clearing and focus', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Find something good');
  await expect(page.locator('.card')).toHaveCount(50);
  await input.focus();
  await page.keyboard.type('lamp');
  await expect(page.getByRole('status')).toContainText('matches');
  await expect(page.locator('.card').first()).toContainText('Lamp');
  await expect(input).toBeFocused();
  await input.fill('zzzzzzzzzzzz');
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(
    page.getByText('No matches. Try a shorter or different search.'),
  ).toBeVisible();
  await input.fill('');
  await expect(page.locator('.card')).toHaveCount(50);
  await expect(input).toBeFocused();
});
test('mobile layout stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(50);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
