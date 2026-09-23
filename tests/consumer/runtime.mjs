import assert from 'node:assert/strict';

import { forEachInChunks, mapInChunks } from 'turnlet';
import * as turnlet from 'turnlet';

assert.deepEqual(Object.keys(turnlet), ['forEachInChunks', 'mapInChunks']);

const mapped = await mapInChunks(
  [3, 1, 2],
  (value, index) => `${index}:${value}`,
);
assert.deepEqual(mapped, ['0:3', '1:1', '2:2']);

const visited = [];
await forEachInChunks([1, 2, 3], (value) => visited.push(value));
assert.deepEqual(visited, [1, 2, 3]);
