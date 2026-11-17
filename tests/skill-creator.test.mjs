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

test("skill-creator delegates routine tests and retains consequential-action approval and result review", async () => {
  const document = await readText(path.join(skillRoot, "SKILL.md"));
  assert.ok(document.includes("Choose tests when outputs or workflow steps are objectively checkable."));
  assert.ok(document.includes("Skip formal tests when the user requests a draft-only or informal session."));
  assert.ok(document.includes("Do not ask the user to choose routine validation steps."));
  assert.ok(document.includes("Select the cases and run isolated tests without asking the user to approve them."));
  assert.ok(document.includes("do not pause for a response."));
  assert.ok(document.includes("Ask a question only when an unresolved requirement would change the expected result."));
  assert.ok(document.includes("Follow applicable approval rules if a test needs live uploads, external changes, or other consequential actions."));
  assert.ok(!document.includes("Suggest a default, let the user decide."));
  assert.ok(!document.includes("here are the tests I want to run, look right?"));
  assert.ok(document.includes("Ask about unresolved edge cases, inputs, example files, success criteria and dependencies"));
  assert.ok(document.includes('{"skill_name": "example-skill", "evals": [{"id": 1, "prompt": "...", "expected_output": "...", "files": []}]}'));
  assert.ok(document.includes("Ask for feedback per test."));
  assert.ok(document.includes("a test with no feedback is not reviewed"));
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
  assert.ok(document.includes("Before editing, copy the existing skill folder."));
  assert.ok(document.includes("Skip numerical comparisons."));
  assert.ok(document.includes("a test with no feedback is not reviewed"));
  assert.ok(document.includes("Empty feedback alone does not stop the loop."));
  assert.ok(!document.includes("silence on a test means it's fine"));
  assert.ok(!document.includes("less rigorous"));
  assert.ok(document.includes("Present results in the conversation:"));
  assert.ok(!/\bcanvas\b/i.test(document));
  assert.ok(!/\bbots?\b/i.test(document));
  assert.ok(!/\bhost\b/i.test(document));
  assert.ok(document.includes("1-64 characters"));
  assert.ok(document.includes("1-1024 characters"));
  assert.ok(document.includes("1-500 characters"));
  assert.ok(document.includes("allowed-tools"));
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

    const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
    await run(python, [
      "-B", "-c", "import sys; sys.exit('Python 3.10 or later is required' if sys.version_info < (3, 10) else 0)",
    ]);
    await run(python, [
      "-B", "-m", "scripts.aggregate_benchmark", workspace, "--skill-name", "fixture-skill",
    ], { cwd: skillRoot });
    const benchmark = JSON.parse(await readFile(path.join(workspace, "benchmark.json"), "utf8"));
    assert.equal(benchmark.runs.length, 2);
    assert.equal(benchmark.run_summary.with_skill.pass_rate.mean, 1);
    assert.equal(benchmark.run_summary.without_skill.pass_rate.mean, 0);
    assert.equal(benchmark.runs[0].eval_id, 7);
    assert.deepEqual(
      await listFiles(skillRoot),
      (await provenance()).files.sort(),
      "benchmark execution must not add bytecode or other files to the stored skill",
    );
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
