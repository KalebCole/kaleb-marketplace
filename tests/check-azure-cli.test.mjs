import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/check-azure-cli.sh");
const execFileAsync = promisify(execFile);

function runCheck(pathValue) {
  return execFileAsync("/bin/bash", [script], {
    env: { PATH: pathValue },
    encoding: "utf8",
  });
}

test("missing Azure CLI warns and exits successfully", async () => {
  const { stdout, stderr } = await runCheck(path.join(os.tmpdir(), "az-missing-path"));

  assert.equal(stdout, "");
  assert.match(
    stderr,
    /^Warning: Azure CLI \(az\) is not installed\. Install it from https:\/\/learn\.microsoft\.com\/cli\/azure\/install-azure-cli\n$/,
  );
});

test("installed Azure CLI produces no warning", async () => {
  const bin = await mkdtemp(path.join(os.tmpdir(), "az-present-"));
  const az = path.join(bin, "az");
  await writeFile(az, "#!/bin/sh\nexit 0\n");
  await chmod(az, 0o755);

  const { stdout, stderr } = await runCheck(bin);

  assert.equal(stdout, "");
  assert.equal(stderr, "");
});
