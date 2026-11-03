import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadReviewState,
  saveFeedback,
  validateEvaluationId,
} from "../.github/extensions/skill-eval-review/review-model.mjs";
import { startReviewServer } from "../.github/extensions/skill-eval-review/review-server.mjs";

async function createRun(workspace, configuration, output, passRate) {
  const run = path.join(workspace, "email-summary", configuration);
  await mkdir(path.join(run, "outputs"), { recursive: true });
  await writeFile(
    path.join(run, "eval_metadata.json"),
    JSON.stringify({
      eval_id: 1,
      prompt: "Summarize the support email.",
      expected_output: "A short summary with the owner and next step.",
    }),
  );
  await writeFile(path.join(run, "outputs", "summary.md"), output);
  await writeFile(
    path.join(run, "grading.json"),
    JSON.stringify({
      summary: { pass_rate: passRate, passed: passRate ? 1 : 0, failed: passRate ? 0 : 1, total: 1 },
      expectations: [{ text: "Names the owner.", passed: Boolean(passRate), evidence: output }],
    }),
  );
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "skill-eval-review-"));
  const current = path.join(root, "iteration-2");
  const previous = path.join(root, "iteration-1");
  await createRun(current, "with_skill", "Owner: Ada", 1);
  await createRun(current, "baseline", "No owner.", 0);
  await createRun(previous, "with_skill", "Owner: unknown", 0);
  await createRun(previous, "baseline", "No owner.", 0);
  await writeFile(
    path.join(previous, "feedback.json"),
    JSON.stringify({
      evaluation_id: "iteration-1",
      status: "complete",
      reviews: [
        { run_id: "email-summary-with_skill", feedback: "Name the owner." },
        { run_id: "email-summary-baseline", feedback: "" },
      ],
    }),
  );
  const benchmarkPath = path.join(current, "benchmark.json");
  await writeFile(
    benchmarkPath,
    JSON.stringify({ run_summary: { skill_pass_rate: 1, baseline_pass_rate: 0 } }),
  );
  return { current, previous, benchmarkPath };
}

test("evaluation IDs reject transient or unsafe values", () => {
  assert.equal(validateEvaluationId("email-summary.iteration-2"), "email-summary.iteration-2");
  assert.throws(() => validateEvaluationId("../iteration-2"), /evaluationId/);
  assert.throws(() => validateEvaluationId("has spaces"), /evaluationId/);
});

test("review state includes skill and baseline runs, grades, benchmark, and prior iteration", async () => {
  const { current, previous, benchmarkPath } = await fixture();
  const state = await loadReviewState({
    evaluationId: "email-summary.iteration-2",
    workspacePath: current,
    previousWorkspacePath: previous,
    benchmarkPath,
    skillName: "email-summary",
  });

  assert.deepEqual(state.runs.map((run) => run.configuration), ["baseline", "skill"]);
  assert.equal(state.runs[1].outputs[0].content, "Owner: Ada");
  assert.equal(state.runs[1].grading.summary.pass_rate, 1);
  assert.equal(state.benchmark.run_summary.skill_pass_rate, 1);
  assert.equal(state.previous["email-summary-with_skill"].feedback, "Name the owner.");
});

test("feedback persists by stable evaluation ID and requires every run on completion", async () => {
  const { current } = await fixture();
  const state = await loadReviewState({
    evaluationId: "email-summary.iteration-2",
    workspacePath: current,
    skillName: "email-summary",
  });
  await assert.rejects(
    saveFeedback(state, {
      evaluation_id: state.evaluationId,
      status: "complete",
      reviews: [{ run_id: state.runs[0].id, feedback: "" }],
    }, "complete"),
    /every run/,
  );

  const saved = await saveFeedback(state, {
    evaluation_id: state.evaluationId,
    status: "complete",
    reviews: state.runs.map((run) => ({ run_id: run.id, feedback: `${run.configuration} feedback` })),
  }, "complete");
  assert.equal(saved.evaluation_id, "email-summary.iteration-2");
  const disk = JSON.parse(await readFile(path.join(current, "feedback.json"), "utf8"));
  assert.equal(disk.evaluation_id, "email-summary.iteration-2");
  assert.equal(disk.reviews.length, 2);
});

test("review server opens state and validates persisted feedback", async (context) => {
  const { current } = await fixture();
  const state = await loadReviewState({
    evaluationId: "email-summary.iteration-2",
    workspacePath: current,
    skillName: "email-summary",
  });
  const entry = await startReviewServer(state, "<!doctype html><title>Review</title>");
  context.after(() => new Promise((resolve) => entry.server.close(resolve)));

  assert.equal((await fetch(entry.url)).status, 200);
  const stateUrl = new URL("/api/state", entry.url);
  stateUrl.search = new URL(entry.url).search;
  const opened = await (await fetch(stateUrl)).json();
  assert.equal(opened.evaluationId, "email-summary.iteration-2");
  assert.equal(opened.runs.length, 2);

  const feedbackUrl = new URL("/api/feedback", entry.url);
  feedbackUrl.search = new URL(entry.url).search;
  const rejected = await fetch(feedbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      evaluation_id: "wrong-evaluation",
      status: "complete",
      reviews: [],
    }),
  });
  assert.equal(rejected.status, 400);

  const accepted = await fetch(feedbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      evaluation_id: state.evaluationId,
      status: "complete",
      reviews: state.runs.map((run) => ({ run_id: run.id, feedback: "" })),
    }),
  });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).evaluation_id, state.evaluationId);
});

test("canvas renderer script parses without syntax errors", async () => {
  const html = await readFile(
    path.join(
      process.cwd(),
      ".github",
      "extensions",
      "skill-eval-review",
      "review.html",
    ),
    "utf8",
  );
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, "review.html must contain its renderer script");
  assert.doesNotThrow(() => new Function(script));
});
