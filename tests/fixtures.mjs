import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const run = promisify(execFile);
export const repoRoot = path.resolve(import.meta.dirname, "..");

export async function catalogFixture(t, plugins = []) {
  const root = await mkdtemp(path.join(tmpdir(), "kaleb catalog # "));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "schemas"), { recursive: true });
  await mkdir(path.join(root, ".agents", "plugins"), { recursive: true });
  await copyFile(
    path.join(repoRoot, "schemas", "marketplace.schema.json"),
    path.join(root, "schemas", "marketplace.schema.json"),
  );
  await copyFile(
    path.join(repoRoot, "schemas", "agent-plugin-1.0.schema.json"),
    path.join(root, "schemas", "agent-plugin-1.0.schema.json"),
  );
  await writeFile(path.join(root, ".gitattributes"), "* text=auto eol=lf\n");
  await writeFile(path.join(root, ".agents", "plugins", "marketplace.json"), JSON.stringify({
    name: "kaleb-marketplace",
    interface: { displayName: "Kaleb Marketplace" },
    plugins,
  }));
  await run("git", ["init", "--quiet", root]);
  return root;
}
