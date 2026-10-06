import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(repoRoot, "plugins", "kaleb-skills");
const skillRoot = path.join(pluginRoot, "skills", "skill-creator");
const upstreamCommit = "8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4";
const reviewedFiles = new Map([
  ["LICENSE.txt", "bc6b3af2f331cbc7fb0da1344efb2cbe5877a31498b4d70dbc7000f3405a1362"],
  ["SKILL.md", "dcd4803e61e913e6fc27294184cd3a71f09f5e924ff20c8a9a20173e7b3c2bcf"],
  ["agents/analyzer.md", "bf68f4cac5a56c673a928c2e6d619586c5b93ea364026ab37547772cb45a663a"],
  ["agents/comparator.md", "fe1fc9787c495d864c5d6eada47396478572325fde1b33a96d78bf4b849b7a3e"],
  ["agents/grader.md", "57134da0c1a4eea33fbd74a1c9c44aa814f07d6bc64de303edb586f941e5d21a"],
  ["assets/eval_review.html", "ce477dcc74dc1c0d1d3352646a79167b5a63634e936b1019160025065974e452"],
  ["eval-viewer/generate_review.py", "fc9d1b9243fe5ab6012ebd579bd76d0035de1b79fd3b969de114defab26478fb"],
  ["eval-viewer/viewer.html", "a53213426ee1100441d701a3a0d49cda7a842f992d2c36463f4d3cc0258575fa"],
  ["references/schemas.md", "8e8876180a8989b406a4d3edddf875b04cdfd5805cc8616686d552b11ce4455f"],
  ["scripts/__init__.py", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["scripts/aggregate_benchmark.py", "123ef128ea5ccc01a4b1ac212ef5567f21e9c13d3d240609780beeb3200c49aa"],
  ["scripts/generate_report.py", "13df7118a3c50c83c4c3250a606d5f2b20b25a3d44cbc392b3d669ec75281453"],
  ["scripts/improve_description.py", "87d864570220b699fac52da309d2d6efdb060647bfebc74f768128e646accf80"],
  ["scripts/package_skill.py", "1a33059b0db1ef73375d46d513e5ea81369d2e8838c970597b0d52ddef8d1c0f"],
  ["scripts/quick_validate.py", "67cf5703402013936c8fb75ad6a1afecd8841d45cc5e606b634eb05825fde365"],
  ["scripts/run_eval.py", "43e3b8f80dbf69c343967ba77e268fae991d9fa3ed68b32a0ff02532cd48657f"],
  ["scripts/run_loop.py", "7bd6f674203168520517eec94c55f493c0d154339b061b4d7c0f0dad187d0f21"],
  ["scripts/utils.py", "3af8ae62c40c73ab712207436a0d9a981e845f25c5a7040229eb189cc8e45bb1"],
]);

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

test("skill-creator preserves the complete reviewed upstream file set", async () => {
  assert.deepEqual(await listFiles(skillRoot), [...reviewedFiles.keys()].sort());
});

test("skill-creator keeps stable invocation metadata", async () => {
  const document = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const match = document.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, "skill must begin with YAML frontmatter");
  assert.deepEqual(yaml.load(match[1]), {
    name: "skill-creator",
    description:
      "Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.",
  });
});

test("skill-creator support references and local Python imports are included", async () => {
  const document = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const supportReferences = [
    ...document.matchAll(/`((?:agents|references|assets|eval-viewer)\/[^`]+\.(?:md|html|py))`/g),
  ].map((match) => match[1]);
  assert.ok(supportReferences.length > 0);
  for (const reference of supportReferences) {
    assert.ok(reviewedFiles.has(reference), `${reference} must be bundled`);
  }

  const moduleCommands = [
    ...document.matchAll(/python -m (scripts\.[a-z_]+)/g),
  ].map((match) => match[1]);
  assert.ok(moduleCommands.length > 0);
  for (const module of moduleCommands) {
    assert.ok(reviewedFiles.has(`${module.replaceAll(".", "/")}.py`));
  }

  for (const file of [...reviewedFiles.keys()].filter((file) => file.endsWith(".py"))) {
    const source = await readFile(path.join(skillRoot, file), "utf8");
    for (const match of source.matchAll(/^from (scripts\.[a-z_]+) import /gm)) {
      assert.ok(
        reviewedFiles.has(`${match[1].replaceAll(".", "/")}.py`),
        `${file} import ${match[1]} must resolve within the skill`,
      );
    }
  }

  const generator = await readFile(path.join(skillRoot, "eval-viewer/generate_review.py"), "utf8");
  const viewer = await readFile(path.join(skillRoot, "eval-viewer/viewer.html"), "utf8");
  const review = await readFile(path.join(skillRoot, "assets/eval_review.html"), "utf8");
  assert.ok(generator.includes('Path(__file__).parent / "viewer.html"'));
  assert.ok(generator.includes('template.replace("/*__EMBEDDED_DATA__*/"'));
  assert.ok(viewer.includes("/*__EMBEDDED_DATA__*/"));
  for (const placeholder of [
    "__EVAL_DATA_PLACEHOLDER__",
    "__SKILL_NAME_PLACEHOLDER__",
    "__SKILL_DESCRIPTION_PLACEHOLDER__",
  ]) {
    assert.ok(review.includes(placeholder), `${placeholder} must remain in the template`);
  }
});

test("skill-creator requires explicit models for evaluation roles", async () => {
  const document = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  for (const role of [
    "executor",
    "baseline_executor",
    "grader",
    "analyzer",
    "comparator",
    "trigger_evaluator",
    "description_improver",
  ]) {
    assert.ok(document.includes(`"${role}"`), `model plan must include ${role}`);
  }
  assert.ok(document.includes("Never let an evaluation agent inherit the session model"));
  assert.ok(document.includes("Ask the user to approve the plan"));

  const runEval = await readFile(path.join(skillRoot, "scripts/run_eval.py"), "utf8");
  assert.ok(runEval.includes('parser.add_argument("--model", required=True'));
  assert.ok(runEval.includes('"model": model'));

  const runLoop = await readFile(path.join(skillRoot, "scripts/run_loop.py"), "utf8");
  assert.ok(runLoop.includes('parser.add_argument("--evaluation-model", required=True'));
  assert.ok(runLoop.includes('parser.add_argument("--improvement-model", required=True'));
  assert.ok(!runLoop.includes('parser.add_argument("--model"'));

  const benchmark = await readFile(path.join(skillRoot, "scripts/aggregate_benchmark.py"), "utf8");
  for (const option of ["--executor-model", "--grader-model", "--analyzer-model"]) {
    assert.ok(benchmark.includes(`"${option}", required=True`));
  }
  assert.ok(benchmark.includes('"executor": executor_model'));
  assert.ok(benchmark.includes('"grader": grader_model'));
  assert.ok(benchmark.includes('"runs_per_configuration": runs_per_configuration'));
});

test("skill-creator keeps Claude CLI behavior inside a named host adapter", async () => {
  const document = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.ok(document.includes("## Host adapters"));
  assert.ok(document.includes("### GitHub Copilot"));
  assert.ok(document.includes("### Claude Code"));
  assert.ok(document.includes("only as the Claude Code trigger adapter"));
});

test("skill-creator records exact provenance and its directory-specific license", async () => {
  const notices = await readFile(path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  const section = notices.split(/## `skill-creator`\r?\n/)[1]?.split(/\r?\n## /)[0];
  assert.ok(section, "skill-creator must have its own provenance section");
  for (const text of [
    "Source repository: `https://github.com/anthropics/skills`",
    `Reviewed commit: \`${upstreamCommit}\``,
    "Original source path: `skills/skill-creator/`",
    `https://github.com/anthropics/skills/tree/${upstreamCommit}/skills/skill-creator`,
    "Reviewed license path: `skills/skill-creator/LICENSE.txt`",
    "Copyright 2026 Anthropic, PBC.",
    "Apache-2.0",
    "maintains a local fork",
    "host-neutral workflow",
    "role-specific model plan",
    "Python 3.10",
    "PyYAML",
    "claude -p",
    "Google Fonts",
    "SheetJS 0.20.3",
    "--static",
  ]) {
    assert.ok(section.includes(text), `provenance must include ${text}`);
  }
  for (const file of reviewedFiles.keys()) {
    assert.ok(section.includes(`\`skills/skill-creator/${file}\``), `${file} must be documented`);
  }

  const license = await readFile(path.join(skillRoot, "LICENSE.txt"), "utf8");
  assert.match(license, /Apache License\s+Version 2\.0, January 2004/);
  assert.ok(license.includes("Copyright 2026 Anthropic, PBC."));
  assert.ok(license.includes("4. Redistribution."));
  const manifest = JSON.parse(await readFile(path.join(pluginRoot, "plugin.json"), "utf8"));
  assert.equal(manifest.license, "MIT AND Apache-2.0");
});
