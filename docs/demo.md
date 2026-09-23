# Catalogue playground

**One workload. Two ways to schedule it.**

The demo searches synthetic products using either a synchronous loop or Turnlet's public `forEachInChunks` export. The catalogue, scorer, iteration order, and top-50 accumulator are identical in both modes.

## Run locally

```sh
npm ci
npm run dev
```

The root command builds the library before starting Vite. The demo imports `turnlet` through its package exports, so changes to library source require another library build. Demo source changes update through Vite.

For a production preview:

```sh
npm run build
npm run preview --workspace @turnlet/demo
```

## Controls

| Control        | Choices                                     | Default |
| -------------- | ------------------------------------------- | ------- |
| Search mode    | Blocking / Turnlet                          | Turnlet |
| Workload       | Small: 500 / Medium: 10,000 / Large: 50,000 | Medium  |
| Catalogue seed | Integer from 0 to 4,294,967,295             | 42      |

**Apply and restart** navigates to a fresh document, clears the query, and prepares the chosen catalogue. Editing a control alone does not change an active search.

Configuration is stored in the URL:

```text
?mode=turnlet&size=large&seed=42
```

Invalid URL values fall back to defaults. The seed controls product names, categories, and prices; IDs and ordering remain deterministic.

## Search behavior

- Exact words rank above prefixes, substrings, and one-character typo matches.
- Every query term must match. Search uses up to four terms and accepts up to 64 characters; each term is capped at 24 characters.
- Only 50 ranked entries are retained. Equal scores use ascending product ID.
- Clearing the query cancels pending work and restores the first 50 products.
- The previous results remain visible while searching. Updating results does not replace or blur the search field.

Blocking performs the entire search during the input handler. Turnlet processes the same scorer with a fixed 5 ms chunk budget. Each new query aborts the previous operation and receives a new request ID. Only the current request can commit results or display an error, even if earlier work settles later.

Cancellation is quiet. Other search failures produce a status message and leave the previous results visible.

## Compare fairly

Use identical seeds, workloads, and completed queries to compare the same work. Try the large workload with a typo such as `ceramix` to exercise fuzzy scoring.

Rapid typing demonstrates cancellation and result ownership, but the amount of completed work can differ between modes. Small inputs can favor a plain loop because yielding adds overhead.

This milestone does not display INP or search timing. Cross-browser correctness checks and a working demo do not establish a performance improvement. Session INP attribution and reproducible measurements are subsequent plan steps.

Catalogue preparation itself is synchronous and occurs before the search input is enabled. Turnlet only schedules the search loop; a long individual callback can still block.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:demo
```

Unit tests cover deterministic generation, ranking against a full-sort reference, bounded results, mode equivalence, URL validation, cancellation, and stale success/error ownership. Playwright tests run against a production build and cover both modes, keyboard focus, no matches, clearing, rapid input, mobile overflow, and full-document restart.
