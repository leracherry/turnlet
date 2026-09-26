# Turnlet API

[← Documentation](README.md)

**Two operations. Ordered work. Room for the browser between chunks.**

## Install

```sh
npm install turnlet
```

ESM-only, with TypeScript declarations and no runtime dependencies.

Import the public functions from `turnlet` in your application. The pinned Node version in the repository is for development; it is not a browser runtime requirement.

## Choose an operation

| Function                                     | Result                      | Extra output storage     |
| -------------------------------------------- | --------------------------- | ------------------------ |
| `mapInChunks(input, callback, options?)`     | Promise of an ordered array | One output slot per item |
| `forEachInChunks(input, callback, options?)` | Promise of `void`           | No mapped output array   |

Both accept a readonly dense array and a synchronous `(item, index)` callback.

```ts
import { mapInChunks, forEachInChunks } from 'turnlet';

const doubled = await mapInChunks([2, 4], (value) => value * 2);
let total = 0;
await forEachInChunks([2, 4], (value) => {
  total += value;
});
```

## Options

| Option     | Default | Contract                                       |
| ---------- | ------- | ---------------------------------------------- |
| `budgetMs` | `5`     | Finite number greater than 0 and at most 50    |
| `signal`   | None    | An AbortSignal; rejection preserves its reason |

Non-empty operations yield before the first callback. Budgets are checked between callbacks, not during one. An expensive callback can exceed the budget. Empty arrays do not schedule work, but options and cancellation are still checked.

## Cancel and handle rejection

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

Aborting stops future callbacks once observed. It does not undo side effects or interrupt an executing callback. A rejected map never returns partial results.

For replaceable work, cancellation and result ownership belong together: guard the final commit with a request ID. The [record-validation recipe](../examples/record-validation/README.md) demonstrates this without demo internals.

## Errors and input ownership

- Invalid budgets reject with `RangeError`; invalid signals and sparse positions reject with `TypeError`.
- Callback exceptions, scheduler errors, and abort reasons retain their identity.
- Promise/thenable callback results reject with `TypeError`. Async callbacks are not supported—even for `forEachInChunks`.
- Do not mutate input length, positions, or relevant item contents until settlement. Readonly types do not create a snapshot.
- Previously completed side effects remain after failure.
- Concurrent operations have independent budgets, not a shared fairness policy.

The [API contract](api-contract.md) specifies validation order and all edge cases. Run `npm run test:examples` from the repository root to compile and execute counterparts of these examples.

## When another approach is better

| Situation                  | Start with                                                   |
| -------------------------- | ------------------------------------------------------------ |
| Small, cheap collection    | A plain loop or Array.map: yielding adds overhead            |
| Unnecessary repeated work  | A better algorithm, caching, fewer items, or debouncing      |
| Heavy individual items     | A worker or smaller units of work                            |
| Existing custom scheduling | Native scheduling primitives rather than another abstraction |

Turnlet stays on the main thread. [Web Workers](https://html.spec.whatwg.org/multipage/workers.html) offer a separate execution context, with messaging and data-transfer costs. The [Prioritized Task Scheduling proposal](https://github.com/WICG/scheduling-apis) exposes lower-level scheduling controls; [scheduler-polyfill](https://github.com/GoogleChromeLabs/scheduler-polyfill) provides broader scheduling primitives with documented differences from native behavior. None is a drop-in guarantee of improved INP.
