#!/usr/bin/env node

import { execFile } from "node:child_process";
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const pluginRoot = path.join(root, "plugins/kaleb-skills");
const noticesPath = path.join(pluginRoot, "THIRD_PARTY_NOTICES.md");
const shaPattern = /^[0-9a-f]{40}$/;

function field(section, name) {
  const value = section.match(new RegExp("^- " + name + ": `([^`]+)`$", "m"))?.[1];
  if (!value) throw new Error(`Missing ${name} in third-party notices`);
  return value;
}

export function sections(document) {
  const matches = [...document.matchAll(/^## `([^`]+)`\n/gm)];
  return matches.map((match, index) => ({
    name: match[1],
    start: match.index,
    end: matches[index + 1]?.index ?? document.length,
    body: document.slice(match.index, matches[index + 1]?.index ?? document.length),
  })).filter(({ body }) => body.includes("- Source repository:"));
}

export function sourceDetails(section) {
  const url = field(section.body, "Source repository");
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(url)) {
    throw new Error(`Unsupported source repository for ${section.name}: ${url}`);
  }
  const commit = field(section.body, "Reviewed commit");
  if (!shaPattern.test(commit)) throw new Error(`Invalid reviewed commit for ${section.name}`);
  const sourcePath = field(section.body, "Original source path").replace(/\/$/, "");
  const sourceDir = sourcePath.endsWith("/SKILL.md")
    ? path.posix.dirname(sourcePath)
    : sourcePath;
  if (sourceDir.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe source path for ${section.name}: ${sourcePath}`);
  }
  const licensePath = field(section.body, "Reviewed license path");
  if (licensePath.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe license path for ${section.name}: ${licensePath}`);
  }
  return {
    ...section,
    url,
    commit,
    sourceDir,
    licensePath,
  };
}

async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolute, relative));
    } else if (entry.isFile()) {
      files.push(relative);
    } else {
      throw new Error(`Unsupported source item: ${absolute}`);
    }
  }
  return files.sort();
}

async function replaceDirectory(source, destination) {
  const files = await listFiles(source);
  if (!files.includes("SKILL.md")) throw new Error(`Missing SKILL.md in ${source}`);
  await rm(destination, { recursive: true, force: true });
  for (const file of files) {
    const target = path.join(destination, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(source, file), target);
  }
  return files;
}

async function sameDirectory(source, destination) {
  const sourceFiles = await listFiles(source);
  const destinationFiles = await listFiles(destination);
  if (JSON.stringify(sourceFiles) !== JSON.stringify(destinationFiles)) return false;
  for (const file of sourceFiles) {
    const [upstream, stored] = await Promise.all([
      readFile(path.join(source, file)),
      readFile(path.join(destination, file)),
    ]);
    if (!upstream.equals(stored)) return false;
  }
  return true;
}

export function updateSection(section, nextCommit, files) {
  let body = section.body.replaceAll(section.commit, nextCommit);
  body = body.replace(/All \d+ files, including invocation metadata, are/, `All ${files.length} files, including invocation metadata, are`);
  const copied = files.map((file) => `  - \`skills/${section.name}/${file}\``).join("\n");
  body = body.replace(
    /- Copied files?: (?:`[^`]+`|\n(?:  - `[^`]+`\n)+)/,
    `- Copied files:\n${copied}\n`,
  );
  return body;
}

export async function syncCopiedSkills({ dryRun = false } = {}) {
  let notices = await readFile(noticesPath, "utf8");
  const sources = sections(notices).map(sourceDetails);
  const tempRoot = await mkdtemp(path.join(tmpdir(), "kaleb-skill-sync-"));
  const updates = [];

  try {
    const repositories = new Map();
    for (const source of sources) {
      if (repositories.has(source.url)) continue;
      const checkout = path.join(tempRoot, String(repositories.size));
      await run("git", ["clone", "--quiet", "--depth", "1", "--branch", "main", source.url, checkout]);
      const { stdout } = await run("git", ["-C", checkout, "rev-parse", "HEAD"]);
      const commit = stdout.trim();
      if (!shaPattern.test(commit)) throw new Error(`Invalid upstream commit for ${source.url}`);
      repositories.set(source.url, { checkout, commit });
    }

    for (const source of sources) {
      const { checkout, commit } = repositories.get(source.url);
      if (commit === source.commit) continue;

      const upstreamSkill = path.join(checkout, source.sourceDir);
      const storedSkill = path.join(pluginRoot, "skills", source.name);
      if (await sameDirectory(upstreamSkill, storedSkill)) continue;

      await run("git", ["-C", checkout, "fetch", "--quiet", "--depth", "1", "origin", source.commit]);
      const { stdout: oldLicense } = await run("git", [
        "-C", checkout, "show", `${source.commit}:${source.licensePath}`,
      ]);
      const newLicense = await readFile(path.join(checkout, source.licensePath), "utf8");
      if (oldLicense !== newLicense) {
        throw new Error(`${source.name} upstream license changed; review it before copying`);
      }

      const files = await listFiles(upstreamSkill);
      if (!files.includes("SKILL.md")) throw new Error(`${source.name} has no upstream SKILL.md`);
      updates.push({ name: source.name, from: source.commit, to: commit, files });
      if (dryRun) continue;

      await replaceDirectory(upstreamSkill, storedSkill);
      notices = notices.replace(source.body, updateSection(source, commit, files));
    }

    if (!dryRun && updates.length) await writeFile(noticesPath, notices);
    return updates;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncCopiedSkills({ dryRun: process.argv.includes("--dry-run") })
    .then((updates) => console.log(JSON.stringify(updates, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
