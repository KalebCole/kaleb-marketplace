import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { adaptSkillFile, sections, sourceDetails, updateSection } from "../scripts/sync-copied-skills.mjs";

const noticesPath = path.join(import.meta.dirname, "../plugins/kaleb-skills/THIRD_PARTY_NOTICES.md");

test("copied skill updater reads every upstream source from notices", async () => {
  const notices = await readFile(noticesPath, "utf8");
  const sources = sections(notices).map(sourceDetails);
  assert.deepEqual(sources.map(({ name }) => name), [
    "bro", "find-context7-docs", "skill-creator", "obsidian-cli", "obsidian-markdown",
  ]);
  assert.equal(sources[2].sourceDir, "skills/skill-creator");
  assert.equal(sources[1].sourceDir, "skills/find-docs");
  assert.equal(sources[1].sourceName, "find-docs");
  assert.equal(sources[1].branch, "master");
});

test("copied skill updater retains the local Context7 name", async () => {
  const notices = await readFile(noticesPath, "utf8");
  const source = sourceDetails(sections(notices)[1]);
  const input = Buffer.from("---\nname: find-docs\ndescription: Example\n---\nBody\n");
  assert.equal(
    adaptSkillFile("SKILL.md", input, source).toString(),
    "---\nname: find-context7-docs\ndescription: Example\n---\nBody\n",
  );
});

test("copied skill updater records a new commit and complete copied file list", async () => {
  const notices = await readFile(noticesPath, "utf8");
  const bro = sourceDetails(sections(notices)[0]);
  const next = updateSection(bro, "abcdefabcdefabcdefabcdefabcdefabcdefabcd", [
    "SKILL.md", "references/example.md",
  ]);

  assert.match(next, /Reviewed commit: `abcdefabcdefabcdefabcdefabcdefabcdefabcd`/);
  assert.match(next, /- Copied files:\n  - `skills\/bro\/SKILL.md`\n  - `skills\/bro\/references\/example.md`/);
  assert.doesNotMatch(next, /- Copied file: `skills\/bro\/SKILL.md`/);
});
