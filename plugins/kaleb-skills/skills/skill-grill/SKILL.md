---
name: skill-grill
description: Grill a skill idea, delegate implementation, and dogfood it until the user accepts it.
disable-model-invocation: true
---

Invoke `/mattpocock-skills:grilling` and `/skill-creator` in the parent session.

The parent owns grilling, dogfooding, and user feedback. One dedicated child owns implementation and validation.

1. Create the child with `create_session`. Use a project worktree when a repository owns the skill; otherwise use the user skill location. Send the confirmed requirements and applicable repository instructions.
2. Tell the child to invoke `/skill-creator`, implement the skill, and report when it is ready to dogfood.
3. Dogfood the result in the parent on the user's real task. Collect explicit acceptance or specific feedback with evidence.
4. Send feedback to the same child. Have it revise with `/skill-creator`, then dogfood again. Repeat until the user accepts the result.
5. Have the child run final `/skill-creator` validation and report that it passes.
6. Ask the user to approve committing the changes and creating or updating a pull request.

Finish when the user has accepted the skill, final validation passes, and the user has decided whether to publish the changes.
