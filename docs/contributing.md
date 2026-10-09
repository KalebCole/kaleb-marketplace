# Contributing

Kaleb Marketplace accepts three kinds of change.

## Local stored plugin

Place an independently installable package at `plugins/<name>/`. It must have:

- `plugin.json` using the Agent Plugins 1.0 schema;
- each skill at `skills/<name>/SKILL.md`;
- a license;
- third-party notices for copied content.

For frozen copies, preserve the reviewed source text exactly. Record the
original repository, source path, exact copied commit, copyright notice, and
license in `THIRD_PARTY_NOTICES.md`. Do not add an automatic updater.

## Maintained external plugin reference

Add a native source to `.agents/plugins/marketplace.json`. Existing external
plugins use exact pins; Matt Pocock's plugin is the tracked-branch exception.
Do not copy the external package into this repository. Before listing it:

1. verify the commit or tracked branch exists;
2. verify the package markers required by each target client;
3. confirm every canonical source field has a safe generator mapping;
4. regenerate both client catalogs;
5. add validation coverage for the package layout.

Run:

```bash
npm ci
npm test
node scripts/catalog.mjs generate
bash scripts/validate-marketplace.sh
```

Commit all three catalogs together. Do not edit a generated client catalog by
hand.

## Native external installer

Document the source project's supported commands and link to its current
guide. Do not create a wrapper to force a package into a client catalog.

## Review policy

External pin update automation opens one pull request per changed pinned
plugin. A person reviews the source change and exact pin before merge. The
workflow never auto-merges. Matt Pocock's tracked branch follows upstream
through client marketplace refreshes.
