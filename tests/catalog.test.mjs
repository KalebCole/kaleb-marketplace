import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  generateClaudeCatalog,
  generateCopilotCatalog,
  renderJson,
} from "../scripts/catalog.mjs";
import { catalogFixture, repoRoot, run } from "./fixtures.mjs";

const scriptPath = join(repoRoot, "scripts", "catalog.mjs");
const validateScriptPath = join(repoRoot, "scripts", "check.mjs");

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
  });
  assert.equal("policy" in generated.plugins[0], false);
});

test("generators track an external upstream branch", () => {
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

test("generators preserve a tracked external subdirectory for each client", () => {
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
      ref: "main",
    },
  );
  assert.deepEqual(
    claude.plugins[0].source,
    {
      source: "git-subdir",
      url: "https://github.com/example/tools.git",
      path: "plugins/subdir-tool",
      ref: "main",
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

test("validate rejects canonical external URLs that Copilot cannot map", async (t) => {
  const catalog = {
    ...baseCatalog,
    plugins: [
      {
        name: "tool",
        source: {
          source: "url",
          url: "https://example.com/tool.git",
          ref: "main",
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  const caseRoot = await catalogFixture(t, catalog.plugins);

  await assert.rejects(
    () => run(process.execPath, [scriptPath, "validate"], { cwd: caseRoot }),
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

test("CLI generation writes both exact client catalogs and detects drift without rewriting", async (t) => {
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

  const caseRoot = await catalogFixture(t, catalog.plugins);
  const { stdout } = await run(process.execPath, [scriptPath, "generate"], { cwd: caseRoot });
  assert.match(stdout, /Generated both client catalogs/);
  assert.equal(
    await readFile(join(caseRoot, ".github", "plugin", "marketplace.json"), "utf8"),
    renderJson(generateCopilotCatalog(catalog)),
  );
  assert.equal(
    await readFile(join(caseRoot, ".claude-plugin", "marketplace.json"), "utf8"),
    renderJson(generateClaudeCatalog(catalog)),
  );
  const checked = await run(process.execPath, [scriptPath, "check"], { cwd: caseRoot });
  assert.match(checked.stdout, /Generated catalogs match/);

  const generatedPath = join(caseRoot, ".github", "plugin", "marketplace.json");
  const generated = await readFile(generatedPath, "utf8");
  await writeFile(
    generatedPath,
    generated.replace("kaleb-marketplace", "kaleb-marketplacE"),
    "utf8",
  );

  await assert.rejects(
    () => run(process.execPath, [scriptPath, "check"], { cwd: caseRoot }),
    (error) => {
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
      assert.match(output, /\.github\/plugin\/marketplace\.json/);
      return true;
    },
  );
  assert.equal(await readFile(generatedPath, "utf8"), generated.replace("kaleb-marketplace", "kaleb-marketplacE"));
});

test("full check fails on fixture drift before running tests and leaves it unchanged", async (t) => {
  const caseRoot = await catalogFixture(t);
  await run(process.execPath, [scriptPath, "generate"], { cwd: caseRoot });
  const generatedPath = join(caseRoot, ".github", "plugin", "marketplace.json");
  const original = await readFile(generatedPath, "utf8");
  const drifted = original.replace("kaleb-marketplace", "kaleb-marketplacE");

  await writeFile(generatedPath, drifted, "utf8");

  await assert.rejects(
    () => run(process.execPath, [validateScriptPath, "--root", caseRoot], { cwd: caseRoot }),
    (error) => {
      assert.match(error.stderr, /\.github\/plugin\/marketplace\.json/);
      assert.doesNotMatch(error.stdout, /tests|PASS/);
      return true;
    },
  );
  assert.equal(await readFile(generatedPath, "utf8"), drifted);
});
