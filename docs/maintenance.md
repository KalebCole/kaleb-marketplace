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

## Weekly external updates

`.github/workflows/update-external-pins.yml` runs each Monday and can also run
manually. Discovery compares each tracked branch with its exact reviewed pin.
Each changed plugin gets its own matrix job, branch, and pull request:

```text
automation/update-<plugin-name>
```

The job changes one canonical pin, regenerates both client catalogs, and runs
full validation. It never auto-merges. Matt Pocock's plugin tracks `main` and
is outside pin update discovery; its published manifest and skill markers are
checked against the current branch during validation. Frozen local skill copies
are also outside this workflow.

## Native installer documentation

Check Impeccable's upstream guide before changing the documented commands:

```bash
npx impeccable install
npx impeccable update
```
