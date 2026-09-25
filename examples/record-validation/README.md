# Cancellable record validation

A small example of ordered mapping outside the catalogue demo.

```sh
npm ci
npm run test:examples
```

Run from the repository root. The command builds Turnlet, compiles this example, and executes assertions through the public package entry.

`createValidator(commit, reportError)` returns:

- `update(records)`: cancel the previous operation, copy form values, validate in chunks, and commit only the current result.
- `cancel()`: invalidate and abort pending work, for example when a view is removed.

Validation is synchronous and intentionally minimal. Replace `validateRecord` with your own local rules; do remote checks separately. Snapshot creation is still synchronous and allocates memory, so measure it for large forms. This shallow copy suffices for these string-only records; nested inputs need their own ownership strategy.

The runner checks ordered results, cancellation, stale-result ownership, snapshot isolation, and both library operations. It runs in Node to verify behavior, not browser responsiveness.
