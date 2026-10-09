---
name: skill-grill
description: Grill the user on creating or improving a skill, then build and dogfood it through a dedicated child session.
disable-model-invocation: true
---

Run a session using the `grilling` skill from `mattpocock-skills` and `/skill-creator` to reach a shared understanding of the skill the user wants to create or improve.

When the shared understanding is confirmed:

1. Create one dedicated child session to implement the skill. Use a project worktree when a repository owns the target skill. Otherwise, use the user skill location. Send the child a concise packet with the settled requirements, examples, target location, and relevant context.
2. Tell the child to use `/skill-creator` to create or improve the skill.
3. When the child reports that the skill is ready, test it live with the user in the parent session. Ask for confirmation before any consequential action.
4. Wait until the user gives clear feedback. Send the feedback and evidence to the same child session. Ask it to update the skill.
5. Repeat the live test and revision loop until the user accepts the result. Do not use a fixed iteration limit.
6. Ask the child to perform final validation with `/skill-creator`.
7. Ask the user whether to commit the changes and create or update a pull request.

Keep implementation work in the child session. Keep the live test and user feedback in the parent session.
