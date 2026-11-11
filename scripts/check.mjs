import { spawnSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import { validateMarketplace } from "./validate-marketplace.mjs";

try {
  const { values } = parseArgs({ options: { root: { type: "string" } } });
  const root = values.root
    ? path.resolve(values.root)
    : path.resolve(import.meta.dirname, "..");
  await validateMarketplace(root);
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
  // Start an independent suite even when a parent Node test launches this CLI.
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test"], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Repository tests failed (${result.signal ?? result.status})`);
  }
  console.log("PASS: deterministic repository checks");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
