# Repository Guidance

This repository publishes the `kaleb-marketplace` catalog for several agent
clients. Keep changes focused on marketplace maintenance.

## Source of truth

- Edit `.agents/plugins/marketplace.json` for catalog changes.
- Do not edit `.github/plugin/marketplace.json` or
  `.claude-plugin/marketplace.json` by hand. Run `npm run generate` and commit
  both generated catalogs with the canonical catalog.
- Keep generator and validator behavior aligned with
  `schemas/marketplace.schema.json` and `scripts/catalog.mjs`.

## Distribution invariants

- Choose one supported path: a local stored plugin, a maintained external
  plugin reference, or the source project's native installer. See
  `docs/usage.md` and `docs/contributing.md`.
- Local plugins live under `plugins/<name>/` and must include the manifest,
  skills, license, and notices described in `docs/contributing.md`.
- Pin external plugins to a reviewed 40-character commit SHA. The documented
  `mattpocock-skills` `main` reference is the only current exception.
- When adding an external entry, add its required package markers to
  `scripts/validate-marketplace.mjs`.

## Validation and review

Run the complete repository check before review:

```bash
npm ci
bash scripts/validate-marketplace.sh
```
