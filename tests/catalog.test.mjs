import assert from "node:assert/strict";
import { readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import {
  generateClaudeCatalog,
  generateCopilotCatalog,
  renderJson,
} from "../scripts/catalog.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const scratchRoot = join(tmpdir(), "kaleb-marketplace-tests");
const scriptPath = join(repoRoot, "scripts", "catalog.mjs");
const validateScriptPath = join(repoRoot, "scripts", "validate-marketplace.sh");
const sha = "0123456789012345678901234567890123456789";

const baseCatalog = {
  name: "kaleb-marketplace",
  interface: {
    displayName: "Kaleb Marketplace",
  },
  plugins: [],
};

test("generateCopilotCatalog maps local sources to relative paths", () => {
  const localCatalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "kaleb-skills",
        source: {
          source: "local",
          path: "./plugins/kaleb-skills",
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  const generated = generateCopilotCatalog(localCatalog);
  assert.equal(generated.owner.name, "Kaleb Cole");
  assert.equal(generated.metadata.version, "1.0.0");
  assert.deepEqual(generated.plugins[0].source, "./plugins/kaleb-skills");
  assert.equal("policy" in generated.plugins[0], false);
});

test("generateClaudeCatalog preserves external URL source details", () => {
  const externalCatalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "tool",
        source: {
          source: "url",
          url: "https://github.com/example/tool.git",
          ref: "main",
          sha,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  const generated = generateClaudeCatalog(externalCatalog);
  assert.equal(
    generated.$schema,
    "https://json.schemastore.org/claude-code-marketplace.json",
  );
  assert.equal(generated.owner.name, "Kaleb Cole");
  assert.deepEqual(generated.plugins[0].source, {
    source: "url",
    url: "https://github.com/example/tool.git",
    ref: "main",
    sha,
  });
  assert.equal("policy" in generated.plugins[0], false);
});

test("generators track Matt's upstream branch without a pin", () => {
  const catalog = {
    ...baseCatalog,
    plugins: [{
      name: "mattpocock-skills",
      source: {
        source: "url",
        url: "https://github.com/mattpocock/skills.git",
        ref: "main",
      },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Developer Tools",
    }],
  };

  assert.deepEqual(generateCopilotCatalog(catalog).plugins[0].source, {
    source: "github", repo: "mattpocock/skills", ref: "main",
  });
  assert.deepEqual(generateClaudeCatalog(catalog).plugins[0].source, {
    source: "url", url: "https://github.com/mattpocock/skills.git", ref: "main",
  });
});

test("generators preserve a pinned external subdirectory for each client", () => {
  const catalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "subdir-tool",
        source: {
          source: "git-subdir",
          url: "https://github.com/example/tools.git",
          path: "plugins/subdir-tool",
          ref: "main",
          sha,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Developer Tools",
      },
    ],
  };
  const copilot = generateCopilotCatalog(catalog);
  const claude = generateClaudeCatalog(catalog);

  assert.deepEqual(
    copilot.plugins[0].source,
    {
      source: "github",
      repo: "example/tools",
      path: "plugins/subdir-tool",
      sha,
    },
  );
  assert.deepEqual(
    claude.plugins[0].source,
    {
      source: "git-subdir",
      url: "https://github.com/example/tools.git",
      path: "plugins/subdir-tool",
      ref: "main",
      sha,
    },
  );
});

test("generateCopilotCatalog rejects unmappable external archive URLs", () => {
  const unmappableCatalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "tool",
        source: {
          source: "url",
          url: "https://example.com/tool/archive.tar.gz",
          ref: "main",
          sha,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  assert.throws(
    () => generateCopilotCatalog(unmappableCatalog),
    /tool.*Copilot.*archive/,
  );
});

test("validate rejects canonical external URLs that Copilot cannot map", async () => {
  const caseRoot = join(scratchRoot, "catalog-validate-unmappable");
  await rm(caseRoot, { recursive: true, force: true });
  await mkdir(join(caseRoot, ".agents", "plugins"), { recursive: true });
  await mkdir(join(caseRoot, "schemas"), { recursive: true });

  const schema = await readFile(
    join(repoRoot, "schemas", "marketplace.schema.json"),
    "utf8",
  );

  const catalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "tool",
        source: {
          source: "url",
          url: "https://example.com/tool.git",
          ref: "main",
          sha,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  await writeFile(
    join(caseRoot, "schemas", "marketplace.schema.json"),
    schema,
    "utf8",
  );
  await writeFile(
    join(caseRoot, ".agents", "plugins", "marketplace.json"),
    renderJson(catalog),
    "utf8",
  );

  await assert.rejects(
    () => execFileAsync("node", [scriptPath, "validate"], { cwd: caseRoot }),
    (error) => {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
      assert.match(output, /Copilot cannot map|cannot be mapped for Copilot/);
      return true;
    },
  );
});

test("renderJson uses deterministic indentation and newline", () => {
  assert.equal(renderJson({ name: "x" }), '{\n  "name": "x"\n}\n');
});

test("check reports the exact drifted output path", async () => {
  const caseRoot = join(scratchRoot, "catalog-drift");
  await rm(caseRoot, { recursive: true, force: true });
  await mkdir(join(caseRoot, ".agents", "plugins"), { recursive: true });
  await mkdir(join(caseRoot, ".github", "plugin"), { recursive: true });
  await mkdir(join(caseRoot, ".claude-plugin"), { recursive: true });
  await mkdir(join(caseRoot, "schemas"), { recursive: true });

  const schema = await readFile(
    join(repoRoot, "schemas", "marketplace.schema.json"),
    "utf8",
  );

  const catalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "kaleb-skills",
        source: {
          source: "local",
          path: "./plugins/kaleb-skills",
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  await writeFile(
    join(caseRoot, "schemas", "marketplace.schema.json"),
    schema,
    "utf8",
  );
  await writeFile(
    join(caseRoot, ".agents", "plugins", "marketplace.json"),
    renderJson(catalog),
    "utf8",
  );

  await execFileAsync("node", [scriptPath, "generate"], { cwd: caseRoot });

  const generatedPath = join(caseRoot, ".github", "plugin", "marketplace.json");
  const generated = await readFile(generatedPath, "utf8");
  await writeFile(
    generatedPath,
    generated.replace("kaleb-marketplace", "kaleb-marketplacE"),
    "utf8",
  );

  await assert.rejects(
    () => execFileAsync("node", [scriptPath, "check"], { cwd: caseRoot }),
    (error) => {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
      assert.match(output, /\.github\/plugin\/marketplace\.json/);
      return true;
    },
  );
});

test("validate-marketplace fails on drift without rewriting generated files", async () => {
  const generatedPath = join(repoRoot, ".github", "plugin", "marketplace.json");
  const original = await readFile(generatedPath, "utf8");
  const drifted = original.replace("kaleb-marketplace", "kaleb-marketplacE");

  await writeFile(generatedPath, drifted, "utf8");

  try {
    let failure;
    try {
      await execFileAsync("bash", [validateScriptPath], { cwd: repoRoot });
    } catch (error) {
      failure = error;
    }

    assert.ok(failure, "validate-marketplace should fail when generated output drifts");
    const output = `${failure.stdout ?? ""}\n${failure.stderr ?? ""}`;
    assert.match(output, /\.github\/plugin\/marketplace\.json/);
    assert.equal(await readFile(generatedPath, "utf8"), drifted);
  } finally {
    await writeFile(generatedPath, original, "utf8");
  }
});
