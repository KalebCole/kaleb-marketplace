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

const expectedGrillingSkill = `---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

\`\`\`
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
\`\`\`

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
`;

const expectedGrillMeSkill = `---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Call the Skill tool with "grilling".
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

Run a \`/grilling\` session using \`/skill-creator\` to reach a shared understanding of the skill the user wants to create or improve.

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
    "grill-me",
    "grilling",
    "make-this-clear",
    "obsidian-cli",
    "obsidian-markdown",
    "skill-creator",
    "skill-grill",
    "wizard",
  ]);

  const manifest = JSON.parse(await readFile(path.join(pluginRoot, "plugin.json"), "utf8"));
  assert.equal(manifest.$schema, AGENT_PLUGIN_SCHEMA);
  assert.equal(manifest.name, "kaleb-skills");

  const notices = await readFile(path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert.match(notices, /dmmulroy\/skills/);
  assert.match(notices, /8603380821fee6a77c82639f364ce8fe4f5a92be/);
  assert.match(notices, /mattpocock\/skills/);
  assert.match(notices, /d81f3a183412e71a5b1e84ca21bc1a35eea03a60/);
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
    ["grill-me", expectedGrillMeSkill],
    ["grilling", expectedGrillingSkill],
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
    } else if (directoryName !== "wizard") {
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

test("Wizard preserves the complete frozen source, invocation settings, and provenance", async () => {
  const wizardRoot = path.join(skillRoot, "wizard");
  const expectedFiles = new Map([
    ["SKILL.md", "bdf31d48211ea559878f95a4f344aeabf8d85897488ba564382bab0b000daac1"],
    ["template.sh", "33cbe9dfb1d0e9185b60248a52aabed14bc64785a00cac695e302e739dd6c153"],
    ["agents/openai.yaml", "98f44d682d58e262f160dc59a8befc365e0aa65820dd0261864af26aa8e59d83"],
  ]);
  assert.deepEqual((await readdir(wizardRoot)).sort(), ["SKILL.md", "agents", "template.sh"]);
  assert.deepEqual(await readdir(path.join(wizardRoot, "agents")), ["openai.yaml"]);
  for (const [relativePath, expectedHash] of expectedFiles) {
    const content = await readFile(path.join(wizardRoot, relativePath));
    assert.equal(
      createHash("sha256").update(content).digest("hex"),
      expectedHash,
      `wizard/${relativePath} must match the reviewed upstream content`,
    );
  }

  const document = await readFile(path.join(wizardRoot, "SKILL.md"), "utf8");
  assert.deepEqual(parseFrontmatter(document), {
    name: "wizard",
    description: "Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.",
  });
  const agentMetadata = yaml.load(
    await readFile(path.join(wizardRoot, "agents", "openai.yaml"), "utf8"),
  );
  assert.deepEqual(agentMetadata, {
    interface: {
      display_name: "Wizard",
      short_description: "Generate an interactive setup wizard",
    },
  });
  const relativeLinks = [...document.matchAll(/\]\((?!https?:\/\/)([^)]+)\)/g)]
    .map((match) => match[1]);
  assert.deepEqual(relativeLinks, ["template.sh"]);
  for (const relativePath of relativeLinks) {
    assert.ok(expectedFiles.has(relativePath), `${relativePath} must be included`);
  }

  const notices = await readFile(path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  const wizardNotice = notices.split("## `wizard`\n")[1]?.split("\n## ")[0];
  assert.ok(wizardNotice, "Wizard must have its own provenance notice");
  for (const expected of [
    "https://github.com/mattpocock/skills",
    "d81f3a183412e71a5b1e84ca21bc1a35eea03a60",
    "skills/engineering/wizard/",
    "Reviewed license path: `LICENSE`",
    "Copyright (c) 2026 Matt Pocock",
    "License status: MIT",
    ...[...expectedFiles.keys()].map((file) => `skills/wizard/${file}`),
  ]) {
    assert.ok(wizardNotice.includes(expected), `Wizard notice must include ${expected}`);
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
