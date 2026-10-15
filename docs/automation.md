# Marketplace Automation

There are two deliberately separate update loops.

1. **Publisher loop:** this repository validates catalog changes on every pull
   request and `main` push. Its weekly copied-skill workflow creates a review
   pull request; it never merges a source update by itself. See
   [maintenance](maintenance.md).
2. **Client loop:** an installed client refreshes `kaleb-marketplace` and then
   loads the new revision in a new agent session. A repository cannot silently
   mutate someone else's machine.

Keeping these loops separate means the marketplace remains the reviewable,
version-controlled source of truth while client owners retain control over
what runs locally.

## Codex scheduled sync

For a personal Codex installation, use the
[scheduled-sync prompt](../prompts/codex/scheduled-sync.md) to create a daily
desktop automation. It is intentionally bounded to `kaleb-marketplace`: it
does not edit this repository, install newly listed plugins, update plugins
from another marketplace, or approve hooks and permissions.

Use an **audit-only** schedule first. After checking a few clean runs, choose
the sync prompt if you want the machine to refresh the marketplace. The Codex
desktop app must be running and the computer must be on for local scheduled
tasks. GitHub event tasks are not a substitute: they are limited to pull
request activity and do not run in the desktop Codex environment.

OpenAI's [Scheduled tasks documentation](https://learn.chatgpt.com/docs/automations)
explains task management, local-project execution, and permissions.

## Other clients

- **GitHub Copilot CLI:** register the marketplace once and set
  `autoUpdate: true` in the user's `extraKnownMarketplaces` settings. Copilot
  refreshes that marketplace at interactive session start. See
  [Copilot's plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).
- **Claude Code:** register the marketplace once and enable marketplace
  auto-update in the client's Marketplaces settings.

These mechanisms are client-specific. Successful validation or refresh in one
client is not evidence that another client installed the same version.

## Version policy

This marketplace intentionally tracks upstream `main` branches, so a refresh
can pick up a newer upstream revision. That favors personal, rolling updates.
Teams requiring a reviewed, reproducible release should change a catalog entry
to an immutable tag or commit SHA and advance that pin in a reviewed pull
request.
