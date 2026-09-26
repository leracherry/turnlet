# Documentation

[← Turnlet](../README.md)

Turnlet is a tiny TypeScript library for chunking array work to improve **Interaction to Next Paint (INP)**. Yielding gives the browser opportunities to respond while the work continues on the main thread.

Choose a path:

| I want to…                 | Read                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| Use the library            | [API guide](api.md)                                              |
| Check exact behavior       | [API contract](api-contract.md)                                  |
| Try cancellable validation | [Runnable recipe](../examples/record-validation/README.md)       |
| Explore the catalogue      | [Demo guide](demo.md) or [walkthrough](media/README.md)          |
| Understand the evidence    | [Engineering case study](case-study.md)                          |
| Repeat the experiment      | [Measurement protocol](methodology.md)                           |
| Prepare a release          | [Release checklist](release.md) and [changelog](../CHANGELOG.md) |

## Status

Version **0.1.0** is [available on npm](https://www.npmjs.com/package/turnlet), published September 25, 2026. Install it with `npm install turnlet`. Run the [catalogue playground locally](demo.md#run-locally); package publication and demo hosting are independent.

## Reading the evidence

The case study describes a particular tested revision—not every future build. Its raw trials and package metadata remain historical records. Current release artifacts are reviewed separately in the release checklist.

INP candidates measure responsiveness, while search completion measures time through the accepted DOM update. Neither alone establishes that Turnlet is the right choice for every workload.
