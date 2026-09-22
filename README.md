# Turnlet

Small turns. Responsive interfaces.

Turnlet is a TypeScript library in development for processing arrays in cooperative chunks. This repository uses npm workspaces to keep the library and its Vite demonstration separate.

The proposed 0.1 API provides `mapInChunks` and `forEachInChunks` with ordered synchronous callbacks, time-budgeted yielding, and `AbortSignal` cancellation. The contract is specified before implementation so edge cases remain reviewable: [read the API contract](docs/api-contract.md).

## Workspace

- `packages/turnlet` contains the side-effect-free ESM library package.
- `apps/demo` contains a vanilla TypeScript demonstration.

## Development

Use Node.js 22 and install dependencies from the repository root.

```sh
npm ci
npm run typecheck
npm run lint
npm run build
```

The public API is specified but not implemented or published yet.
