# CI and releases

CI runs on ordinary pull requests and main: read-only formatting checks, types,
coverage, release-helper mock tests, demo/library builds, and an actual npm
pack/install consumer matrix (ESM/CJS, bundler, NodeNext/Node16 ESM/CJS).
Use Node 24 and `pnpm install --frozen-lockfile` (pnpm version is pinned).
`pnpm lint:fix` and `pnpm format` remain explicit local write commands.

## One-time owner configuration (not performed by this PR)

For the existing npm package `vue-json-ui-editor`, configure a GitHub Actions
Trusted Publisher with owner `yourtion`, repository `vue-json-ui-editor`, workflow
filename `release.yml`, environment **blank**. Its Allowed actions must permit
`npm publish` (direct publishing); stage-only authorization needs a different
approval flow. No NPM_TOKEN or GitHub persistent credential is required.
Do not change account/2FA settings as part of installing these workflows.
Branch protection/required checks are a separate owner decision.
See https://docs.npmjs.com/trusted-publishers/ for current authorization requirements.

## A future release (requires separate release authorization)

1. Update package version and lockfile in a reviewed PR, and merge to main.
2. Create/push a new strict `vX.Y.Z` or `vX.Y.Z-rc.N` tag at that main commit.
   The existing v3.1.0 tag is historical: do not move, recreate, or publish it.
3. Release validates version and tag ancestry before installing dependencies.
   It runs CI checks, builds, packs once, and installs/tests that exact tarball.
   Node 24 supplies npm >=11.5.1 for OIDC; the job prints Node/npm versions.
4. Publish the same checked tarball with scripts disabled: stable => latest,
   prerelease => next. Only a structured registry E404 means absent; errors abort.
5. Only npm success (or an already-existing exact version) allows GitHub Release.

Rerun the same tag after a transient failure: an existing npm version is skipped,
and a missing GitHub Release is completed. Do not reuse an npm version for changed
code. Publishing no longer creates/pushes tags in a postpublish lifecycle.
Release jobs serialize without cancellation; GitHub concurrency is not a FIFO queue
and can replace pending jobs, so release multiple versions one at a time.
Public npm OIDC provenance is distinct from GitHub artifact attestations.

Workflow/helper tests and local packaging do not validate live OIDC authorization.
This change does not bump, publish, tag, create a Release, or configure npm.
