# Marketplace Maintenance

## Catalog generation

Edit only `.agents/plugins/marketplace.json`, then run:

```bash
npm run generate
node scripts/catalog.mjs check
```

The generator writes the Copilot catalog at
`.github/plugin/marketplace.json` and the Claude catalog at
`.claude-plugin/marketplace.json`. Unknown fields, unsupported source types,
unsafe paths, and unmappable sources fail explicitly.

## Validation workflow

Use Node.js 22 or later, Git, and Python 3.10 or later. Run the same commands
in PowerShell, macOS Terminal, and Linux:

```bash
npm ci
npm run check
```

The default check is offline: it validates the canonical schema, generated
catalogs, local manifests, skill metadata, licenses, notices, LF line endings,
and repository tests. Git and Python are required; missing tools fail the
check rather than skip it. The benchmark fixture uses Python without writing
bytecode. Set `PYTHON` to an interpreter path if its standard command is not
available.

`.github/workflows/validate.yml` runs `npm run check` on Windows, macOS, and
Linux for pull requests, pushes to `main`, and manual dispatches. Every
platform runs even if another fails. The required `validate` job succeeds
only when the platform matrix succeeds; a failed, cancelled, or skipped
matrix cannot satisfy it. There are no path filters and no recurring live
workflow.

Repository text uses LF through `.gitattributes`, including on machines
with `core.autocrlf=true`. Existing CRLF working files are not changed by
adding attributes. Preserve pending edits and convert the files reported by
the check to LF without changing their text. Do not reset the checkout or
weaken exact output comparisons.

## Live checks

```bash
npm run check:live
npm run check:live -- --copilot
npm run check:live -- --claude
```

The first command checks current upstream branches and required package
markers. It needs network access. Set `GITHUB_TOKEN` if authenticated GitHub
API access is needed. These checks are separate from the deterministic
merge gate because upstream content and availability can change.

`--copilot` also registers a temporary marketplace and installs every listed
plugin in a temporary `COPILOT_HOME`. Stored packages, including
`kaleb-skills`, are copied from this checkout; other packages come from
their upstream branches. This tests pending local package content rather
than only this repository's remote `main`. The installed Copilot CLI must
support `COPILOT_HOME` and local marketplace paths.

`--claude` runs Claude's catalog validator, not an install test, with a
temporary `CLAUDE_CONFIG_DIR`. Both flags can be combined. Client commands
must already be installed and on `PATH`. An explicitly requested missing
client fails; unrequested client checks are reported as `SKIPPED`, never as
passed. Windows uses Windows PowerShell to resolve native executables and
command shims. Temporary directories are removed after the run. The default
check never runs these client operations.

`scripts/validate-marketplace.sh` remains a Bash compatibility wrapper for
`npm run check`; it no longer runs live or client checks.

No result is described as proof of cross-client compatibility.

## External updates

Catalog entries track their source repositories' `main` branches, including
`kaleb-skills` in this repository. Installed clients can receive new package
revisions on a marketplace refresh. The separate live check verifies that each
tracked branch exists and still contains its required package markers. Frozen
skill copies remain in this repository until their contents are updated here.

`.github/workflows/sync-copied-skills.yml` runs each Tuesday and can run
manually. It compares the copied skill directories with the current source
repositories listed in `THIRD_PARTY_NOTICES.md`. When content changes and the
source license is unchanged, it copies the new files, records their source
commits, and validates the package before it publishes a pull request for
review. A license change stops the sync for manual review. The workflow does
not merge its pull request.

After publication, the updater explicitly dispatches `validate.yml` on its
branch. A push made with `GITHUB_TOKEN` does not start another push workflow,
and an automatic pull-request workflow can require approval. Explicit
dispatch starts the cross-OS check without a new token or a ruleset change.
It requires the updater's `actions: write` permission and the dispatch-enabled
validation workflow to be present on the default branch.

## Native installer documentation

Check Impeccable's upstream guide before changing the documented commands:

```bash
npx impeccable install
npx impeccable update
```
