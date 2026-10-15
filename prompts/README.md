# Prompt Library

These prompts are human-readable setup aids, not executable configuration.
They keep client-specific details out of the canonical marketplace catalog and
make the safety boundary explicit before a user enables automation.

## Codex

- [Audit the marketplace](codex/audit-marketplace.md) — inspect local state
  without changing anything.
- [Create a scheduled sync](codex/scheduled-sync.md) — create a quiet, bounded
  daily Codex automation after the audit behaves as expected.

Each prompt is intentionally limited to `kaleb-marketplace`. Review installed
plugin content, hook requests, and permission changes separately; no prompt
authorizes bypassing a client's approval or sandbox controls.
