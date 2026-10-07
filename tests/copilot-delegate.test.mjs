import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(repoRoot, "plugins", "kaleb-skills");
const skillRoot = path.join(pluginRoot, "skills", "copilot-delegate");
const upstreamCommit = "6826b363085dcc80875372315fe7d208c4bf733f";
const reviewedFiles = new Map([
  ["SKILL.md", "7f5040cda1a0c50a6a7b15033ce20d30d898778c59696b0983c2868df45b3009"],
  ["references/dispatch-and-poll.md", "66f3bf924153ffbfd6429333e4d6f40de48384a0433e5cc67acf6a7c5665a712"],
  ["references/multi-task-queues.md", "05488efeaa0e320324756ecbfe1d09477755bba60458ca642e91e4da24056fb9"],
  ["references/review-and-land.md", "2392f3262ab471e5e1fa1b2c4a926c7a09d0e0729f9a16c1f82f9a040f18401b"],
  ["references/writing-the-brief.md", "b9736527ed58e75e955d6c10755fe28f2f6f5c6548e3044728132b289575a258"],
  ["scripts/relay.mjs", "d875e18aba976575e7f08f1c470c8319546f9ea73b14c28a245ae3c1ab478ae3"],
]);
const upstreamLicense = `MIT License

Copyright (c) 2026 Ahmed Mohammed (amElnagdy)

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
SOFTWARE.`;

async function listFiles(directory, relative = "") {
  const files = await Promise.all(
    (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
      const relativePath = path.posix.join(relative, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(absolutePath, relativePath);
      }
      assert.ok(entry.isFile(), `${relativePath} must be a regular file`);
      return [relativePath];
    }),
  );
  return files.flat().sort();
}

function parseFrontmatter(document) {
  const match = document.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "skill file must begin with YAML frontmatter");
  return yaml.load(match[1]);
}

test("copilot-delegate preserves the complete reviewed upstream directory", async () => {
  assert.deepEqual(await listFiles(skillRoot), [...reviewedFiles.keys()].sort());
  await Promise.all(
    [...reviewedFiles].map(async ([file, expectedHash]) => {
      let content = await readFile(path.join(skillRoot, file));
      if (file === "SKILL.md") {
        const sourceText = content.toString();
        assert.equal(
          sourceText.match(/^disable-model-invocation: true\n/gm)?.length,
          1,
          "SKILL.md must contain exactly one local invocation setting",
        );
        content = Buffer.from(sourceText.replace(
          /^disable-model-invocation: true\n/m,
          "",
        ));
      }
      assert.equal(
        createHash("sha256").update(content).digest("hex"),
        expectedHash,
        `${file} must match the reviewed upstream content`,
      );
    }),
  );
});

test("copilot-delegate preserves its invocation metadata and bundled references", async () => {
  const document = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.deepEqual(parseFrontmatter(document), {
    name: "copilot-delegate",
    description:
      "Delegate a coding task to the GitHub Copilot CLI (`copilot`) as a background implementer, then review its diff and land it yourself. Use this whenever the user wants to delegate implementation work to Copilot - phrasings like \"have Copilot implement X\", \"delegate this to copilot\", \"run it through Copilot CLI\", or \"use copilot to implement/fix/refactor\" - or wants to run a queue of coding tasks through Copilot while staying the reviewer. DO NOT USE for tasks small enough to do inline, or when the user wants the code written directly without delegating.",
    license: "MIT",
    compatibility:
      "Requires the `copilot` CLI installed and authenticated (`copilot login`), Node 18+ to run the relay (the copilot CLI itself requires Node 22+), and git. The orchestrator must be able to run shell commands and read files.",
    "disable-model-invocation": true,
    metadata: { version: "0.5.0" },
  });

  const relativeLinks = [
    ...new Set(
      [...document.matchAll(/\]\((?!https?:\/\/)([^)]+)\)/g)].map((match) => match[1]),
    ),
  ];
  assert.deepEqual(relativeLinks.sort(), [
    "references/dispatch-and-poll.md",
    "references/multi-task-queues.md",
    "references/review-and-land.md",
    "references/writing-the-brief.md",
  ]);
  for (const reference of relativeLinks) {
    assert.ok(reviewedFiles.has(reference), `${reference} must be bundled`);
    assert.ok(
      (await stat(path.join(skillRoot, reference))).isFile(),
      `${reference} must exist`,
    );
  }
});

test("copilot-delegate records exact provenance, license, and optional dependency limit", async () => {
  const notices = await readFile(path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  const section = notices.split("## `copilot-delegate`\n")[1]?.split(/\n## /)[0];
  assert.ok(section, "copilot-delegate must have its own provenance section");
  for (const text of [
    "https://github.com/amElnagdy/delegate-skills",
    `Reviewed commit: \`${upstreamCommit}\``,
    "Original source directory: `skills/copilot-delegate/`",
    `https://github.com/amElnagdy/delegate-skills/tree/${upstreamCommit}/skills/copilot-delegate`,
    "Reviewed license path: `LICENSE`",
    "Copyright (c) 2026 Ahmed Mohammed (amElnagdy)",
    "License status: MIT",
    "The references linked by `SKILL.md` are included",
    "`disable-model-invocation: true` was added to `SKILL.md`",
    "delegate-setup/scripts/lane.mjs",
    "`--lane` is unavailable",
    ...[...reviewedFiles.keys()].map((file) => `\`skills/copilot-delegate/${file}\``),
  ]) {
    assert.ok(section.includes(text), `provenance must include ${text}`);
  }

  const pluginLicense = await readFile(path.join(pluginRoot, "LICENSE"), "utf8");
  assert.ok(pluginLicense.includes(upstreamLicense));
});
