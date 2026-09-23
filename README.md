# Turnlet

> **Small turns. Responsive interfaces.**

[![CI](https://github.com/leracherry/turnlet/actions/workflows/ci.yml/badge.svg)](https://github.com/leracherry/turnlet/actions/workflows/ci.yml)

Turnlet is a small TypeScript library for processing arrays in cooperative chunks. It gives the browser opportunities to handle input and rendering between chunks, helping you build toward a better [Interaction to Next Paint (INP)](https://web.dev/articles/inp).

> [!NOTE]
> The library and interactive catalogue demo are implemented and tested. The package is not published yet. Performance measurements are still planned.

## Try the demo

Use the Node.js version in `.nvmrc`, then run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Search for **lamp**, **forest mug**, or **ceramix** to try typo matching.

Choose **Blocking** or **Turnlet**, select a workload, and click **Apply and restart**. Both modes search the same seeded catalogue; Turnlet yields in 5 ms chunks and cancels superseded searches. Up to 50 results stay visible while the next query runs.

Read the [demo guide](docs/demo.md) for configuration, comparison limits, and testing.

## The idea

A large synchronous loop occupies the main thread until every item is finished. Turnlet performs the same ordered work in smaller turns:

```text
regular loop   work ─────────────────────────────── done

Turnlet        work ─ yield ─ work ─ yield ─ work ─ done
```

The result is still predictable. Callbacks run one at a time, in array order, without moving work to a worker.

## API

Turnlet intentionally provides two operations:

| Function          | Use it when                            | Resolves with           |
| ----------------- | -------------------------------------- | ----------------------- |
| `mapInChunks`     | Each item produces a value             | An ordered result array |
| `forEachInChunks` | Work is performed through side effects | `void`                  |

### Map values

```ts
import { mapInChunks } from 'turnlet';

const labels = await mapInChunks(
  products,
  (product, index) => `${index + 1}. ${product.name}`,
  { budgetMs: 5 },
);
```

### Process without allocating results

```ts
import { forEachInChunks } from 'turnlet';

await forEachInChunks(
  products,
  (product) => searchResults.consider(scoreProduct(product, query)),
  { budgetMs: 5 },
);
```

### Cancel stale work

```ts
const controller = new AbortController();

const operation = mapInChunks(records, validateRecord, {
  signal: controller.signal,
});

controller.abort();
await operation; // rejects with signal.reason
```

This is useful for search and filtering interfaces where a newer request makes the previous one irrelevant.

## Options

```ts
interface ChunkOptions {
  budgetMs?: number;
  signal?: AbortSignal;
}
```

| Option     | Default | Description                                                                                     |
| ---------- | ------: | ----------------------------------------------------------------------------------------------- |
| `budgetMs` |     `5` | Approximate callback time allowed per chunk. Must be greater than `0` and no greater than `50`. |
| `signal`   |       — | Cancels pending and future work using the signal's original reason.                             |

## What Turnlet guarantees

- **Stable order** — callbacks and mapped results follow the input order.
- **An initial yield** — non-empty operations yield before the first callback.
- **Cooperative cancellation** — no new callback starts after cancellation is observed.
- **Original errors** — callback errors and abort reasons are preserved.
- **No partial maps** — `mapInChunks` resolves only with a complete result.
- **No runtime dependencies** — scheduling uses browser APIs directly.

## Know the limits

Turnlet creates scheduling opportunities; it does not guarantee a particular INP score.

- Callbacks must be synchronous.
- A running callback cannot be interrupted.
- One expensive item can exceed the entire chunk budget.
- Work remains on the main thread; CPU-heavy algorithms may still belong in a worker.
- Each operation has its own budget. Concurrent calls do not share a global CPU limit.

For exact edge-case behavior, see the [API contract](docs/api-contract.md).

## Repository

| Path               | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `packages/turnlet` | Side-effect-free ESM library and contract tests |
| `apps/demo`        | Vanilla TypeScript comparison demo              |
| `docs`             | API behavior and project documentation          |

## Development

Use Node.js `22.23.2` and run commands from the repository root:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

The full gate validates types, formatting, unit tests, the ESM library build, and the production demo build.

Browser and package release gates are available separately:

```sh
npx playwright install chromium firefox webkit
npm run test:browser
npm run test:demo
npm run test:package
```

`test:package` installs the real tarball in a clean consumer, checks its declarations and ESM exports, builds a browser consumer, and runs it in Chromium. The current artifact is **6.13 KiB packed** and **19.85 KiB unpacked**.
