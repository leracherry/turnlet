/* global document, window */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';

const output = process.argv[2];
if (!output)
  throw new Error(
    'Usage: node scripts/measure-demo.mjs output.json [--dry-run]',
  );
const dryRun = process.argv.includes('--dry-run');
const baseURL = process.env.DEMO_URL || 'http://127.0.0.1:4176';
const scenarios = [
  { id: 'completed-large', size: 'large', initial: 'cerami', keys: 'x' },
  { id: 'rapid-large', size: 'large', initial: '', keys: 'ceramix' },
  { id: 'completed-small', size: 'small', initial: 'cerami', keys: 'x' },
];
const hash = createHash('sha256');
for (const file of (await readdir('apps/demo/dist/assets')).sort()) {
  hash.update(file);
  hash.update(await readFile('apps/demo/dist/assets/' + file));
}
const browser = await chromium.launch({ headless: false });
const run = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  dryRun,
  testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  dirty: !!execFileSync('git', ['status', '--porcelain'], {
    encoding: 'utf8',
  }).trim(),
  assetSha256: hash.digest('hex'),
  environment: {
    os: os.type(),
    release: os.release(),
    arch: os.arch(),
    cpu: os.cpus()[0].model,
    logicalCpus: os.cpus().length,
    memoryBytes: os.totalmem(),
    node: process.version,
    browser: browser.version(),
    headed: true,
    viewport: { width: 1440, height: 1000 },
    cpuThrottle: 4,
    networkThrottle: 'none; localhost',
    seed: 42,
    input:
      'Playwright keyboard.type, delay 0; browser-dispatched trusted keyboard events',
    sampling:
      'Live DOM candidate 1000 ms after final completion; no finalization interaction',
    instrumentation:
      'Input capture listener only; no video or trace in measured trials',
  },
  scenarios,
  trials: [],
};
await writeFile(output, JSON.stringify(run, null, 2) + '\n', { flag: 'wx' });
try {
  for (const scenario of scenarios) {
    for (let round = 1; round <= (dryRun ? 1 : 5); round++) {
      const order =
        round % 2 ? ['blocking', 'turnlet'] : ['turnlet', 'blocking'];
      for (const mode of order) {
        const trial = {
          scenario: scenario.id,
          round,
          mode,
          position: order.indexOf(mode) + 1,
        };
        const context = await browser.newContext({
          viewport: run.environment.viewport,
        });
        try {
          const page = await context.newPage();
          await page.bringToFront();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await page.goto(
            baseURL + '/?mode=' + mode + '&size=' + scenario.size + '&seed=42',
          );
          await page.waitForFunction(
            () => !document.querySelector('#query').disabled,
          );
          await page.locator('#query').scrollIntoViewIfNeeded();
          await page.locator('#query').focus();
          await page.evaluate((initial) => {
            const input = document.querySelector('#query');
            // Set up a prefix without invoking a search or generating an INP interaction.
            input.value = initial;
            window.trialInputs = [];
            input.addEventListener(
              'input',
              (event) => {
                window.trialInputs.push({
                  at: performance.now(),
                  query: input.value,
                  trusted: event.isTrusted,
                });
              },
              { capture: true },
            );
          }, scenario.initial);
          await page.waitForTimeout(500);
          await page.keyboard.type(scenario.keys, { delay: 0 });
          await page.waitForFunction(
            () =>
              document.querySelector('#query').value === 'ceramix' &&
              document.querySelector('#results').getAttribute('aria-busy') ===
                'false' &&
              document.querySelector('#completion-value').dataset.state ===
                'measured',
          );
          await page.waitForTimeout(1000);
          trial.sample = await page.evaluate(() => {
            const text = (id) => document.getElementById(id).textContent;
            const state = (id) => document.getElementById(id).dataset.state;
            const number = (id) => parseFloat(text(id));
            const measured = state('inp-value') === 'measured';
            return {
              sampledAt: performance.now(),
              visibility: document.visibilityState,
              userAgent: navigator.userAgent,
              scheduler:
                typeof globalThis.scheduler?.yield === 'function'
                  ? 'scheduler.yield'
                  : 'setTimeout',
              inputs: window.trialInputs,
              inpState: state('inp-value'),
              inpMs: measured ? number('inp-value') : null,
              attribution: measured
                ? {
                    target: text('inp-target'),
                    inputDelayMs: number('input-delay'),
                    processingMs: number('processing-duration'),
                    presentationMs: number('presentation-delay'),
                  }
                : null,
              completionMs: number('completion-value'),
              status: text('status'),
              resultIds: [...document.querySelectorAll('.card')].map(
                (card) => card.dataset.id,
              ),
            };
          });
          if (trial.sample.visibility !== 'visible')
            throw new Error('Document was not visible at sampling');
          if (
            trial.sample.inputs.length !== scenario.keys.length ||
            trial.sample.inputs.some((input) => !input.trusted)
          )
            throw new Error('Input sequence was incomplete or untrusted');
          trial.status = 'ok';
        } catch (error) {
          trial.status = 'failed';
          trial.error = String(error);
        } finally {
          await context.close();
        }
        run.trials.push(trial);
        await writeFile(output, JSON.stringify(run, null, 2) + '\n');
        console.log(
          scenario.id,
          round,
          mode,
          trial.status,
          'INP',
          trial.sample?.inpMs,
          'completion',
          trial.sample?.completionMs,
        );
      }
    }
  }
} finally {
  run.finishedAt = new Date().toISOString();
  await writeFile(output, JSON.stringify(run, null, 2) + '\n');
  await browser.close();
}
if (run.trials.some((trial) => trial.status !== 'ok')) process.exitCode = 1;
