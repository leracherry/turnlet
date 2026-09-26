# Release checklist

[← Documentation](README.md)

**[0.1.0 is published on npm](https://www.npmjs.com/package/turnlet/v/0.1.0)** as of September 25, 2026. Demo deployment is independent. No release workflow is triggered by a push or tag; future releases use the manual Actions workflow.

## Package identity

The public package name is `turnlet`. Registry metadata confirms version 0.1.0 was published at `2026-09-25T22:47:59.620Z`. Check current metadata with `npm view turnlet version time --json`.

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

Regenerate archive sizes and checksums for each candidate; README edits also change the tarball. The case study retains its older 0.0.0 artifact sizes as historical evidence.

The manual **Release → prepare** action reruns validation and uploads a tarball without publishing. Root-build demo assets use `/`; Pages builds explicitly use `/turnlet/`. The separate Pages test checks asset loading, search, home, settings navigation, and session reset beneath that path.

## Publish a new version

Version 0.1.0 is immutable. Repository README edits reach npm in a new package release; they do not update the already-published tarball. Push screenshot assets to `main` before publishing a README that references their raw GitHub URLs.

| Manual action | Effect after validation        | Additional prerequisite                                 |
| ------------- | ------------------------------ | ------------------------------------------------------- |
| `prepare`     | Upload a package artifact only | Review the resulting tarball                            |
| `publish`     | Publish the artifact to npm    | npm access, protected environment, matching version tag |
| `deploy`      | Deploy the static demo         | Pages configured, protected environment                 |

All actions run from `main`. A workflow file alone does not configure npm trust, Pages, or required reviewers.

1. Confirm npm account ownership/access, 2FA, package name, version, and registry. Store a granular npm token as the repository Actions secret `NPM_TOKEN`. It needs write access that permits the target package, direct-publish permission (not stage-only), and bypass 2FA for unattended publishing. Do not paste it into source files or logs.
2. Require green CI on the exact final release commit. Review the tarball. Bump the package version and lockfile, update the changelog, and replace the hardcoded `turnlet-0.1.0.tgz` filename in `.github/workflows/release.yml` with the new version before validation. Only then create and push the matching annotated version tag on that commit. Preparation does not create this tag.
3. Configure the GitHub `npm-release` environment with required reviewers. The workflow passes the secret to npm only for the secret-presence check and publish step; it never prints the value.
4. Dispatch **Release → publish** from `main`. It validates again, requires the version tag to match the run's exact SHA, and publishes the prepared artifact using the token, with provenance. The workflow uses Node 22.23.2 and npm 11.5.1.
5. Verify registry metadata, version, provenance, and a clean consumer installation pinned to the new version. Only then mark its changelog entry released.

For future releases, consider migrating to [trusted publishing](https://docs.npmjs.com/trusted-publishers/): configure owner `leracherry`, repo `turnlet`, workflow `release.yml`, and environment `npm-release`, then update the workflow to use OIDC without the token requirement. Revoke the token only after verifying that migration. Do not publish an already-existing version again.

## Deploy the demo

1. Set repository Pages source to **GitHub Actions** and protect the `github-pages` environment with reviewers. No settings are changed by preparation.
2. Dispatch **Release → deploy** from `main`. Validation precedes building and uploading the static demo at the repository base path.
3. Verify the URL returned by the deployment: load assets, search both modes, reset, and apply settings. Only after this succeeds add the actual live link to the README.

Publication and deployment are independent actions. A failed deployment does not justify republishing an immutable npm version. Diagnose failed jobs before retrying; confirm whether an external action already succeeded. Roll back a demo by deploying a reviewed prior revision through an explicitly reviewed workflow change; do not rewrite npm releases.

## Supported environment notes

The browser library uses modern JavaScript, performance.now, AbortController, and timers. It prefers scheduler.yield when available. CI exercises Chromium, Firefox, and WebKit; it does not establish minimum browser versions or Internet Explorer support. ESM imports are DOM-free; Node consumer checks establish import/behavior safety, not a Node scheduling performance promise. Async callbacks, CommonJS, workers, and global fairness are outside this release's contract.

## Provider references

Reviewed September 25, 2026: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [npm provenance](https://docs.npmjs.com/generating-provenance-statements/), [Vite static deployment](https://vite.dev/guide/static-deploy), and [GitHub Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Provider requirements can change; recheck before executing a release.
