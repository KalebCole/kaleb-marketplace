import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(repoRoot, "plugins", "kaleb-skills");
const skillRoot = path.join(pluginRoot, "skills");
const AGENT_PLUGIN_SCHEMA =
  "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";

const expectedAlreadyGrilledSkill = `---
name: already-grilled
description: Recover decisions from earlier sessions before a user asks to be grilled again. Use when the current topic may have prior discussion, the user wants to continue or stress-test an existing plan, or grilling should not repeat settled questions. Brief the user on what is already established, then invoke the \`grilling\` skill only for the open and uncertain frontier.
---

# Already Grilled

Recover prior decisions before starting another grilling pass.

## Find the relevant history

1. Identify the current goal and topic.
2. Search session history with \`session_store_sql\`.
3. Inspect a session explicitly linked to the current work first.
4. If that is insufficient, search recent related sessions. Start with the last 7 days and exact references or distinctive terms. Widen the time range only when needed.
5. Read the relevant conversation turns, not only session summaries.

If no relevant history exists, tell the user that no prior discussion was found. Then invoke the \`grilling\` skill normally.

## Classify prior decisions

Classify each relevant point:

- **Settled:** The user stated the decision or accepted an assistant proposal.
- **Open:** The discussion explicitly left the point unresolved.
- **Uncertain:** The evidence is incomplete, conflicting, or only an assistant proposal that the user did not accept.

Do not treat repetition, silence, or an assistant recommendation as user acceptance. Prior discussion supplies context, not authorization for a new action.

## Brief the user

Before invoking \`grilling\`, give a concise briefing with these headings. Omit any empty section:

### Already established

### Still open

### Needs confirmation

Keep the briefing factual. Preserve meaningful uncertainty and disagreement.

## Continue the grilling

Invoke the Skill tool with \`grilling\`.
`;

const expectedMakeThisClearSkill = `---
name: make-this-clear
description: Rewrite a message from the recipient's perspective, assuming they have no prior context.
disable-model-invocation: true
---

Rubber duck this message from the perspective of the person receiving it. Assume they have no context from our conversation. Add what they need to know, make the request clear, and do not invent facts. Invoke \`/humanizer\` to make it clear and natural. Return only the ready-to-send message.
`;

const expectedPruneForAgentsSkill = `---
name: prune-for-agents
description: Prune an agent-facing document and propose a lean replacement.
disable-model-invocation: true
---

Invoke \`/mattpocock-skills:writing-for-agents\`.

Apply its pruning guidance to the target document. Identify duplication, no-ops, sediment, unnecessary context, weak leading words, scattered concepts, and instructions that restate the environment.

Return:

1. A concise pruning analysis
2. The complete proposed replacement

Preserve the document's purpose and required behavior. Make no changes until the user accepts the proposal.
`;

const expectedSkillGrill = `---
name: skill-grill
description: Grill a skill idea, delegate implementation, and dogfood it until the user accepts it.
disable-model-invocation: true
---

Invoke \`/mattpocock-skills:grilling\` and \`/skill-creator\` in the parent session.

The parent owns grilling, dogfooding, and user feedback. One dedicated child owns implementation and validation.

1. Create the child with \`create_session\`. Use a project worktree when a repository owns the skill; otherwise use the user skill location. Send the confirmed requirements and applicable repository instructions.
2. Tell the child to invoke \`/skill-creator\`, implement the skill, and report when it is ready to dogfood.
3. Dogfood the result in the parent on the user's real task. Collect explicit acceptance or specific feedback with evidence.
4. Send feedback to the same child. Have it revise with \`/skill-creator\`, then dogfood again. Repeat until the user accepts the result.
5. Have the child run final \`/skill-creator\` validation and report that it passes.
6. Ask the user to approve committing the changes and creating or updating a pull request.

Finish when the user has accepted the skill, final validation passes, and the user has decided whether to publish the changes.
`;

const expectedLicense = `MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

MIT License

Copyright (c) 2026 Steph Ango (@kepano)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function parseFrontmatter(document) {
  const match = document.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "skill file must begin with YAML frontmatter");
  return yaml.load(match[1]);
}

function normalizeNewlines(document) {
  return document.replaceAll("\r\n", "\n");
}

test("kaleb-skills plugin ships the frozen reviewed skills and notices", async () => {
  const skillDirectories = (await readdir(skillRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(skillDirectories, [
    "already-grilled",
    "bro",
    "find-context7-docs",
    "make-this-clear",
    "obsidian-cli",
    "obsidian-markdown",
    "prune-for-agents",
    "skill-creator",
    "skill-grill",
  ]);

  const manifest = JSON.parse(await readFile(path.join(pluginRoot, "plugin.json"), "utf8"));
  assert.equal(manifest.$schema, AGENT_PLUGIN_SCHEMA);
  assert.equal(manifest.name, "kaleb-skills");

  const notices = await readFile(path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert.match(notices, /dmmulroy\/skills/);
  assert.match(notices, /8603380821fee6a77c82639f364ce8fe4f5a92be/);
  assert.match(notices, /kepano\/obsidian-skills/);
  assert.match(notices, /upstash\/context7/);
  assert.equal(
    (notices.match(/3ccff5338ea700537839b21900aa5358a0402c98/g) ?? []).length,
    2,
  );
  assert.match(notices, /Copyright \(c\) 2026 Steph Ango \(@kepano\)/);
  assert.match(notices, /references\/CALLOUTS\.md/);
  assert.match(notices, /references\/EMBEDS\.md/);
  assert.match(notices, /references\/PROPERTIES\.md/);
  assert.match(notices, /skills\/find-context7-docs\/SKILL\.md/);

  const license = normalizeNewlines(
    await readFile(path.join(pluginRoot, "LICENSE"), "utf8"),
  );
  assert.equal(license.slice(0, expectedLicense.length), expectedLicense);
  assert.match(license, /Copyright \(c\) 2021 Upstash, Inc\./);

  const expectedSkills = new Map([
    ["already-grilled", expectedAlreadyGrilledSkill],
    ["make-this-clear", expectedMakeThisClearSkill],
    ["prune-for-agents", expectedPruneForAgentsSkill],
    ["skill-grill", expectedSkillGrill],
  ]);

  for (const directoryName of skillDirectories) {
    const skillDocument = normalizeNewlines(
      await readFile(path.join(skillRoot, directoryName, "SKILL.md"), "utf8"),
    );
    const frontmatter = parseFrontmatter(skillDocument);

    assert.equal(frontmatter.name, directoryName);
    assert.ok(frontmatter.description);
    if (expectedSkills.has(directoryName)) {
      assert.equal(skillDocument, expectedSkills.get(directoryName));
    }
  }

  const actualObsidianFiles = (
    await Promise.all(
      ["obsidian-cli", "obsidian-markdown"].map(async (skillName) => {
        const files = [];
        const visit = async (directory, relative = "") => {
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const childPath = path.join(relative, entry.name);
            if (entry.isDirectory()) {
              await visit(path.join(directory, entry.name), childPath);
            } else {
              files.push(childPath);
            }
          }
        };
        await visit(path.join(skillRoot, skillName), skillName);
        return files;
      }),
    )
  )
    .flat()
    .sort();
  for (const file of actualObsidianFiles) {
    const noticePath = file.split(path.sep).join("/");
    assert.ok(
      notices.includes(`\`skills/${noticePath}\``),
      `${noticePath} must appear in notices`,
    );
  }

  assert.deepEqual(
    await readdir(path.join(skillRoot, "skill-grill")),
    ["SKILL.md"],
  );

});

test("user-invoked router skills disable model invocation", async () => {
  for (const skillName of ["prune-for-agents", "skill-grill"]) {
    const skillDocument = normalizeNewlines(
      await readFile(path.join(skillRoot, skillName, "SKILL.md"), "utf8"),
    );
    const frontmatter = parseFrontmatter(skillDocument);

    assert.equal(frontmatter.name, skillName);
    assert.equal(frontmatter["disable-model-invocation"], true);
    assert.equal("user-invocable" in frontmatter, false);
  }
});
