import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(repoRoot, "plugins", "kaleb-skills");
const skillRoot = path.join(pluginRoot, "skills", "skill-creator");
const run = promisify(execFile);

async function readText(file) {
  return (await readFile(file, "utf8")).replaceAll("\r\n", "\n");
}

async function provenance() {
  const notices = await readText(path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"));
  const section = notices.split("## `skill-creator`\n")[1]?.split(/\n## /)[0];
  assert.ok(section, "skill-creator must have its own provenance section");
  const commit = section.match(/Reviewed commit: `([0-9a-f]{40})`/)?.[1];
  assert.ok(commit, "skill-creator must record its source commit");
  const files = [...section.matchAll(/^  - `skills\/skill-creator\/([^`]+)`$/gm)]
    .map((match) => match[1]);
  assert.ok(files.length > 0, "skill-creator must list its copied files");
  return { section, commit, files };
}

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

test("skill-creator files match the recorded source inventory", async () => {
  const { files } = await provenance();
  assert.deepEqual(await listFiles(skillRoot), files.sort());
});

test("skill-creator keeps valid invocation metadata", async () => {
  const document = await readText(path.join(skillRoot, "SKILL.md"));
  const match = document.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "skill must begin with YAML frontmatter");
  const metadata = yaml.load(match[1]);
  assert.equal(metadata.name, "skill-creator");
  assert.ok(metadata.description);
});

test("skill-creator reviews in chat and keeps unreferenced support files importable", async () => {
  const { files } = await provenance();
  const reviewedFiles = new Set(files);
  const document = await readText(path.join(skillRoot, "SKILL.md"));
  const supportReferences = [
    ...document.matchAll(/`((?:agents|references|assets)\/[^`]+\.(?:md|html|py))`/g),
  ].map((match) => match[1]);
  assert.deepEqual(supportReferences, []);

  const moduleCommands = [
    ...document.matchAll(/python -m (scripts\.[a-z_]+)/g),
  ].map((match) => match[1]);
  assert.deepEqual(moduleCommands, []);

  for (const file of [...reviewedFiles].filter((file) => file.endsWith(".py"))) {
    const source = await readText(path.join(skillRoot, file));
    for (const match of source.matchAll(/^from (scripts\.[a-z_]+) import /gm)) {
      assert.ok(
        reviewedFiles.has(`${match[1].replaceAll(".", "/")}.py`),
        `${file} import ${match[1]} must resolve within the skill`,
      );
    }
  }

  const review = await readText(path.join(skillRoot, "assets/eval_review.html"));
  for (const placeholder of [
    "__EVAL_DATA_PLACEHOLDER__",
    "__SKILL_NAME_PLACEHOLDER__",
    "__SKILL_DESCRIPTION_PLACEHOLDER__",
  ]) {
    assert.ok(review.includes(placeholder), `${placeholder} must remain in the template`);
  }
  for (const retained of [
    "agents/analyzer.md",
    "agents/comparator.md",
    "agents/grader.md",
    "assets/eval_review.html",
    "references/schemas.md",
    "scripts/aggregate_benchmark.py",
    "scripts/generate_report.py",
    "scripts/improve_description.py",
    "scripts/package_skill.py",
    "scripts/quick_validate.py",
    "scripts/run_eval.py",
    "scripts/run_loop.py",
  ]) {
    assert.ok(reviewedFiles.has(retained), `${retained} must remain in the inventory`);
  }
  assert.ok(document.includes("agentskills.io"));
  assert.ok(document.includes("### What a skill is not"));
  assert.ok(document.includes("### Pruning"));
  assert.ok(document.includes("## 8. Pruning review"));
  assert.ok(document.includes("Present results in the conversation (no canvas)"));
  assert.ok(!document.includes("skill-eval-review"));
  assert.ok(!document.includes("eval_review.html"));
  assert.ok(!document.includes("eval-viewer/generate_review.py"));
  assert.ok(!document.includes("scripts.aggregate_benchmark"));
  assert.ok(!document.includes("python -m scripts.run_loop"));
});

test("skill-creator benchmark aggregator supports the documented single-run layout", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "skill-creator-benchmark-"));
  try {
    const evalDir = path.join(workspace, "eval-table-cleanup");
    await mkdir(path.join(evalDir, "with_skill"), { recursive: true });
    await mkdir(path.join(evalDir, "without_skill"), { recursive: true });
    await writeFile(path.join(evalDir, "eval_metadata.json"), JSON.stringify({
      eval_id: 7,
      eval_name: "table-cleanup",
      prompt: "Clean this table",
      assertions: [],
    }));
    const grading = (passed) => JSON.stringify({
      expectations: [{ text: "Output exists", passed, evidence: "fixture" }],
      summary: { passed: passed ? 1 : 0, failed: passed ? 0 : 1, total: 1, pass_rate: passed ? 1 : 0 },
      timing: { total_duration_seconds: passed ? 2 : 3 },
    });
    await writeFile(path.join(evalDir, "with_skill", "grading.json"), grading(true));
    await writeFile(path.join(evalDir, "without_skill", "grading.json"), grading(false));

    await run("python", [
      "-m", "scripts.aggregate_benchmark", workspace, "--skill-name", "fixture-skill",
    ], { cwd: skillRoot });
    const benchmark = JSON.parse(await readFile(path.join(workspace, "benchmark.json"), "utf8"));
    assert.equal(benchmark.runs.length, 2);
    assert.equal(benchmark.run_summary.with_skill.pass_rate.mean, 1);
    assert.equal(benchmark.run_summary.without_skill.pass_rate.mean, 0);
    assert.equal(benchmark.runs[0].eval_id, 7);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("skill-creator records exact provenance and its directory-specific license", async () => {
  const { section, commit, files } = await provenance();
  for (const text of [
    "Source repository: `https://github.com/anthropics/skills`",
    `Reviewed commit: \`${commit}\``,
    "Original source path: `skills/skill-creator/`",
    `https://github.com/anthropics/skills/tree/${commit}/skills/skill-creator`,
    "Reviewed license path: `skills/skill-creator/LICENSE.txt`",
    "Copyright 2026 Anthropic, PBC.",
    "Apache-2.0",
    "Automated source updates: `disabled`",
    "locally maintained, platform-agnostic",
    "reviews results in the conversation",
    "does not open a review canvas",
    "single-run evaluation layout",
    "browser-server",
    ".github/extensions/skill-eval-review/",
    "unused by `SKILL.md`",
    "Python 3.10",
    "PyYAML",
    "claude -p",
    "Google Fonts",
    "requests no external",
  ]) {
    assert.ok(section.includes(text), `provenance must include ${text}`);
  }
  for (const file of files) {
    assert.ok(section.includes(`\`skills/skill-creator/${file}\``), `${file} must be documented`);
  }

  const license = await readText(path.join(skillRoot, "LICENSE.txt"));
  assert.match(license, /Apache License\s+Version 2\.0, January 2004/);
  assert.ok(license.includes("Copyright 2026 Anthropic, PBC."));
  assert.ok(license.includes("4. Redistribution."));
  const manifest = JSON.parse(await readFile(path.join(pluginRoot, "plugin.json"), "utf8"));
  assert.equal(manifest.license, "MIT AND Apache-2.0");
});

test("skill-creator canvas extension package is complete", async () => {
  const extensionRoot = path.join(repoRoot, ".github", "extensions", "skill-eval-review");
  assert.deepEqual(await listFiles(extensionRoot), [
    "extension.mjs",
    "review-model.mjs",
    "review-server.mjs",
    "review.html",
  ]);
  const extension = await readText(path.join(extensionRoot, "extension.mjs"));
  assert.ok(extension.includes('id: "skill-eval-review"'));
  assert.ok(extension.includes("createCanvas"));
  assert.ok(extension.includes("joinSession"));
  assert.ok(extension.includes("evaluationId"));
  assert.ok(extension.includes("workspacePath"));
});
