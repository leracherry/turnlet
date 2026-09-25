# Small turns, different tradeoffs

[← Documentation](README.md)

**A local engineering case study—not a universal INP claim.**

Turnlet's goal is to create opportunities for input and rendering while ordered synchronous work progresses. This experiment asks whether that helps the catalogue demo, and what it costs in completion time.

[Protocol](methodology.md) · [Raw trials](experiments/2026-09-24-chromium-macos.json) · [Walkthrough](media/README.md) · [API guide](api.md)

## What ran

- Production assets from commit `037dde8b99ec7f1fd40cc4874673002013330c3e`, with a clean source tree when collection started.
- Apple M3 Pro, 12 logical CPUs, 18 GiB memory; macOS 26.6.2, Darwin 25.6.0, arm64.
- Headed Chromium **153.0.8010.12**, 1440 × 1000 viewport, **4× CPU slowdown**, localhost with no network throttle.
- Native `scheduler.yield` available in every successful trial; Turnlet budget **5 ms**.
- Seed **42**, final query `ceramix`, identical scoring and top-50 result logic.
- Five fresh-session attempts per mode/scenario, rotating order. No video or trace during measurement.

Collection started on September 24 locally (September 25 UTC). The raw file contains exact timestamps, built-asset SHA-256, input arrival times, candidate attribution, and result IDs. Documentation added afterward does not change the measured application assets.

## Results

All values below are milliseconds: **median [minimum–maximum]**. INP means the live session candidate sampled by the protocol, not a finalized lifecycle value or a field percentile.

| Scenario                          | Mode     | Usable / attempted | INP candidate | Latest search completion |
| --------------------------------- | -------- | -----------------: | ------------: | -----------------------: |
| Completed query · 50,000 products | Blocking |              5 / 5 | 312 [304–312] |      285.9 [276.1–287.9] |
| Completed query · 50,000 products | Turnlet  |              5 / 5 |    24 [16–24] |      314.6 [311.4–330.0] |
| Rapid input · 50,000 products     | Blocking |              5 / 5 | 296 [280–328] |      266.8 [255.4–292.6] |
| Rapid input · 50,000 products     | Turnlet  |              5 / 5 |    24 [24–32] |      318.9 [274.6–330.0] |
| Completed query · 500 products    | Blocking |              5 / 5 |    40 [32–40] |         10.6 [10.1–10.8] |
| Completed query · 500 products    | Turnlet  |              4 / 5 |    20 [16–24] |        16.35 [16.1–17.2] |

**One failed trial is retained:** small-workload Turnlet, round 3, ended with “Target page, context or browser has been closed” during the sampling wait. Its cause was not established. There is no replacement trial or imputed value; that row has only four usable samples. Every successful trial had an attributable INP sample. No successful slow trials were excluded.

The summary checker verifies trusted input counts, visible documents, matching final ranked IDs within each workload, and attribution totals. Recompute the numbers:

```sh
node scripts/summarize-experiment.mjs docs/experiments/2026-09-24-chromium-macos.json
```

### Responsiveness is not completion

For the single large search, Turnlet's median candidate was lower, but its median completion time was longer. Yielding allows the interaction to reach a paint before all search work finishes; it does not make the scoring algorithm cheaper.

Completion ends after the accepted DOM update and excludes final paint. INP includes input delay, event processing, and presentation delay. These clocks intentionally answer different questions.

### Rapid input is not equal completed work

The requested typing delay was zero, but actual input arrival spans differed:

| Mode     | First-to-last input span: median [range], ms |
| -------- | -------------------------------------------: |
| Blocking |                          780.4 [754.8–801.5] |
| Turnlet  |                             42.4 [34.5–49.0] |

The browser/driver cannot deliver this sequence with the same cadence when handlers block. Turnlet may abandon superseded searches while blocking work must finish before later input can be handled. These trials illustrate responsiveness under sequential automated typing; they do not establish an equal-work throughput gain or a count of cancelled callbacks.

Both modes produced the same final ranked results in every successful trial of a given workload.

### Small work can favor a plain loop

The small scenario finished sooner with Blocking in this run. Turnlet still pays for its initial yield, clocks, cancellation checks, and scheduling. A small dataset is not automatically a reason to use chunking. The four-sample Turnlet row also warrants extra caution: these observations are not a stable estimate across devices.

## Engineering choices

**A small public surface.** Ordered `mapInChunks` and `forEachInChunks` share one runner. This keeps cancellation and budget behavior consistent.

**Cooperative, not preemptive.** The budget is checked between callbacks. One callback that runs for longer than the budget still blocks for its whole duration. Reduce per-item work or consider a worker when that is the dominant cost.

**Cancellation plus ownership.** Abort stops future work once observed; request IDs prevent a stale result or error from reaching the view. Neither rolls back completed side effects. The [record-validation recipe](../examples/record-validation/README.md) demonstrates the same pattern outside search.

**Bounded results, not bounded total memory.** The demo retains at most 50 ranked results but keeps the full catalogue in memory. Mapping allocates an output slot per input; iteration does not allocate that output array. The validation recipe additionally copies its input values. This experiment did not measure heap peaks, allocation rate, or GC behavior.

**Package cost is separate.** A fresh verified tarball was **6,476 bytes packed (6.32 KiB)** and **20,796 bytes unpacked (20.31 KiB)**. [Artifact metadata](experiments/2026-09-24-artifacts.json) records its checksum. These are package archive sizes including documentation and declarations—not browser download, parsed-code, or runtime-memory sizes. The library has no runtime dependencies; `web-vitals` belongs only to the demo.

## Limits and next questions

This is one synthetic workload on one desktop browser/backend under artificial slowdown. Background OS load, thermal state, and power settings were not controlled or recorded. Trials include first-search/JIT effects. The sample is small and includes one unexplained failure.

Live candidates are sampled before page closure. Browser rounding, reporting thresholds, and display precision limit interpretation near a frame boundary. A lower candidate here does not imply every search or real user will have better INP.

Next investigations could cover unthrottled hardware, timer fallback, other engines, real device input, different budgets, and expensive individual callbacks. Algorithmic reduction, debouncing, native scheduling, and workers remain alternatives—not defeated baselines.

The [walkthrough](media/README.md) shows how to explore the demo. It was recorded separately and is not timing evidence.
