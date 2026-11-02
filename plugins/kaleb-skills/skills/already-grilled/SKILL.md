---
name: already-grilled
description: Recover decisions from earlier sessions before a user asks to be grilled again. Use when the current topic may have prior discussion, the user wants to continue or stress-test an existing plan, or grilling should not repeat settled questions. Brief the user on what is already established, then invoke the `grilling` skill only for the open and uncertain frontier.
---

# Already Grilled

Recover prior decisions before starting another grilling pass.

## Find the relevant history

1. Identify the current goal and topic.
2. Search session history with `session_store_sql`.
3. Inspect a session explicitly linked to the current work first.
4. If that is insufficient, search recent related sessions. Start with the last 7 days and exact references or distinctive terms. Widen the time range only when needed.
5. Read the relevant conversation turns, not only session summaries.

If no relevant history exists, tell the user that no prior discussion was found. Then invoke the `grilling` skill normally.

## Classify prior decisions

Classify each relevant point:

- **Settled:** The user stated the decision or accepted an assistant proposal.
- **Open:** The discussion explicitly left the point unresolved.
- **Uncertain:** The evidence is incomplete, conflicting, or only an assistant proposal that the user did not accept.

Do not treat repetition, silence, or an assistant recommendation as user acceptance. Prior discussion supplies context, not authorization for a new action.

## Brief the user

Before invoking `grilling`, give a concise briefing with these headings. Omit any empty section:

### Already established

### Still open

### Needs confirmation

Keep the briefing factual. Preserve meaningful uncertainty and disagreement.

## Continue the grilling

Invoke the Skill tool with `grilling`.
