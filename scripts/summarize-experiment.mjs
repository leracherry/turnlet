import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const run = JSON.parse(await readFile(process.argv[2], 'utf8'));
assert.equal(run.dryRun, false, 'Dry runs are not published evidence');
assert.equal(
  run.dirty,
  false,
  'Measurements must identify a clean source revision',
);
assert.equal(run.trials.length, 30);
const summary = (values) => {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  assert(sorted.every(Number.isFinite));
  if (!sorted.length) return { n: 0, median: null, min: null, max: null };
  const middle = Math.floor(sorted.length / 2);
  return {
    n: sorted.length,
    median:
      sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0],
    max: sorted.at(-1),
  };
};
const rows = [];
let reference;
for (const scenario of run.scenarios) {
  for (const mode of ['blocking', 'turnlet']) {
    const trials = run.trials.filter(
      (t) => t.scenario === scenario.id && t.mode === mode,
    );
    assert.equal(trials.length, 5);
    assert.deepEqual(
      trials.map((t) => t.round),
      [1, 2, 3, 4, 5],
    );
    const accepted = trials.filter((t) => t.status === 'ok');
    for (const trial of accepted) {
      const sample = trial.sample;
      assert.equal(sample.visibility, 'visible');
      assert.equal(sample.inputs.length, scenario.keys.length);
      assert(sample.inputs.every((input) => input.trusted));
      assert.equal(sample.inputs.at(-1).query, 'ceramix');
      const key = scenario.size;
      reference ??= {};
      reference[key] ??= sample.resultIds;
      assert.deepEqual(
        sample.resultIds,
        reference[key],
        'Final ranked results differ',
      );
      assert.equal(sample.inpMs === null, sample.inpState !== 'measured');
      if (sample.inpMs !== null) {
        const a = sample.attribution;
        assert(
          Math.abs(
            a.inputDelayMs + a.processingMs + a.presentationMs - sample.inpMs,
          ) < 9,
        );
      }
    }
    rows.push({
      scenario: scenario.id,
      mode,
      failed: 5 - accepted.length,
      inp: summary(accepted.map((t) => t.sample.inpMs)),
      completion: summary(accepted.map((t) => t.sample.completionMs)),
      inputSpan: summary(
        accepted.map((t) => t.sample.inputs.at(-1).at - t.sample.inputs[0].at),
      ),
    });
  }
}
console.log(
  process.argv.includes('--check')
    ? 'Experiment records, result equality, and metric summaries validated.'
    : JSON.stringify({ testedCommit: run.testedCommit, rows }, null, 2),
);
