# Turnlet

> **Small turns. Responsive interfaces.**

Turnlet processes arrays in cooperative chunks so the browser can handle other work between them. It provides ordered mapping and iteration with time budgets and `AbortSignal` cancellation.

> [!NOTE]
> Turnlet is implemented and tested but is not published yet.

## API

```ts
import { forEachInChunks, mapInChunks } from 'turnlet';

const labels = await mapInChunks(products, (product) => product.name, {
  budgetMs: 5,
});

await forEachInChunks(
  products,
  (product) => searchResults.consider(scoreProduct(product)),
  { budgetMs: 5 },
);
```

## Cancellation

```ts
const controller = new AbortController();

const operation = mapInChunks(records, validateRecord, {
  signal: controller.signal,
});

controller.abort();
await operation; // rejects with signal.reason
```

## Options

| Option     | Default | Description                                                  |
| ---------- | ------: | ------------------------------------------------------------ |
| `budgetMs` |     `5` | Approximate callback time per chunk. Valid range: `(0, 50]`. |
| `signal`   |       — | Cancels pending and future work.                             |

Callbacks must be synchronous. A running callback cannot be interrupted, and one expensive item can exceed the complete chunk budget.

See the [repository README](https://github.com/leracherry/turnlet#readme) and [API contract](https://github.com/leracherry/turnlet/blob/main/docs/api-contract.md) for full behavior and limitations.
