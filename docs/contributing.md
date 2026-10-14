# Contributing

Kaleb Marketplace accepts three kinds of change.

## Local stored plugin

Place an independently installable package at `plugins/<name>/`. It must have:

- `plugin.json` using the Agent Plugins 1.0 schema;
- each skill at `skills/<name>/SKILL.md`;
- a license;
- third-party notices for copied content.

The `kaleb-skills` catalog entry tracks the package in this repository's
`main` branch so installed clients can receive new package revisions.

For copied skills, preserve the source text exactly. Record the original
repository, source path, exact copied commit, copyright notice, and license in
`THIRD_PARTY_NOTICES.md`. The scheduled updater proposes changed copies in a
pull request. Review the content and license before merging it.

## Maintained external plugin reference

Add a native source to `.agents/plugins/marketplace.json`. External plugins
track their upstream branches so installed clients can receive updates.
Do not copy the external package into this repository. Before listing it:

1. verify the tracked branch exists;
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

External plugins follow upstream through client marketplace refreshes. Review
their current content before adding a new source to the catalog. Validation
checks that each tracked branch still has the expected package markers.
