import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  for (const mode of process.env.RENDER_ONLY ? [] : ['blocking', 'turnlet']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(
      `${process.env.DEMO_URL || 'http://127.0.0.1:4176'}/?mode=${mode}&size=large&seed=42`,
    );
    const query = page.locator('#query');
    await expect(query).toBeEnabled();
    await query.focus();
    await page.waitForTimeout(1000);
    await query.evaluate((el) => {
      el.value = 'cerami';
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Tracing.start', {
      categories:
        '-*,devtools.timeline,v8.execute,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.stack,disabled-by-default-v8.cpu_profiler,toplevel',
      transferMode: 'ReturnAsStream',
    });
    await page.waitForTimeout(100);
    await query.press('x');
    await expect(page.locator('#completion-value')).toHaveAttribute(
      'data-state',
      'measured',
    );
    await expect(page.locator('#results > li')).toHaveCount(50);
    await page.waitForTimeout(150);
    const done = new Promise((resolve) =>
      cdp.once('Tracing.tracingComplete', resolve),
    );
    await cdp.send('Tracing.end');
    const { stream } = await done;
    let trace = '';
    for (;;) {
      const chunk = await cdp.send('IO.read', { handle: stream });
      trace += chunk.data;
      if (chunk.eof) break;
    }
    await cdp.send('IO.close', { handle: stream });
    const recording = JSON.parse(trace);
    // Omit launch arguments containing machine-local paths; keep events intact.
    delete recording.metadata.command_line;
    await writeFile(
      `docs/media/performance-${mode}.json`,
      JSON.stringify(recording),
    );
    await context.close();
  }
  const panel = await browser.newPage({
    viewport: { width: 1440, height: 800 },
    colorScheme: 'dark',
  });
  await panel.goto('devtools://devtools/bundled/devtools_app.html');
  await panel.getByRole('tab', { name: 'Performance', exact: true }).click();
  await panel.waitForTimeout(2000);
  for (const mode of ['blocking', 'turnlet']) {
    await panel
      .locator('input[type=file]')
      .setInputFiles(`docs/media/performance-${mode}.json`);
    await panel.waitForTimeout(3000);
    if (
      await panel
        .getByRole('button', { name: 'Close', exact: true })
        .isVisible()
    ) {
      await panel.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await panel
      .getByRole('button', { name: 'View details for INP breakdown insight.' })
      .click();
    await panel.waitForTimeout(500);
    await panel.screenshot({ path: `docs/media/performance-${mode}.png` });
  }
} finally {
  await browser.close();
}
