#!/usr/bin/env node

import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import yaml from "js-yaml";

import { loadCanonicalCatalog } from "./catalog.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const shaPattern = /^[0-9a-f]{40}$/;
const externalMarkers = {
  humanizer: [".claude-plugin/plugin.json", "SKILL.md", "LICENSE"],
  "visual-explainer": [
    "plugins/visual-explainer/.claude-plugin/plugin.json",
    "plugins/visual-explainer/SKILL.md",
    "LICENSE",
  ],
  "i-have-adhd": [
    "plugin.json",
    ".agents/plugins/marketplace.json",
    ".claude-plugin/plugin.json",
    "skills/i-have-adhd/SKILL.md",
    "LICENSE",
  ],
  pstack: [
    "plugins/pstack/.claude-plugin/plugin.json",
    "plugins/pstack/.codex-plugin/plugin.json",
    "LICENSE",
  ],
  "lavish-axi": ["plugin.json", "skills/lavish/SKILL.md", "LICENSE"],
};

function githubRepo(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.replace(/^\/|\/$/g, "").split("/");
  if (parsed.hostname !== "github.com" || parts.length !== 2) {
    throw new Error(`Unsupported GitHub source URL: ${url}`);
  }
  return `${parts[0]}/${parts[1].replace(/\.git$/, "")}`;
}

function parseSkillFrontmatter(document, filePath) {
  const match = document.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`${filePath} must start with YAML frontmatter`);
  }
  return yaml.load(match[1]);
}

export async function validateSkill(filePath) {
  const document = await readFile(filePath, "utf8");
  const metadata = parseSkillFrontmatter(document, filePath);
  const directoryName = path.basename(path.dirname(filePath));
  if (metadata?.name !== directoryName) {
    throw new Error(
      `${filePath} frontmatter name must match directory ${directoryName}`,
    );
  }
  if (typeof metadata.description !== "string" || metadata.description.length === 0) {
    throw new Error(`${filePath} must define a non-empty description`);
  }
}

async function assertContained(rootPath, candidatePath) {
  const [resolvedRoot, resolvedCandidate] = await Promise.all([
    realpath(rootPath),
    realpath(candidatePath),
  ]);
  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(`${candidatePath} resolves outside its plugin root`);
  }
}

export async function validateLocalPlugins(repoRoot, catalog) {
  const schema = JSON.parse(
    await readFile(path.join(repoRoot, "schemas", "agent-plugin-1.0.schema.json"), "utf8"),
  );
  const validateManifest = new Ajv2020({ allErrors: true }).compile(schema);

  for (const entry of catalog.plugins.filter(
    (plugin) => plugin.source.source === "local",
  )) {
    const pluginRoot = path.resolve(repoRoot, entry.source.path);
    await assertContained(repoRoot, pluginRoot);
    for (const required of ["plugin.json", "LICENSE", "THIRD_PARTY_NOTICES.md"]) {
      const requiredPath = path.join(pluginRoot, required);
      if (!(await lstat(requiredPath)).isFile()) {
        throw new Error(`${entry.name} must include ${required}`);
      }
    }

    const manifest = JSON.parse(
      await readFile(path.join(pluginRoot, "plugin.json"), "utf8"),
    );
    if (!validateManifest(manifest)) {
      throw new Error(
        `${entry.name} plugin.json is invalid: ${JSON.stringify(validateManifest.errors)}`,
      );
    }
    if (manifest.name !== entry.name) {
      throw new Error(`${entry.name} catalog and plugin manifest names differ`);
    }

    const skillsRoot = path.join(pluginRoot, "skills");
    const skills = (await readdir(skillsRoot, { withFileTypes: true })).filter(
      (item) => item.isDirectory(),
    );
    if (skills.length === 0) {
      throw new Error(`${entry.name} must include at least one skill`);
    }
    for (const skill of skills) {
      const skillFile = path.join(skillsRoot, skill.name, "SKILL.md");
      await assertContained(pluginRoot, skillFile);
      await validateSkill(skillFile);
    }
  }
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "kaleb-marketplace-validator",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

async function requireResponse(response, entry, target) {
  if (!response.ok) {
    throw new Error(
      `${entry.name} at ${entry.source.sha}: ${target} is not available (${response.status} ${response.statusText})`,
    );
  }
}

export async function verifyExternalSource(entry, fetchImpl = fetch) {
  if (entry.source.source === "local") {
    return;
  }
  if (!shaPattern.test(entry.source.sha)) {
    throw new Error(`${entry.name} must use an exact 40-character pin`);
  }
  const repo = githubRepo(entry.source.url);
  const headers = githubHeaders();
  const commitUrl = `https://api.github.com/repos/${repo}/commits/${entry.source.sha}`;
  await requireResponse(await fetchImpl(commitUrl, { headers }), entry, "commit");

  const markers = externalMarkers[entry.name];
  if (!markers) {
    throw new Error(`${entry.name} has no declared package marker validation`);
  }
  for (const marker of markers) {
    const markerUrl =
      `https://api.github.com/repos/${repo}/contents/${marker}` +
      `?ref=${encodeURIComponent(entry.source.sha)}`;
    await requireResponse(await fetchImpl(markerUrl, { headers }), entry, marker);
  }
}

export async function validateMarketplace(
  repoRoot = root,
  fetchImpl = fetch,
) {
  const catalog = await loadCanonicalCatalog(repoRoot);
  await validateLocalPlugins(repoRoot, catalog);
  await Promise.all(
    catalog.plugins.map((entry) => verifyExternalSource(entry, fetchImpl)),
  );
  console.log(
    `Validated ${catalog.plugins.length} catalog entries and all package layouts`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateMarketplace().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
