import assert from 'node:assert/strict';
import { forEachInChunks, mapInChunks } from 'turnlet';
import { createValidator, type Validation } from './validate.js';

const commits: Validation[][] = [];
const errors: unknown[] = [];
const validator = createValidator(
  (result) => commits.push(result),
  (error) => errors.push(error),
);
const records = [
  { id: 'a', email: 'a@example.com' },
  { id: '', email: 'invalid' },
];
await validator.update(records);
assert.deepEqual(commits[0], [
  { index: 0, id: 'a', errors: [] },
  { index: 1, id: '', errors: ['ID is required', 'Email format is invalid'] },
]);
commits.length = 0;
const stale = validator.update(records);
const current = validator.update([{ id: 'latest', email: 'new@example.com' }]);
await Promise.all([stale, current]);
assert.equal(commits.length, 1);
assert.equal(commits[0]![0]!.id, 'latest');
const cancelled = validator.update(records);
validator.cancel();
await cancelled;
assert.equal(commits.length, 1);
const isolated = validator.update(records);
records[0]!.id = 'edited';
await isolated;
assert.equal(commits[1]![0]!.id, 'a');
assert.deepEqual(errors, []);

// Executable counterparts of the API reference examples.
assert.deepEqual(await mapInChunks([2, 4], (value) => value * 2), [4, 8]);
let total = 0;
await forEachInChunks([2, 4], (value) => {
  total += value;
});
assert.equal(total, 6);
const controller = new AbortController();
const reason = new Error('Superseded');
const operation = mapInChunks([1], (value) => value, {
  signal: controller.signal,
});
controller.abort(reason);
await assert.rejects(operation, (error) => error === reason);
console.log('Record validation and API examples passed.');
