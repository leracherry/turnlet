# Release checklist

**0.1.0 is prepared, not published or deployed.** No release workflow is triggered by a push or tag. Run it manually from Actions only when the corresponding external action is authorized.

## Package identity

The intended public package is `turnlet`, owned through the maintainer's npm account. On September 25, 2026, the public registry returned HTTP 404 for this name. This is not a reservation or proof of account permissions. Recheck immediately before publication; if npm rejects the name, choose a controlled scope, update all imports/fixtures, and rerun the gates.

Only `packages/turnlet` is publishable. Root and demo workspaces remain private. The package is ESM-only, MIT-licensed, dependency-free, and contains built JavaScript, declarations, README, and license. Its prepack hook builds fresh output. See [CHANGELOG](../CHANGELOG.md).

## Validate and inspect

Use the pinned Node version and run from a clean checkout:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx playwright install chromium firefox webkit
npm run test:browser
npm run test:demo
npm run test:pages
npm run test:package
npm run build
npm pack --workspace turnlet --dry-run
```

CI runs these correctness gates. The package test installs a real tarball in a clean consumer, checks ESM exports/types, and executes it in Chromium. Review the file list before release: no source tests, credentials, demo dependencies, or media should be included.

The reviewed 0.1.0 candidate contains 24 files: built modules/declarations/source maps, README, license, and package metadata. It is 6,546 bytes packed and 21,002 bytes unpacked. Its npm SHA-1 is `2ab8bfebc51f89b6ca9980c67de95c230bc909c5`; regenerate and compare after any package change. The case study retains its older 0.0.0 artifact sizes as historical evidence.

The manual **Release → prepare** action reruns validation and uploads a tarball without publishing. Root-build demo assets use `/`; Pages builds explicitly use `/turnlet/`. The separate Pages test checks asset loading, search, home, settings navigation, and session reset beneath that path.

## Publish, only after approval

1. Confirm npm account ownership/access, 2FA, package name, version, and registry. A first publication may require an interactive authenticated maintainer publish before package-level trusted-publisher settings are available. Do not create a placeholder package merely to reserve the name.
2. Require green CI on the exact final release commit. Review the tarball. Only then create and push the annotated `v0.1.0` tag on that commit. Preparation does not create this tag.
3. Configure the GitHub `npm-release` environment with required reviewers. For subsequent CI publication, configure npm trusted publishing for owner `leracherry`, repo `turnlet`, workflow `release.yml`, environment `npm-release`, permitting direct publish. No npm token is stored in the repository.
4. Dispatch **Release → publish** from `main`. It validates again, requires the version tag to match the run's exact SHA, and publishes the prepared artifact through OIDC. The workflow uses Node 22.23.2 and npm 11.5.1, meeting npm's documented minimums.
5. Verify registry metadata, version, provenance, and a clean `npm install turnlet@0.1.0` consumer. Only then add installation claims and mark the changelog released.

For the first interactive publication, use the same validated artifact and npm's interactive login/2FA flow, under explicit authorization. Do not expect OIDC configuration alone to create an unregistered package. If that bootstrap publishes 0.1.0, do not dispatch another publish for the same version.

## Deploy, only after approval

1. Set repository Pages source to **GitHub Actions** and protect the `github-pages` environment with reviewers. No settings are changed by preparation.
2. Dispatch **Release → deploy** from `main`. Validation precedes building and uploading the static demo at the repository base path.
3. Verify the URL returned by the deployment: load assets, search both modes, reset, and apply settings. Only after this succeeds add the actual live link to the README.

Publication and deployment are independent actions. A failed deployment does not justify republishing an immutable npm version. Diagnose failed jobs before retrying; confirm whether an external action already succeeded. Roll back a demo by deploying a reviewed prior revision through an explicitly reviewed workflow change; do not rewrite npm releases.

## Supported environment notes

The browser library uses modern JavaScript, performance.now, AbortController, and timers. It prefers scheduler.yield when available. CI exercises Chromium, Firefox, and WebKit; it does not establish minimum browser versions or Internet Explorer support. ESM imports are DOM-free; Node consumer checks establish import/behavior safety, not a Node scheduling performance promise. Async callbacks, CommonJS, workers, and global fairness are outside this release's contract.

## Provider references

Reviewed September 25, 2026: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [npm provenance](https://docs.npmjs.com/generating-provenance-statements/), [Vite static deployment](https://vite.dev/guide/static-deploy), and [GitHub Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Provider requirements can change; recheck before executing a release.
