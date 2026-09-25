import { expect, test } from '@playwright/test';
test('assets, search, reset, settings and home preserve the hosting path', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto('./?size=small');
  await page.getByLabel('Find something good').fill('lamp');
  await expect(page.locator('#completion-value')).toHaveAttribute(
    'data-state',
    'measured',
  );
  await expect(page.locator('.card').first()).toContainText('Lamp');
  const image = page.locator('.product-illustration').first();
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page).toHaveURL(/\/turnlet\/\?mode=turnlet&size=small&seed=42$/);
  await page.getByLabel('Search mode').selectOption('blocking');
  await page.getByRole('button', { name: 'Apply and restart' }).click();
  await expect(page).toHaveURL(/\/turnlet\/\?mode=blocking/);
  await page.getByRole('link', { name: 'turnlet / playground' }).click();
  await expect(page).toHaveURL(/\/turnlet\/$/);
  expect(failures).toEqual([]);
});
