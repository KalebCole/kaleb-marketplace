# Marketplace Maintenance

## Catalog generation

Edit only `.agents/plugins/marketplace.json`, then run:

```bash
node scripts/catalog.mjs generate
node scripts/catalog.mjs check
```

The generator writes the Copilot catalog at
`.github/plugin/marketplace.json` and the Claude catalog at
`.claude-plugin/marketplace.json`. Unknown fields, unsupported source types,
unsafe paths, and unmappable sources fail explicitly.

## Validation workflow

`.github/workflows/validate.yml` runs the repository validation on pull
requests and pushes to `main`. The validation includes:

- canonical marketplace JSON Schema checks;
- Agent Plugins 1.0 manifest checks;
- Agent Skills metadata and directory checks;
- generated-file drift detection;
- local license and notice checks;
- external revision and package marker checks;
- Copilot catalog smoke validation;
- Claude catalog validation when the Claude executable is available.

No result is described as proof of cross-client compatibility.

## External updates

Catalog entries track their source repositories' `main` branches, including
`kaleb-skills` in this repository. Installed clients can receive new package
revisions on a marketplace refresh. Repository validation checks that each
tracked branch exists and still contains its required package markers. Frozen
skill copies remain in this repository until their contents are updated here.

`.github/workflows/sync-copied-skills.yml` runs each Tuesday and can run
manually. It compares the copied skill directories with the current source
repositories listed in `THIRD_PARTY_NOTICES.md`. When content changes and the
source license is unchanged, it copies the new files, records their source
commits, and opens a pull request for review. A license change stops the sync
for manual review. The workflow does not merge its pull request.

## Native installer documentation

Check Impeccable's upstream guide before changing the documented commands:

```bash
npx impeccable install
npx impeccable update
```
