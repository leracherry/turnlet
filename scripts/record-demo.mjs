import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: 'docs/media', size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
const video = page.video();
try {
  await page.goto(
    (process.env.DEMO_URL || 'http://127.0.0.1:4176') +
      '/?size=large&mode=blocking',
  );
  await page.locator('#query').waitFor({ state: 'visible' });
  await page.waitForTimeout(1500);
  await page.locator('#query').scrollIntoViewIfNeeded();
  await page.locator('#query').pressSequentially('ceramix', { delay: 120 });
  await page.waitForTimeout(1800);
  await page.locator('#metrics').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  await page.getByLabel('Search mode').selectOption('turnlet');
  await page.getByRole('button', { name: 'Apply and restart' }).click();
  await page.locator('#query').pressSequentially('ceramix', { delay: 120 });
  await page.waitForTimeout(1800);
  await page.locator('#metrics').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  await page.locator('#query').fill('zzzzzzzz');
  await page.locator('#empty').waitFor({ state: 'visible' });
  await page.locator('#empty').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.locator('#query').fill('');
  await page.locator('.integration').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
} finally {
  await context.close();
  await video.saveAs('docs/media/walkthrough.webm');
  await video.delete();
  await browser.close();
}
