import { chromium, expect } from '@playwright/test';

// Capture the production demo as rendered, without replacing its live metrics.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  for (const mode of ['blocking', 'turnlet']) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1140 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(
      `${process.env.DEMO_URL || 'http://127.0.0.1:4176'}/?mode=${mode}&size=large&seed=42`,
    );
    const query = page.locator('#query');
    await expect(query).toBeEnabled();
    await query.pressSequentially('ceramix', { delay: 120 });
    await expect(page.locator('#completion-value')).toHaveAttribute(
      'data-state',
      'measured',
    );
    await expect(page.locator('#results')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(page.locator('#results > li')).toHaveCount(50);
    // Allow Event Timing reporting to settle; these are illustrations, not trials.
    await page.waitForTimeout(1000);
    await page.locator('.workspace').evaluate((element) => {
      globalThis.scrollTo(
        0,
        element.getBoundingClientRect().top + globalThis.scrollY - 24,
      );
    });
    await page.screenshot({ path: `docs/media/search-${mode}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}
