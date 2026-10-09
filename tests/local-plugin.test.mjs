import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const expectedBroSkill = `---
name: bro
description: Restate the last message in plain human language, with no jargon.
disable-model-invocation: true
---

Restate your last message. Stop using jargon and speak coherently. State it more simply and concisely, like one human talking to another.
`;

const expectedMakeThisClearSkill = `---
name: make-this-clear
description: Rewrite a message from the recipient's perspective, assuming they have no prior context.
disable-model-invocation: true
---

Rubber duck this message from the perspective of the person receiving it. Assume they have no context from our conversation. Add what they need to know, make the request clear, and do not invent facts. Invoke \`/humanizer\` to make it clear and natural. Return only the ready-to-send message.
`;

const expectedSkillGrill = `---
name: skill-grill
description: Grill the user on creating or improving a skill, then build and dogfood it through a dedicated child session.
disable-model-invocation: true
---

Run a session using the \`grilling\` skill from \`mattpocock-skills\` and \`/skill-creator\` to reach a shared understanding of the skill the user wants to create or improve.

When the shared understanding is confirmed:

1. Create one dedicated child session to implement the skill. Use a project worktree when a repository owns the target skill. Otherwise, use the user skill location. Send the child a concise packet with the settled requirements, examples, target location, and relevant context.
2. Tell the child to use \`/skill-creator\` to create or improve the skill.
3. When the child reports that the skill is ready, test it live with the user in the parent session. Ask for confirmation before any consequential action.
4. Wait until the user gives clear feedback. Send the feedback and evidence to the same child session. Ask it to update the skill.
5. Repeat the live test and revision loop until the user accepts the result. Do not use a fixed iteration limit.
6. Ask the child to perform final validation with \`/skill-creator\`.
7. Ask the user whether to commit the changes and create or update a pull request.

Keep implementation work in the child session. Keep the live test and user feedback in the parent session.
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

const obsidianSkillFiles = new Map([
  [
    "obsidian-cli/SKILL.md",
    "b54257cdc0e5d04488b35b0c797bfe427b24359f0848d3c73924dcacf8da6358",
  ],
  [
    "obsidian-markdown/SKILL.md",
    "7ad72e1f0a9081ed325e76b6402ad5de50a00e63e2341fd403a92f147234a007",
  ],
  [
    "obsidian-markdown/references/CALLOUTS.md",
    "9912ec2e3f8711f65b8ceb82cc19cbffc5e6f8ccf2ab627e18926c522c383d8b",
  ],
  [
    "obsidian-markdown/references/EMBEDS.md",
    "63b6205507e28fb58cf200bc348a2b139e50ae739743e2e6316732148973cb7a",
  ],
  [
    "obsidian-markdown/references/PROPERTIES.md",
    "392953b5838c3ab3df135b5a914f100ae7b95e4501b6a2e5c8dc63da3ac7558b",
  ],
]);

function parseFrontmatter(document) {
  const match = document.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "skill file must begin with YAML frontmatter");
  return yaml.load(match[1]);
}

test("kaleb-skills plugin ships the frozen reviewed skills and notices", async () => {
  const skillDirectories = (await readdir(skillRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(skillDirectories, [
    "bro",
    "make-this-clear",
    "obsidian-cli",
    "obsidian-markdown",
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
  assert.equal(
    (notices.match(/3ccff5338ea700537839b21900aa5358a0402c98/g) ?? []).length,
    2,
  );
  assert.match(notices, /Copyright \(c\) 2026 Steph Ango \(@kepano\)/);
  assert.match(notices, /references\/CALLOUTS\.md/);
  assert.match(notices, /references\/EMBEDS\.md/);
  assert.match(notices, /references\/PROPERTIES\.md/);

  const license = await readFile(path.join(pluginRoot, "LICENSE"), "utf8");
  assert.equal(license, expectedLicense);

  const expectedSkills = new Map([
    ["bro", expectedBroSkill],
    ["make-this-clear", expectedMakeThisClearSkill],
    ["skill-grill", expectedSkillGrill],
  ]);
  const expectedDescriptions = new Map([
    [
      "obsidian-cli",
      "Interact with Obsidian vaults using the Obsidian CLI to read, create, search, and manage notes, tasks, properties, and more. Also supports plugin and theme development with commands to reload plugins, run JavaScript, capture errors, take screenshots, and inspect the DOM. Use when the user asks to interact with their Obsidian vault, manage notes, search vault content, perform vault operations from the command line, or develop and debug Obsidian plugins and themes.",
    ],
    [
      "obsidian-markdown",
      "Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Use when working with .md files in Obsidian, or when the user mentions wikilinks, callouts, frontmatter, tags, embeds, or Obsidian notes.",
    ],
    [
      "skill-creator",
      "Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.",
    ],
  ]);

  for (const directoryName of skillDirectories) {
    const skillDocument = await readFile(
      path.join(skillRoot, directoryName, "SKILL.md"),
      "utf8",
    );
    const frontmatter = parseFrontmatter(skillDocument);

    assert.equal(frontmatter.name, directoryName);
    assert.ok(frontmatter.description);
    if (expectedSkills.has(directoryName)) {
      assert.equal(skillDocument, expectedSkills.get(directoryName));
    } else {
      assert.equal(
        frontmatter.description,
        expectedDescriptions.get(directoryName),
      );
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
  assert.deepEqual(actualObsidianFiles, [...obsidianSkillFiles.keys()].sort());

  assert.deepEqual(
    await readdir(path.join(skillRoot, "skill-grill")),
    ["SKILL.md"],
  );

  for (const [relativePath, expectedHash] of obsidianSkillFiles) {
    const content = await readFile(path.join(skillRoot, relativePath));
    assert.equal(
      createHash("sha256").update(content).digest("hex"),
      expectedHash,
      `${relativePath} must match the reviewed upstream content`,
    );
  }
});

test("skill-grill keeps model invocation disabled and omits user-invocable", async () => {
  const skillDocument = await readFile(
    path.join(skillRoot, "skill-grill", "SKILL.md"),
    "utf8",
  );
  const frontmatter = parseFrontmatter(skillDocument);

  assert.equal(frontmatter.name, "skill-grill");
  assert.equal(frontmatter["disable-model-invocation"], true);
  assert.equal("user-invocable" in frontmatter, false);
});
