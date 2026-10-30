# Mutation testing

Use Node 24 and the pinned pnpm version. `pnpm mutation` reuses compatible local
results; `pnpm mutation:full` forces a fresh full run. Reports are under `reports/`
(HTML, JSON and `stryker-incremental.json`); reports/sandboxes are not committed.

The configured full scope is parser.ts, schema-support.ts, utils.ts and
array-renderer.ts. Vue SFC source is not mutated: component tests still run and
exercise these TS modules, but this is not a mutation score for JsonEditor.vue,
the example, or every project file. Export-only/type modules are not targets.
Vitest 3.2.7 plus its matching UI/coverage packages and Stryker core/runner 10.0.0
are pinned and must be upgraded together after real runner verification. Stryker
10 requires Node >=22; project CI/development use Node 24. This does not change
the published Vue library's runtime minimum. Related-only test selection stays off.

Mutation CI runs automatically on pushes to main and through manual
`workflow_dispatch`; PRs retain the separate CI workflow's lint, type checks,
ordinary tests (including schema contracts), coverage thresholds, release-helper
tests, builds and package-consumer checks. Mutation is not an automatic PR check.

CI reads only trusted main baselines. Only successful main push or main manual
runs save the shared namespace. Missing/incompatible baseline means a full
configured run, explicitly reported in the job summary. Verify a successful main
run's cache-save logs before claiming a shared baseline exists.

Before merging this scheduling change, maintainers must verify branch protection,
repository/organization rulesets and any aggregate checks. If the `mutation` check
from `CI - Mutation Testing` is required for PRs, remove or replace that exact
requirement first; otherwise PRs can wait indefinitely for a check that no longer
runs. Other required checks stay in place. A manual workflow run is review evidence,
not a replacement for a required PR check. This change does not edit protection
settings or create a skipped/synthetic mutation result.

Local commands and CI use the same semantic-input guard. The policy remains
conservative (`trackedByStryker` is empty): source, tests, helpers, fixtures,
snapshots, dependency declarations, installed dependencies, configuration,
lockfiles and runtime changes force a full configured run. Tracked files and
non-ignored untracked files are included. Native Stryker change detection alone
does not guarantee safe reuse after arbitrary source edits.

Only exact, reviewed documentation paths are excluded. The root package version
is normalized because the current mutation scope and tests do not read it;
other manifest fields and all dependency declarations remain semantic inputs.
Review these exceptions in `.github/mutation-cache-inputs.json`. Inspect the
resolved input manifest before changing the policy:

```bash
node .github/scripts/baseline-inputs.mjs .github/mutation-cache-inputs.json --list
```

The `v3` namespace stores `reports/stryker-incremental.json` together with
`reports/stryker-incremental.json.inputs.json`. Legacy reports, missing metadata,
changed reports and unsuccessful runs cannot authorize reuse. Only the exact
compatibility prefix is restored; keys append run ID and attempt. Metadata is
written only after a successful run with unchanged semantic inputs.

The regular launcher accepts only `--force`. Scoped experiments need a separate
configuration and ignored report path through `.github/scripts/run-mutation.mjs`,
with the same report path configured as Stryker's incrementalFile. External state
that the policy cannot capture still requires an explicit full run.
Use Actions "Run workflow" with full=true on main to rebuild the shared baseline.
For a high-risk same-repository PR, select its branch in Actions or run:

```bash
gh workflow run mutation.yml --ref <branch> -f full=true
```

Confirm the actual checkout SHA matches the intended PR head. Other branches only
read compatible main baselines and produce artifacts; they never save a shared
baseline. Fork branches require the project's trusted review process; do not use
`pull_request_target` to execute their code. The workflow must exist on the default
branch before manual dispatch is available.

Main and manual jobs are not actively cancelled. Runs for the same workflow/ref
share a concurrency group; GitHub may replace pending runs, so this is not a FIFO
queue or a guarantee that every commit runs. On a main failure, the maintainer
reviews the retained report, fixes the cause, and reruns the workflow (full when
needed); ordinary CI success does not replace a failed mutation result. Failed
runs never save the shared baseline.

No mutation score break threshold is imposed on initial integration. Successful
execution is not a quality gate or a claim that every survivor is a defect.
Review Survived, NoCoverage and RuntimeError separately; don't call the score code
coverage. Scores and timing belong in PR/CI artifacts, not this maintenance guide.
