import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";

const CANONICAL_CATALOG_PATH = ".agents/plugins/marketplace.json";
const SCHEMA_PATH = "schemas/marketplace.schema.json";
const COPILOT_OUTPUT_PATH = ".github/plugin/marketplace.json";
const CLAUDE_OUTPUT_PATH = ".claude-plugin/marketplace.json";
const VALID_SOURCE_TYPES = new Set(["local", "url", "git-subdir"]);

const ajv = new Ajv2020({ allErrors: true, strict: false });

function catalogPath(root, relativePath) {
  return path.join(root, relativePath);
}

function repoRelativeDisplayPath(root, filePath) {
  return path.relative(root, filePath) || path.basename(filePath);
}

function fail(message, exitCode = 1) {
  console.error(message);
  process.exitCode = exitCode;
}

function isSafeRelativePath(value, { requireDotSlash = false } = {}) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  if (path.isAbsolute(value)) {
    return false;
  }

  if (requireDotSlash && !value.startsWith("./")) {
    return false;
  }

  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    return false;
  }

  return true;
}

function validateSourceShape(plugin) {
  const { name, source } = plugin;
  if (!VALID_SOURCE_TYPES.has(source.source)) {
    throw new Error(`${name} has unsupported source type: ${source.source}`);
  }

  if (source.source === "local" && !isSafeRelativePath(source.path, { requireDotSlash: true })) {
    throw new Error(`${name} has invalid local source path: ${source.path}`);
  }

  if (source.source === "git-subdir" && !isSafeRelativePath(source.path)) {
    throw new Error(`${name} has invalid git-subdir source path: ${source.path}`);
  }

  if (source.source !== "local") {
    if (typeof source.ref !== "string" || source.ref.length === 0) {
      throw new Error(`${name} must define a tracked ref`);
    }
  }
}

function validateSourceMappings(plugin) {
  for (const target of ["copilot", "claude"]) {
    try {
      mappings[plugin.source.source][target](plugin.source);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${plugin.name} canonical source cannot be mapped for ${target === "copilot" ? "Copilot" : "Claude"}: ${detail}`);
    }
  }
}

function githubRepo(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid source URL: ${url}`);
  }

  if (parsed.hostname !== "github.com") {
    throw new Error(`Non-GitHub URL cannot be mapped for Copilot: ${url}`);
  }

  const segments = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (segments.length !== 2) {
    throw new Error(`GitHub archive URL cannot be mapped for Copilot: ${url}`);
  }

  const [owner, rawRepo] = segments;
  const repo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub repository URL: ${url}`);
  }

  return `${owner}/${repo}`;
}

const mappings = {
  local: {
    copilot: ({ path: localPath }) => localPath,
    claude: ({ path: localPath }) => localPath,
  },
  url: {
    copilot: ({ url, ref }) => ({
      source: "github",
      repo: githubRepo(url),
      ref,
    }),
    claude: ({ url, ref }) => ({
      source: "url",
      url,
      ref,
    }),
  },
  "git-subdir": {
    copilot: ({ url, path: subdirPath, ref }) => ({
      source: "github",
      repo: githubRepo(url),
      path: subdirPath,
      ref,
    }),
    claude: ({ url, path: subdirPath, ref }) => ({
      source: "git-subdir",
      url,
      path: subdirPath,
      ref,
    }),
  },
};

function normalizePlugin(plugin, target) {
  validateSourceShape(plugin);

  let source;
  try {
    source = mappings[plugin.source.source][target](plugin.source);
  } catch (error) {
    if (target === "copilot" && plugin.source.source !== "local") {
      throw new Error(`${plugin.name} cannot be mapped for Copilot from archive URL: ${plugin.source.url}`);
    }
    throw error;
  }

  return {
    name: plugin.name,
    source,
    policy: {
      installation: plugin.policy.installation,
      authentication: plugin.policy.authentication,
    },
    category: plugin.category,
  };
}

async function loadSchema(root = process.cwd()) {
  return JSON.parse(await readFile(catalogPath(root, SCHEMA_PATH), "utf8"));
}

function validateCanonicalCatalog(catalog, validate) {
  if (!validate(catalog)) {
    const details = (validate.errors ?? []).map((error) => {
      const pointer = error.instancePath || "/";
      return `${pointer} ${error.message}`;
    });
    throw new Error(`Canonical catalog failed schema validation:\n${details.join("\n")}`);
  }

  const names = new Set();
  for (const plugin of catalog.plugins) {
    if (names.has(plugin.name)) {
      throw new Error(`Duplicate plugin name: ${plugin.name}`);
    }
    names.add(plugin.name);
    validateSourceShape(plugin);
    validateSourceMappings(plugin);
  }

  return catalog;
}

export async function loadCanonicalCatalog(root = process.cwd()) {
  const [schema, rawCatalog] = await Promise.all([
    loadSchema(root),
    readFile(catalogPath(root, CANONICAL_CATALOG_PATH), "utf8"),
  ]);
  const validate = ajv.compile(schema);
  const catalog = JSON.parse(rawCatalog);
  return validateCanonicalCatalog(catalog, validate);
}

function generateCatalog(catalog, target) {
  const plugins = catalog.plugins.map((plugin) => normalizePlugin(plugin, target));

  if (target === "copilot") {
    return {
      name: catalog.name,
      owner: {
        name: "Kaleb Cole",
      },
      metadata: {
        description: "Kaleb's personal public marketplace of selected agent plugins.",
        version: "1.0.0",
      },
      plugins: plugins.map(({ policy, ...plugin }) => plugin),
    };
  }

  return {
    $schema: "https://json.schemastore.org/claude-code-marketplace.json",
    name: catalog.name,
    description: "Kaleb's personal public marketplace of selected agent plugins.",
    owner: {
      name: "Kaleb Cole",
      url: "https://github.com/KalebCole",
    },
    plugins: plugins.map(({ policy, ...plugin }) => plugin),
  };
}

export function generateCopilotCatalog(catalog) {
  return generateCatalog(catalog, "copilot");
}

export function generateClaudeCatalog(catalog) {
  return generateCatalog(catalog, "claude");
}

export function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function ensureParentDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeGeneratedFiles(root, catalog) {
  const outputs = [
    [catalogPath(root, COPILOT_OUTPUT_PATH), renderJson(generateCopilotCatalog(catalog))],
    [catalogPath(root, CLAUDE_OUTPUT_PATH), renderJson(generateClaudeCatalog(catalog))],
  ];

  for (const [filePath, contents] of outputs) {
    await ensureParentDir(filePath);
    await writeFile(filePath, contents, "utf8");
  }
}

async function checkGeneratedFiles(root, catalog) {
  const outputs = [
    [catalogPath(root, COPILOT_OUTPUT_PATH), renderJson(generateCopilotCatalog(catalog))],
    [catalogPath(root, CLAUDE_OUTPUT_PATH), renderJson(generateClaudeCatalog(catalog))],
  ];

  for (const [filePath, expected] of outputs) {
    const actual = await readFile(filePath, "utf8");
    if (actual !== expected) {
      throw new Error(`Generated catalog drifted: ${repoRelativeDisplayPath(root, filePath)}`);
    }
  }
}

async function getJson(url) {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}): ${url}`);
  }
  return response.json();
}

async function runGenerate(root) {
  const catalog = await loadCanonicalCatalog(root);
  await writeGeneratedFiles(root, catalog);
}

async function runCheck(root) {
  const catalog = await loadCanonicalCatalog(root);
  await checkGeneratedFiles(root, catalog);
}

async function runValidate(root) {
  await loadCanonicalCatalog(root);
}

async function runVerifySources(root) {
  const catalog = await loadCanonicalCatalog(root);
  for (const plugin of catalog.plugins) {
    validateSourceShape(plugin);
    if (plugin.source.source !== "local") {
      const repo = githubRepo(plugin.source.url);
      await getJson(
        `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(plugin.source.ref)}`,
      );
    }
  }
}

async function main(argv = process.argv.slice(2), root = process.cwd()) {
  const [command] = argv;

  switch (command) {
    case "generate":
      await runGenerate(root);
      return;
    case "check":
      await runCheck(root);
      return;
    case "validate":
      await runValidate(root);
      return;
    case "verify-sources":
      await runVerifySources(root);
      return;
    default:
      throw new Error(`Unknown command: ${command ?? "<none>"}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}
