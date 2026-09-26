# Playground screenshots and walkthrough

[← Demo guide](../demo.md)

## Real search screenshots

These unedited Chromium screenshots show the production demo searching `ceramix` across 50,000 products, seed 42. Both modes use the same scorer and show the same final ranked products.

### Turnlet

![Turnlet mode: typo-tolerant search, live metrics, and ceramic products](search-turnlet.png)

### Blocking

![Blocking mode: the same query, workload, and resulting ceramic products](search-blocking.png)

These are separate unthrottled local sessions, typed at 120 ms per character. The live metrics describe those visits; they are not paired benchmark trials or the case study measurements. No metric values or UI content were replaced for the screenshots.

To recreate, build and serve the production demo:

```sh
npm run build
npm run preview --workspace @turnlet/demo -- --host 127.0.0.1 --port 4176 --strictPort
```

In another terminal:

```sh
npx playwright install chromium
node scripts/capture-screenshots.mjs
```

Optionally set `DEMO_URL` for another preview origin or `CHROMIUM_PATH` for an installed Chromium executable. Captures use a 1280 × 1140 viewport and reduced motion, and wait for completed results. Live values will vary. Do not capture while running measurement trials.

## Video walkthrough

[Watch the walkthrough](walkthrough.webm) · WebM, 1280 × 900

The recording visits Blocking and Turnlet modes, searches for `ceramix`, inspects both clocks, shows a no-match state, and ends with the integration example.

It is an orientation clip, **not a benchmark trial**. Recording is unthrottled, includes setup/control interactions, and uses slower typing than the rapid-input protocol. Values shown are live readings from that recorded visit, not the published experiment.

To recreate, serve a production build on port 4176 and run:

```sh
node scripts/record-demo.mjs
```

Do not run recording concurrently with measurement trials.
