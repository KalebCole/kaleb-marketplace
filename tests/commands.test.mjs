import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { checkLive, runClient } from "../scripts/check-live.mjs";
import { validateLineEndings, validateSkill } from "../scripts/validate-marketplace.mjs";
import { catalogFixture, repoRoot, run } from "./fixtures.mjs";

const script = (name) => path.join(repoRoot, "scripts", name);

test("offline validation CLI runs without checking an unavailable upstream", async (t) => {
  const root = await catalogFixture(t, [{
    name: "offline-fixture",
    source: { source: "url", url: "https://github.com/example/offline-only.git", ref: "not-a-branch" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  }]);
  await run(process.execPath, [script("catalog.mjs"), "generate"], { cwd: root });
  const checked = await run(process.execPath, [script("validate-marketplace.mjs"), "--root", root]);
  assert.match(checked.stdout, /Validated 1 catalog entries.*offline/);
  await writeFile(path.join(root, ".agents", "plugins", "marketplace.json"), "{}");
  await assert.rejects(
    () => run(process.execPath, [script("validate-marketplace.mjs"), "--root", root]),
    (error) => {
      assert.match(error.stderr, /Canonical catalog failed/);
      return true;
    },
  );
});

test("sync CLI executes a fixture dry run and rejects malformed notices without network access", async (t) => {
  const root = await catalogFixture(t);
  const plugin = path.join(root, "plugins", "kaleb-skills");
  await mkdir(plugin, { recursive: true });
  const notices = path.join(plugin, "THIRD_PARTY_NOTICES.md");
  await writeFile(notices, [
    "## `fixture`",
    "",
    "- Source repository: `https://github.com/example/fixture`",
    `- Reviewed commit: \`${"a".repeat(40)}\``,
    "- Original source path: `skills/fixture/`",
    "- Reviewed license path: `LICENSE`",
    "- Automated source updates: `disabled`",
    "",
  ].join("\n"));
  const args = [script("sync-copied-skills.mjs"), "--dry-run", "--root", root];
  const checked = await run(process.execPath, args);
  assert.equal(checked.stdout.trim(), "[]");
  await writeFile(notices, "No source records\n");
  await assert.rejects(() => run(process.execPath, args), (error) => {
    assert.match(error.stderr, /No source sections found/);
    return true;
  });
});

test("live CLI explicitly reports unrequested client installs as skipped", async (t) => {
  const root = await catalogFixture(t);
  await run(process.execPath, [script("catalog.mjs"), "generate"], { cwd: root });
  const { stdout } = await run(process.execPath, [script("check-live.mjs"), "--root", root]);
  assert.match(stdout, /PASS: upstream branches and package markers/);
  assert.match(stdout, /SKIPPED: Copilot installs/);
  assert.match(stdout, /SKIPPED: Claude validation/);
  await assert.rejects(
    () => run(process.execPath, [script("check-live.mjs"), "--root", root, "--unknown"]),
    (error) => {
      assert.match(error.stderr, /FAIL:.*--unknown/);
      return true;
    },
  );
});

test("portable CLIs reject extra or unknown arguments before doing work", async (t) => {
  const root = await catalogFixture(t);
  for (const [file, args] of [
    ["catalog.mjs", ["generate", "--unknown"]],
    ["check.mjs", ["--root", root, "--unknown"]],
    ["sync-copied-skills.mjs", ["--root", root, "--unknown"]],
  ]) {
    await assert.rejects(
      () => run(process.execPath, [script(file), ...args], { cwd: root }),
      (error) => {
        assert.match(error.stderr, /Usage:|--unknown/);
        return true;
      },
    );
  }
});

test("full check actually runs fixture tests and propagates test failures", async (t) => {
  const root = await catalogFixture(t);
  await run(process.execPath, [script("catalog.mjs"), "generate"], { cwd: root });
  const fixture = path.join(root, "fixture.test.mjs");
  await writeFile(fixture, "import test from 'node:test'; test('isolated fixture', () => console.log('FIXTURE EXECUTED'));");
  const args = [script("check.mjs"), "--root", root];
  const checked = await run(process.execPath, args);
  assert.match(checked.stdout, /FIXTURE EXECUTED/);
  assert.match(checked.stdout, /PASS: deterministic repository checks/);
  await writeFile(fixture, "import test from 'node:test'; test('isolated fixture', () => { throw new Error('fixture failure'); });");
  await assert.rejects(() => run(process.execPath, args), (error) => {
    assert.match(error.stderr, /Repository tests failed/);
    assert.match(error.stdout, /fixture failure/);
    assert.doesNotMatch(error.stdout, /PASS: deterministic repository checks/);
    return true;
  });
});

test("live client checks use temporary settings, install the local snapshot, and clean up on failure", async (t) => {
  const root = await catalogFixture(t, [{
    name: "fixture",
    source: { source: "local", path: "./plugins/fixture" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity",
  }]);
  const plugin = path.join(root, "plugins", "fixture");
  await mkdir(path.join(plugin, "skills", "fixture"), { recursive: true });
  await writeFile(path.join(plugin, "plugin.json"), JSON.stringify({
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "fixture",
  }));
  await writeFile(path.join(plugin, "LICENSE"), "Fixture license\n");
  await writeFile(path.join(plugin, "THIRD_PARTY_NOTICES.md"), "Fixture notices\n");
  const skill = "---\nname: fixture\ndescription: Local fixture\n---\nPending local content\n";
  await writeFile(path.join(plugin, "skills", "fixture", "SKILL.md"), skill);
  await run(process.execPath, [script("catalog.mjs"), "generate"], { cwd: root });
  const calls = [];
  let temporaryHome;
  const client = async (command, args, { env }) => {
    calls.push([command, ...args]);
    temporaryHome = path.dirname(env.COPILOT_HOME);
    assert.equal(path.dirname(env.CLAUDE_CONFIG_DIR), temporaryHome);
    assert.notEqual(env.COPILOT_HOME, process.env.COPILOT_HOME);
    if (args[2] === "add") {
      const snapshot = args[3];
      const catalog = JSON.parse(await readFile(path.join(snapshot, ".github", "plugin", "marketplace.json"), "utf8"));
      assert.equal(catalog.plugins[0].source, "./plugins/local-0");
      assert.equal(await readFile(path.join(snapshot, catalog.plugins[0].source, "skills", "fixture", "SKILL.md"), "utf8"), skill);
    }
  };
  await checkLive({ root, copilot: true, claude: true }, client);
  assert.ok(calls.some((call) => call.join(" ") === "copilot plugin install fixture@kaleb-marketplace"));
  assert.ok(calls.some((call) => call[0] === "claude" && call[2] === "validate"));
  await assert.rejects(() => readFile(path.join(temporaryHome, "marketplace", ".github", "plugin", "marketplace.json")), { code: "ENOENT" });
  await assert.rejects(() => checkLive({ root, copilot: true }, async (...args) => {
    await client(...args);
    throw new Error("client fixture failed");
  }), /client fixture failed/);
  await assert.rejects(() => readFile(path.join(temporaryHome, "marketplace", ".github", "plugin", "marketplace.json")), { code: "ENOENT" });
});

test("client launcher preserves literal arguments and propagates command failure", async (t) => {
  const root = await catalogFixture(t);
  const output = path.join(root, "arguments.json");
  const fixture = path.join(root, "client.mjs");
  await writeFile(fixture, "import { writeFileSync } from 'node:fs'; writeFileSync(process.argv[2], JSON.stringify(process.argv.slice(3)));");
  const args = ["space in path", "literal & $value; 'quote'", "%PATH%", "back\\slash"];
  await runClient(process.execPath, [fixture, output, ...args], { cwd: root });
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), args);
  await assert.rejects(
    () => runClient(process.execPath, ["-e", "process.exit(7)"], { cwd: root }),
    /failed \(7\)/,
  );
});

test("LF attributes override autocrlf and validation rejects CRLF tracked text", async (t) => {
  const root = await catalogFixture(t);
  const text = path.join(root, "fixture.txt");
  await writeFile(text, "line one\nline two\n");
  await run("git", ["config", "core.autocrlf", "true"], { cwd: root });
  await run("git", ["add", ".gitattributes", "fixture.txt"], { cwd: root });
  await run("git", ["checkout-index", "--force", "--", "fixture.txt"], { cwd: root });
  assert.equal(await readFile(text, "utf8"), "line one\nline two\n");
  await validateLineEndings(root);
  await writeFile(text, "line one\r\nline two\r\n");
  await assert.rejects(() => validateLineEndings(root), /must use LF.*\nfixture\.txt/);
});

test("skill input boundaries accept CRLF frontmatter without changing source text", async (t) => {
  const root = await catalogFixture(t);
  const skill = path.join(root, "fixture");
  await mkdir(skill);
  const file = path.join(skill, "SKILL.md");
  const document = "---\r\nname: fixture\r\ndescription: CRLF input\r\n---\r\nBody\r\n";
  await writeFile(file, document);
  await validateSkill(file);
  assert.equal(await readFile(file, "utf8"), document);
});
