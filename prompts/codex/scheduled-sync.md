# Create a scheduled Codex sync

Run the [audit prompt](audit-marketplace.md) first. This prompt creates a
local, desktop Codex task; it does not create a GitHub Action or modify the
marketplace repository.

## Copy-paste prompt

> Create a standalone Codex scheduled task named `Sync Kaleb Marketplace`.
> Run it every day at 9:15 AM in my local time, in the local project (not a
> worktree). On every run: (1) inspect the current installed plugins from
> `kaleb-marketplace`; (2) refresh only the Git-backed
> `kaleb-marketplace` catalog; (3) reconcile only plugins already installed
> from that marketplace to their current approved revision; (4) never install
> a newly added catalog entry, modify this repository, create commits, alter
> another marketplace, approve hooks, or change permissions; and (5) report
> only if a plugin changed, drift remains, or the run failed. If nothing needs
> attention, end with a one-line `in sync` status. Before any action requiring
> broader permissions, stop and report the exact action required.

## Notes

- This is a local-machine task: leave the desktop app running and the computer
  on at the scheduled time.
- Use the task's run history to review the first few executions.
- A new Codex session may be needed before updated skills become available.
- To use a different cadence, change only the schedule; keep the scope and
  safety boundaries in the saved task prompt.
