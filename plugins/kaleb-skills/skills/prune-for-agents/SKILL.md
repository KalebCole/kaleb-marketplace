---
name: prune-for-agents
description: Prune an agent-facing document and propose a lean replacement.
disable-model-invocation: true
---

Invoke `/mattpocock-skills:writing-for-agents`.

Apply its pruning guidance to the target document. Identify duplication, no-ops, sediment, unnecessary context, weak leading words, scattered concepts, and instructions that restate the environment.

Return:

1. A concise pruning analysis
2. The complete proposed replacement

Preserve the document's purpose and required behavior. Make no changes until the user accepts the proposal.
