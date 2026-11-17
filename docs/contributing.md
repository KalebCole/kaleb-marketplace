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
npm run generate
npm run check
npm run check:live
```

Use Node.js 22 or later, Git, and Python 3.10 or later on Windows, macOS, or
Linux. `npm run check` is deterministic and offline. It checks generated
files without rewriting them. `npm run check:live` checks current upstream
branches and package markers; it does not install clients or plugins by
default.

Commit all three catalogs together. Do not edit a generated client catalog by
hand.

## Line endings and tests

Repository text uses LF on all operating systems. `.gitattributes` overrides
`core.autocrlf` for new checkouts. For an older checkout with CRLF files,
preserve pending edits and convert only the listed text files to LF without
changing their content. Do not reset the checkout or stage unrelated files.

Keep exact comparisons for generated catalogs and copied source text. Accept
CRLF only at documented input boundaries, such as skill frontmatter. CLI
tests must use unique temporary fixtures and clean them up. Never change a
real catalog from a test or run the full check recursively.

## Native external installer

Document the source project's supported commands and link to its current
guide. Do not create a wrapper to force a package into a client catalog.

## Review policy

External plugins follow upstream through client marketplace refreshes. Review
their current content before adding a new source to the catalog. Validation
checks current package markers only when the separate live check is run.
