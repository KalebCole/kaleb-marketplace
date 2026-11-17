import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";
import { repoRoot, run } from "./fixtures.mjs";

async function workflow(name) {
  return yaml.load(await readFile(path.join(repoRoot, ".github", "workflows", name), "utf8"));
}

test("the required validation gate rejects failed, cancelled, skipped, and missing platform results", async () => {
  const { jobs } = await workflow("validate.yml");
  assert.equal(jobs.validate.if, "${{ always() }}");
  assert.equal(jobs.validate.needs, "platform");
  assert.equal(jobs.platform.strategy["fail-fast"], false);
  assert.deepEqual(jobs.platform.strategy.matrix.os, ["windows-latest", "macos-latest", "ubuntu-latest"]);
  assert.ok(jobs.platform.steps.some((step) => step.run === "npm run check"));
  const gate = jobs.validate.steps.find((step) => step.env?.RESULT);
  assert.equal(gate.env.RESULT, "${{ needs.platform.result }}");
  const code = gate.run.match(/^node -e "([^"]+)"$/)?.[1];
  assert.ok(code, "the aggregate must execute its result check");
  await run(process.execPath, ["-e", code], { env: { ...process.env, RESULT: "success" } });
  for (const result of ["failure", "cancelled", "skipped", ""]) {
    await assert.rejects(() => run(process.execPath, ["-e", code], {
      env: { ...process.env, RESULT: result },
    }));
  }
});

test("source sync validates before publication and explicitly requests branch CI", async () => {
  const validation = await workflow("validate.yml");
  assert.ok(Object.hasOwn(validation.on, "workflow_dispatch"));
  const sync = await workflow("sync-copied-skills.yml");
  assert.equal(sync.permissions.actions, "write");
  const steps = sync.jobs.sync.steps;
  const copy = steps.findIndex((step) => step.run === "node scripts/sync-copied-skills.mjs");
  const check = steps.findIndex((step) => step.run === "npm run check");
  const publish = steps.findIndex((step) => step.run?.includes("git push"));
  assert.ok(copy >= 0 && copy < check && check < publish);
  const body = steps[publish].run;
  assert.ok(body.indexOf("gh workflow run") > body.indexOf("gh pr create"));
  assert.match(body, /gh workflow run validate\.yml --ref "\$branch"/);
});
