# Turnlet

**Small turns. Responsive interfaces.**

A tiny TypeScript library for chunking array work to improve **Interaction to Next Paint (INP)**.

Turnlet yields between small chunks so the browser can handle input and paint. Two functions, stable ordering, cancellation, and no runtime dependencies.

## Inside a browser turn

Chrome DevTools recording of a real search across **50,000 products**, using `forEachInChunks` with a 5 ms budget:

![Chrome DevTools Performance panel showing Turnlet’s short input handler, separate search tasks, and INP breakdown](https://raw.githubusercontent.com/leracherry/turnlet/main/docs/media/performance-turnlet.png)

A local recording at 4× CPU slowdown, zoomed to the interaction; individual timings vary. [Blocking comparison and downloadable traces](https://github.com/leracherry/turnlet/blob/main/docs/media/README.md#chrome-performance-recordings) · [Controlled case study](https://github.com/leracherry/turnlet/blob/main/docs/case-study.md)

## Install

```sh
npm install turnlet
```

ESM-only, with TypeScript declarations and no runtime dependencies.

## Usage

```ts
import { mapInChunks, forEachInChunks } from 'turnlet';

const doubled = await mapInChunks([2, 4], (value) => value * 2);
// [4, 8]

let total = 0;
await forEachInChunks([2, 4], (value) => {
  total += value;
});
// total === 6
```

`mapInChunks` returns a complete, ordered array. `forEachInChunks` resolves with `void`, without allocating a mapped output array. Callbacks receive `(item, index)` and must be synchronous.

## Options

| Option     | Default | Meaning                                                          |
| ---------- | ------- | ---------------------------------------------------------------- |
| `budgetMs` | `5`     | Approximate chunk budget; finite, greater than 0, and at most 50 |
| `signal`   | None    | AbortSignal for cooperative cancellation                         |

Non-empty operations yield before the first callback. The scheduler uses native `scheduler.yield()` when available and a timer fallback otherwise.

## Cancellation

```ts
import { mapInChunks } from 'turnlet';

const controller = new AbortController();
const reason = new Error('Superseded');
const operation = mapInChunks([1], (value) => value, {
  signal: controller.signal,
});
controller.abort(reason);

try {
  await operation;
} catch (error) {
  if (error !== reason) throw error;
}
```

Rejection preserves the original abort reason or callback error. A rejected map does not expose a partial result. For replaceable work, also guard the final render against stale requests; see the [validation recipe](https://github.com/leracherry/turnlet/tree/main/examples/record-validation).

## Limits

- Work stays on the main thread. A running callback cannot be interrupted.
- One expensive callback can exceed the budget; completed side effects are not rolled back.
- Input must be a dense array. Do not mutate it or relevant item contents until settlement.
- Async callbacks and thenable results are unsupported.
- Small workloads may favor a plain loop. There is no guaranteed INP score or shared budget across operations.

ESM-only, with TypeScript declarations and no runtime dependencies. Browser behavior is tested in Chromium, Firefox, and WebKit; minimum browser versions are not specified.

[API guide](https://github.com/leracherry/turnlet/blob/main/docs/api.md) · [Exact contract](https://github.com/leracherry/turnlet/blob/main/docs/api-contract.md) · [Case study](https://github.com/leracherry/turnlet/blob/main/docs/case-study.md) · [Release checklist](https://github.com/leracherry/turnlet/blob/main/docs/release.md)

MIT © Valeriia Radchenko
