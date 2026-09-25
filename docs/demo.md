# Catalogue playground

[← Documentation](README.md)

**One workload. Two ways to schedule it.**

The demo searches synthetic products using either a synchronous loop or Turnlet's public `forEachInChunks` export. The catalogue, scorer, iteration order, and top-50 accumulator are identical in both modes.

## Run locally

Use the Node version in [`.nvmrc`](../.nvmrc). Run these commands from the repository root:

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

Live measurements help explore behavior, but correctness checks and individual readings do not establish a performance improvement. The [case study](case-study.md) reports a controlled local experiment with raw results, sample counts, and limitations; use the [protocol](methodology.md) to reproduce it.

Catalogue preparation itself is synchronous and occurs before the search input is enabled. Turnlet only schedules the search loop; a long individual callback can still block.

## Read the measurements

| Measurement              | Boundary                                                    | Meaning                                                                                         |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Session INP candidate    | Input delay + event processing + presentation delay         | The current candidate for this document, including interactions with controls                   |
| Latest search completion | Input-handler entry through the accepted results DOM update | Time to finish the latest query, including yields; excludes earlier input delay and final paint |

INP uses one [`web-vitals` attribution](https://github.com/GoogleChrome/web-vitals) subscription per document. Its value, target, and breakdown are captured together. It is not a timer for every query or necessarily the last interaction, and the candidate can change during a visit.

For INP, **Waiting** means there is no attributable sample yet; **Unavailable** means the browser lacks the required Event Timing support. Real keyboard or pointer interactions are needed; synthetic input changes do not establish INP. Event durations are rounded by the browser, and events below the configured 16 ms reporting threshold may not provide an attribution sample.

For search completion, **Waiting** means no query has completed since initialization or clearing; **Searching…** means the current query is pending; **Unavailable** means the search failed.

Search completion changes only for the current accepted request. Cancelled work cannot overwrite a newer reading. Clearing the query resets completion to Waiting without clearing the session INP. Metric updates are batched to an animation frame and are not live-announced on every keystroke.

Use **Reset session** to reload the currently applied configuration and clear both readings. Unapplied control edits are discarded. Applying new settings also starts a fresh document.

## Verification

### Interface checks

The playground uses six local SVG illustrations with reserved dimensions and no remote fonts or images. Keyboard users can skip directly to search. The integration example below the catalogue is focusable and scrolls independently on narrow screens.

That snippet shows the public API, not a complete search implementation: the scorer and accumulator belong to the application. Use the [validation recipe](../examples/record-validation/README.md) for a complete cancellation and request-ownership pattern.

### Automated checks

```sh
npm test
npx playwright install chromium
npm run test:demo
npm run test:pages
```

Unit tests cover deterministic generation, ranking, bounded results, mode equivalence, cancellation, timing ownership, attribution snapshots, and a single metrics subscription. Production-build browser tests cover both modes, keyboard focus, no matches, clearing, rapid input, mobile overflow, real keyboard INP, unavailable metrics, and fresh-session reset.

For visual changes, review the production preview at desktop and narrow mobile widths, including the waiting, measured, unavailable, empty, and loading states. Check keyboard focus and reduced-motion settings. Capture a browser Performance trace while typing into the large workload: search scoring should remain the main application work, not illustrations or metric rendering. This is a UI-overhead sanity check, not a comparison benchmark.
