# Turnlet API contract

[← Documentation](README.md)

> [!IMPORTANT]
> This contract is implemented and tested for [Turnlet 0.1.0](https://www.npmjs.com/package/turnlet), available on npm.

Turnlet processes a finite array in cooperative chunks while preserving ordinary sequential callback behavior. This document defines the exact guarantees and limits of the public API.

## At a glance

| Behavior        | Contract                                       |
| --------------- | ---------------------------------------------- |
| Order           | Ascending index order, one callback at a time  |
| Default budget  | `5 ms` per chunk                               |
| Valid budget    | Finite number in `(0, 50]`                     |
| First callback  | Runs after an initial yield                    |
| Cancellation    | Rejects with the original `signal.reason`      |
| Mapping         | Resolves with a complete, ordered result array |
| Async callbacks | Unsupported and rejected at runtime            |
| Input           | Readonly, dense arrays                         |

## Public API

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

The public surface contains only these two functions and the `ChunkOptions` type.

## Inputs and options

### Arrays

Inputs must be dense arrays. Turnlet captures the array length once, then visits each position in ascending order. If a missing position is encountered, the operation rejects with a `TypeError`.

`readonly` is a TypeScript contract, not a snapshot. Turnlet does not mutate the input. The caller must not change its length, positions, or relevant item contents until the operation settles.

### `budgetMs`

The default budget is `5`. A custom value must be finite, greater than `0`, and no greater than `50`. Invalid values reject with a `RangeError` before cancellation, input, callbacks, or scheduling are inspected.

The budget is checked **between** callbacks. JavaScript cannot interrupt a callback halfway through, so one callback can run longer than the complete budget.

### `signal`

`signal` must be an `AbortSignal`. An invalid value rejects with a `TypeError`.

Cancellation rejects with `signal.reason` by identity. Calling `abort()` without a custom reason normally produces the platform's `AbortError` DOMException.

## Execution model

For a valid, non-empty input, Turnlet:

1. validates the options;
2. checks for cancellation;
3. captures the input length;
4. yields before the first callback;
5. starts the chunk clock after the yield completes;
6. invokes callbacks sequentially in ascending index order;
7. yields again when the budget is exhausted and items remain; and
8. checks cancellation before resolving.

No final scheduling call is made after the result is ready.

### Empty arrays

Valid empty operations do not schedule work:

```ts
await mapInChunks([], (value) => value); // []
await forEachInChunks([], () => {}); // undefined
```

Options are still validated first. An already-aborted signal still rejects before the empty result resolves.

### Mapping

`mapInChunks` stores every callback result at its matching input index. Falsy values and `undefined` are valid results. The function resolves only after the complete ordered result is ready.

If processing rejects, the partially constructed array is discarded and never exposed as a successful result.

## Cancellation

Turnlet observes cancellation:

1. before scheduling or invoking callbacks;
2. while waiting for the initial yield;
3. while waiting between chunks;
4. after a scheduled continuation arrives;
5. before and after each callback; and
6. before final resolution.

After cancellation is observed, no new callback starts. A callback that is already running cannot be interrupted, and its side effects are not rolled back.

Temporary abort listeners are removed on every settlement path. A pending fallback timer is cleared on abort. A native scheduler continuation that arrives or rejects after cancellation is safely observed and cannot resume work.

## Errors

| Cause                       | Result                                                   |
| --------------------------- | -------------------------------------------------------- |
| Invalid `budgetMs`          | Rejects with `RangeError` before work begins             |
| Invalid `signal`            | Rejects with `TypeError` before work begins              |
| Sparse input position       | Rejects with `TypeError` when reached                    |
| Callback throws             | Rejects with the exact thrown value                      |
| Callback returns a thenable | Observes it, then rejects with a descriptive `TypeError` |
| Scheduler rejects           | Rejects with the scheduler's original error              |
| Signal aborts               | Rejects with the exact `signal.reason`                   |

Previously completed callback side effects are never rolled back. Later callbacks do not run after an error is observed.

### Synchronous callbacks only

Promises and thenables are unsupported callback results. Turnlet observes a returned promise's rejection to prevent an unhandled rejection, then rejects the operation with a `TypeError`.

```ts
// Unsupported
await mapInChunks(records, async (record) => validateRemotely(record));
```

Already-started external async work cannot be undone. Use Turnlet for synchronous work and perform asynchronous orchestration outside the callback.

## Scheduling

Turnlet chooses its scheduler when each continuation is requested:

1. use `globalThis.scheduler.yield()` when available;
2. otherwise schedule a task with `setTimeout(..., 0)`.

Importing Turnlet does not access `window` or `document`, so the module remains safe to import without a DOM. Import safety does not imply official support for every non-browser runtime.

An initial yield gives the browser an opportunity to process other work. It does **not** guarantee a painted frame.

## Concurrent operations

Simultaneous calls have independent clocks, schedulers, and cancellation state. A `5 ms` budget applies to each operation—not to the application as a whole.

Turnlet does not provide global fairness, a shared CPU budget, or a frame deadline.

## Practical examples

The [API guide](api.md) contains self-contained examples of both operations and error handling.

For a complete replacement-work pattern, use the [record-validation recipe](../examples/record-validation/README.md). It combines an AbortController with request IDs: aborting limits obsolete work, while ownership checks prevent stale results or errors from reaching the view. The runner compiles and tests this integration through the public package entry.

## Not part of 0.1

- Async callbacks
- Iterables and streams
- Worker execution
- Priorities and progress callbacks
- Global scheduling fairness
- Additional collection operators
- Automatic INP optimization or guarantees
