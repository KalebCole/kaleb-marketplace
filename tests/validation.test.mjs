import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  validateLocalPlugins,
  validateSkill,
  verifyExternalSource,
} from "../scripts/validate-marketplace.mjs";

const sha = "0123456789012345678901234567890123456789";

test("validateSkill rejects a frontmatter name that differs from its directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "kaleb-skill-"));
  const skillRoot = path.join(root, "actual-name");
  await mkdir(skillRoot);
  const skillPath = path.join(skillRoot, "SKILL.md");
  await writeFile(
    skillPath,
    "---\nname: wrong-name\ndescription: Test skill.\n---\n\nBody.\n",
  );

  await assert.rejects(() => validateSkill(skillPath), /frontmatter name.*directory/);
});

test("validateLocalPlugins requires a license", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "kaleb-plugin-"));
  await mkdir(path.join(root, "schemas"), { recursive: true });
  await mkdir(path.join(root, "plugins", "kaleb-skills", "skills", "bro"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "schemas", "agent-plugin-1.0.schema.json"),
    JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["$schema", "name"],
    }),
  );
  await writeFile(
    path.join(root, "plugins", "kaleb-skills", "plugin.json"),
    JSON.stringify({
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "kaleb-skills",
    }),
  );

  const catalog = {
    plugins: [
      {
        name: "kaleb-skills",
        source: { source: "local", path: "./plugins/kaleb-skills" },
      },
    ],
  };
  await assert.rejects(() => validateLocalPlugins(root, catalog), /LICENSE/);
});

test("verifyExternalSource reports unavailable pinned content", async () => {
  const entry = {
    name: "humanizer",
    source: {
      source: "url",
      url: "https://github.com/blader/humanizer.git",
      sha,
    },
  };
  const notFound = async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
  });

  await assert.rejects(
    () => verifyExternalSource(entry, notFound),
    /humanizer.*0123456.*not available/,
  );
});

test("verifyExternalSource checks Matt's tracked branch and package markers", async () => {
  const entry = {
    name: "mattpocock-skills",
    source: {
      source: "url",
      url: "https://github.com/mattpocock/skills.git",
      ref: "main",
    },
  };
  const requested = [];
  const available = async (url) => {
    requested.push(url);
    return { ok: true };
  };

  await verifyExternalSource(entry, available);

  assert.deepEqual(
    requested.map((url) => new URL(url).pathname),
    [
      "/repos/mattpocock/skills/commits/main",
      "/repos/mattpocock/skills/contents/.claude-plugin/plugin.json",
      "/repos/mattpocock/skills/contents/skills/engineering/grill-with-docs/SKILL.md",
      "/repos/mattpocock/skills/contents/skills/productivity/grill-me/SKILL.md",
      "/repos/mattpocock/skills/contents/LICENSE",
    ],
  );
});
