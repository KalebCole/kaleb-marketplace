import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { generateCopilotCatalog, loadCanonicalCatalog, renderJson } from "./catalog.mjs";
import { validateMarketplace, verifyExternalSource } from "./validate-marketplace.mjs";

export async function runClient(command, args, options) {
  let executable = command;
  let arguments_ = args;
  if (process.platform === "win32") {
    const literal = (value) => `'${value.replaceAll("'", "''")}'`;
    const script = `$ErrorActionPreference = 'Stop'; & ${[command, ...args].map(literal).join(" ")}; ` +
      "if ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE }";
    executable = "powershell.exe";
    arguments_ = ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")];
  }
  await new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, { ...options, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code})`));
    });
  });
}

export async function checkLive({ root, copilot = false, claude = false }, runClientImpl = runClient) {
  await validateMarketplace(root);
  const catalog = await loadCanonicalCatalog(root);
  for (const entry of catalog.plugins) {
    await verifyExternalSource(entry);
  }
  console.log("PASS: upstream branches and package markers");
  if (!copilot) console.log("SKIPPED: Copilot installs (request with --copilot)");
  if (!claude) console.log("SKIPPED: Claude validation (request with --claude)");
  if (!copilot && !claude) return;

  const home = await mkdtemp(path.join(tmpdir(), "kaleb-live-check-"));
  try {
    const snapshot = path.join(home, "marketplace");
    const generated = generateCopilotCatalog(catalog);
    for (const [index, entry] of catalog.plugins.entries()) {
      if (entry.source.source !== "local" && !(
        entry.source.source === "git-subdir" &&
        entry.source.url === "https://github.com/KalebCole/kaleb-marketplace.git"
      )) continue;
      const localPath = `./plugins/local-${index}`;
      await cp(path.resolve(root, entry.source.path), path.join(snapshot, localPath), { recursive: true });
      generated.plugins.find(({ name }) => name === entry.name).source = localPath;
    }
    await mkdir(path.join(snapshot, ".github", "plugin"), { recursive: true });
    await writeFile(path.join(snapshot, ".github", "plugin", "marketplace.json"), renderJson(generated));
    const env = {
      ...process.env,
      COPILOT_HOME: path.join(home, "copilot"),
      CLAUDE_CONFIG_DIR: path.join(home, "claude"),
    };
    const options = { cwd: root, env };
    if (copilot) {
      await runClientImpl("copilot", ["plugin", "marketplace", "add", snapshot], options);
      await runClientImpl("copilot", ["plugin", "marketplace", "browse", catalog.name, "--json"], options);
      for (const { name } of catalog.plugins) {
        await runClientImpl("copilot", ["plugin", "install", `${name}@${catalog.name}`], options);
      }
      console.log("PASS: Copilot clean installs (local packages from this checkout; external packages from upstream)");
    }
    if (claude) {
      await runClientImpl("claude", ["plugin", "validate", root], options);
      console.log("PASS: Claude catalog validation (not an install test)");
    }
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  (async () => {
    const { values } = parseArgs({
      options: {
        root: { type: "string" },
        copilot: { type: "boolean" },
        claude: { type: "boolean" },
      },
    });
    await checkLive({
      root: values.root ? path.resolve(values.root) : path.resolve(import.meta.dirname, ".."),
      copilot: values.copilot,
      claude: values.claude,
    });
  })().catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
