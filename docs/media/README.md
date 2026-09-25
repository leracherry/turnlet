# Playground walkthrough

[← Demo guide](../demo.md)

[Watch the walkthrough](walkthrough.webm) · WebM, 1280 × 900

The recording visits Blocking and Turnlet modes, searches for `ceramix`, inspects both clocks, shows a no-match state, and ends with the integration example.

It is an orientation clip, **not a benchmark trial**. Recording is unthrottled, includes setup/control interactions, and uses slower typing than the rapid-input protocol. Values shown are live readings from that recorded visit, not the published experiment.

To recreate, serve a production build on port 4176 and run:

```sh
node scripts/record-demo.mjs
```

Do not run recording concurrently with measurement trials.
