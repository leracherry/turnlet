import { expect, test } from '@playwright/test';

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
