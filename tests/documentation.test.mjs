import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

async function read(paths) {
  return (
    await Promise.all(paths.map((file) => readFile(path.join(root, file), "utf8")))
  ).join("\n");
}

test("public documentation explains all three distribution paths", async () => {
  const allDocs = await read([
    "README.md",
    "CONTEXT.md",
    "docs/usage.md",
    "docs/contributing.md",
    "docs/maintenance.md",
  ]);
  for (const phrase of [
    "local stored plugin",
    "maintained external plugin reference",
    "native external installer",
    "npx impeccable install",
    "npx impeccable update",
  ]) {
    assert.match(allDocs, new RegExp(phrase, "i"));
  }
});

test("browse documentation excludes removed catalog items", async () => {
  const browseDocs = await read(["README.md", "CONTEXT.md", "docs/usage.md"]);
  for (const removed of [
    "cli-printing-press",
    "pstack",
    "grill-design",
    "oil-motion",
  ]) {
    assert.doesNotMatch(browseDocs, new RegExp(removed, "i"));
  }
});

test("Codex documentation separates marketplace registration from installation", async () => {
  for (const file of ["README.md", "docs/usage.md"]) {
    const document = await readFile(path.join(root, file), "utf8");
    assert.match(document, /codex plugin marketplace add KalebCole\/kaleb-marketplace/);
    assert.match(document, /codex plugin add <plugin-name>@kaleb-marketplace/);
    assert.match(document, /does not\s+install/i);
    assert.match(document, /new session/i);
  }

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const catalog = JSON.parse(
    await readFile(path.join(root, ".agents/plugins/marketplace.json"), "utf8"),
  );
  for (const plugin of catalog.plugins) {
    assert.ok(!readme.includes(plugin.name), "README must link to the catalog, not list plugins");
  }

  const usage = await readFile(path.join(root, "docs/usage.md"), "utf8");
  assert.match(usage, /Installation does not trust plugin hooks/);
  assert.match(usage, /only for trusted projects/);
});

test("tracked files exclude the retired repository identity", async () => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z"],
    { cwd: root, encoding: "buffer" },
  );
  const paths = stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((file) => !file.startsWith("node_modules/"));
  const retiredNames = [
    ["agent", " toolkit"].join(""),
    ["agent", "-toolkit"].join(""),
    ["kalebcole/", "agent", "-toolkit"].join(""),
  ];
  const matches = [];

  for (const file of paths) {
    let contents;
    try {
      contents = await readFile(path.join(root, file));
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    if (contents.includes(0)) {
      continue;
    }
    const text = contents.toString("utf8");
    for (const retiredName of retiredNames) {
      if (text.toLowerCase().includes(retiredName)) {
        matches.push(`${file}: ${retiredName}`);
      }
    }
  }

  assert.deepEqual(matches, []);
});
