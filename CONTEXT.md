# Kaleb Marketplace Context

Kaleb Marketplace is a personal, public marketplace for selected agent
plugins. It is not a universal package manager and does not promise automatic
cross-client compatibility.

## Language

**Local Stored Plugin**:
An independently installable Agent Plugins 1.0 package stored under
`plugins/<name>/`. It contains a root `plugin.json` and portable components in
fixed standard locations.
_Avoid_: bundle, copied external repository

**Maintained External Plugin Reference**:
A catalog entry that keeps plugin content in the author's repository. These
entries follow their upstream `main` branches so client marketplace refreshes
can receive packaged plugin updates.
_Avoid_: vendored plugin, automatic compatibility

**Native External Installer**:
The installation path published and supported by an external project. The
marketplace documents this path instead of creating a wrapper.
_Avoid_: catalog workaround, generated adapter

**Canonical Catalog**:
The hand-edited `.agents/plugins/marketplace.json` file. It records local
paths and external Git sources in native marketplace forms.
_Avoid_: entry file, private catalog model

**Generated Client Catalog**:
Either `.github/plugin/marketplace.json` or
`.claude-plugin/marketplace.json`. It is a deterministic projection of the
Canonical Catalog and must not be edited by hand.
_Avoid_: second source of truth

**Frozen Skill Copy**:
An intentionally stored skill whose source text, license, source repository,
path, and copied commit are recorded in `THIRD_PARTY_NOTICES.md`. A scheduled
job proposes source updates for review.
_Avoid_: maintained external reference

## Current scope

- `kaleb-skills` is the only Local Stored Plugin. Its catalog entry tracks this
  repository's `main` branch for package updates; its copied skills remain
  frozen until changed in this repository.
- Humanizer, Visual Explainer, and i-have-adhd are Maintained External Plugin
  References.
- Matt Pocock's published plugin follows his upstream branch and currently
  supplies the 27 skills in his manifest.
- Impeccable is documented through its Native External Installer.
- Client catalogs preserve each upstream plugin's native package layout.
