# Turnlet API contract

Status: implementation in progress for Turnlet 0.1. `forEachInChunks` implements this contract; `mapInChunks` remains proposed. The package is not published yet.

Turnlet processes a finite array in cooperative chunks. It gives the host an opportunity to run other tasks between chunks while preserving ordinary, sequential callback semantics inside each chunk. It does not move work off the main thread or make an individual callback interruptible.

## Public surface

```ts
export interface ChunkOptions {
  budgetMs?: number;
  signal?: AbortSignal;
}

export declare function forEachInChunks<T>(
  input: readonly T[],
  callback: (item: T, index: number) => void,
  options?: ChunkOptions,
): Promise<void>;

export declare function mapInChunks<T, U>(
  input: readonly T[],
  callback: (item: T, index: number) => U,
  options?: ChunkOptions,
): Promise<U[]>;
```

Only these two functions and `ChunkOptions` form the planned 0.1 public API. Callbacks are synchronous. Iterables, streams, async callbacks, priorities, progress callbacks, worker execution, and additional collection operators are outside this contract.

## Options

`budgetMs` is the approximate amount of callback execution allowed in one chunk. It defaults to 5 milliseconds and must be a finite number in the range `(0, 50]`. Turnlet validates options before inspecting the signal or input. Invalid configuration rejects with a `RangeError` and no callback or scheduling activity occurs.

The budget is checked between callbacks. A single callback can run longer than the entire budget because JavaScript cannot be preempted partway through a synchronous function. The budget is per operation; simultaneous Turnlet calls do not share a global budget and do not establish global fairness.

`signal` cancels pending and future work. Cancellation rejects with `signal.reason` by identity. Calling `abort()` without a custom reason normally supplies a platform `AbortError` DOMException.

## Input requirements

The input must be a dense, readonly array. Its length is captured once when the operation starts. A missing position encountered during iteration rejects the operation; sparse arrays are unsupported in 0.1.

Readonly is a TypeScript contract, not a snapshot. Turnlet does not mutate the input, but callers must not change its length, positions, or relevant item contents until the returned promise settles. Behavior after caller mutation is unspecified beyond Turnlet's normal error and cancellation guarantees.

## Iteration and scheduling

For valid, nonempty input, Turnlet yields once before invoking the first callback. This gives the host an opportunity to process other work; it does not guarantee that the browser paints a frame.

After each yield, the chunk budget clock starts. Callbacks run one at a time in ascending index order and exactly once for every visited position. When the budget is exhausted and unvisited positions remain, Turnlet yields before continuing. It does not perform a final scheduling call after all results are ready.

The scheduling backend is an implementation detail. Turnlet prefers `globalThis.scheduler.yield()` when available and otherwise uses a task scheduled by `setTimeout`. Importing Turnlet does not require `window` or `document`.

Each call has independent scheduler and cancellation state. Turnlet promises neither a frame deadline nor fairness between concurrent calls.

## Empty input

For valid empty input, `mapInChunks` resolves to `[]` and `forEachInChunks` resolves to `undefined` without scheduling. Options are still validated first, and an already-aborted signal still rejects before the empty result resolves.

## Mapping

`mapInChunks` stores each callback result at the matching input index and resolves only with the complete, ordered result array. Falsy values and `undefined` are valid mapped results. If processing rejects, the partially constructed output is discarded and is never exposed as a successful result.

## Errors

A synchronous callback exception rejects the operation with the exact same value and stops all later callbacks. Earlier callback side effects are not rolled back.

Returning a promise or any thenable is unsupported. Turnlet rejects with a descriptive `TypeError`, observes a returned promise's rejection so it cannot become an unhandled rejection, and stops invoking callbacks. Already-started external async work cannot be cancelled by Turnlet. Runtime thenable detection is required because TypeScript permits an async function in some void-returning callback positions.

Scheduler failures reject the operation with the scheduler's error. Cancellation listeners and fallback timers are cleaned up on success, cancellation, callback failure, and scheduling failure.

## Cancellation checkpoints

Turnlet observes cancellation:

1. after validating options and before scheduling or invoking callbacks;
2. while waiting for an initial or between-chunk continuation;
3. after a scheduled continuation arrives;
4. before and after every callback; and
5. before resolving the final result.

No new callback starts after cancellation is observed. A callback already executing cannot be interrupted halfway through. Its side effects remain, but the overall operation rejects and mapping never returns a partial result. A late native scheduler continuation is observed safely and cannot resume work after cancellation.

## Representative outcomes

### Empty data

```ts
await mapInChunks([], (value) => value); // []
await forEachInChunks([], () => {}); // undefined
```

Neither call schedules a continuation.

### Cancellation before start

```ts
const controller = new AbortController();
const reason = new Error('cancelled by caller');
controller.abort(reason);

await mapInChunks([1, 2], (value) => value * 2, {
  signal: controller.signal,
}); // rejects with the same `reason`; callback is never called
```

### Cancellation during work

When the signal aborts during a scheduling wait or between callbacks, the operation rejects with the original reason. Items completed before cancellation keep their external side effects; unvisited callbacks do not run.

### Callback failure

```ts
const failure = new Error('invalid record');

await forEachInChunks([1, 2, 3], (value) => {
  if (value === 2) throw failure;
}); // rejects with `failure`; value 3 is not visited
```

### Oversized callback

If one callback takes 20 milliseconds with `budgetMs: 5`, Turnlet cannot interrupt it. After it returns, Turnlet checks cancellation and elapsed time, then yields if work remains.

### Simultaneous operations

Two calls with `budgetMs: 5` each maintain separate clocks and cancellation state. Their combined main-thread work can exceed 5 milliseconds before the host runs unrelated work; no cross-operation CPU cap is implied.

## Usage proposal

```ts
import { forEachInChunks, mapInChunks } from 'turnlet';

const controller = new AbortController();

const validated = await mapInChunks(
  records,
  (record, index) => validateRecord(record, index),
  { budgetMs: 5, signal: controller.signal },
);

await forEachInChunks(
  products,
  (product) => topResults.consider(scoreProduct(product, query)),
  { budgetMs: 5, signal: controller.signal },
);
```

This illustrates the intended API only; no installable release is available yet.
