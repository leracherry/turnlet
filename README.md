# Turnlet

**Small turns. Responsive interfaces.**

A small TypeScript library for chunking array work to improve Interaction to Next Paint (INP).

> **Status:** The core API is implemented and tested. Turnlet is not published yet, and the demo is still in development.

## Why Turnlet?

Large loops can keep the browser's main thread busy and make an interface feel unresponsive. Turnlet divides that work into small, ordered chunks and yields between them so the browser can handle other tasks.

## API

```ts
import { mapInChunks } from 'turnlet';

const controller = new AbortController();

const results = await mapInChunks(
  records,
  (record, index) => validateRecord(record, index),
  { budgetMs: 5, signal: controller.signal },
);
```

Turnlet is designed around two functions:

- `mapInChunks` transforms an array and preserves result order.
- `forEachInChunks` processes an array without allocating a result array.

Both use synchronous callbacks, support cancellation with `AbortSignal`, and yield before work begins and whenever the time budget is exhausted.

Turnlet cannot interrupt a callback while it is running. If one item takes a long time to process, that callback can still block the main thread. See the [full API contract](docs/api-contract.md) for precise behavior and limitations.

## Repository

- `packages/turnlet` — the side-effect-free ESM library
- `apps/demo` — a vanilla TypeScript demo

## Development

Use Node.js 22.23.2 and run commands from the repository root:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```
