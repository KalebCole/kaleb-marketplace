import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";

import { loadReviewState, saveFeedback } from "./review-model.mjs";
import { startReviewServer } from "./review-server.mjs";

const extensionDirectory = path.dirname(fileURLToPath(import.meta.url));
const reviewHtml = await readFile(path.join(extensionDirectory, "review.html"), "utf8");
const instances = new Map();

function instance(ctx) {
  const entry = instances.get(ctx.instanceId);
  if (!entry) {
    throw new CanvasError("review_not_open", "Open the evaluation review canvas first.");
  }
  return entry;
}

const reviewCanvas = createCanvas({
  id: "skill-eval-review",
  displayName: "Skill evaluation review",
  description: "Review skill and baseline evaluation outputs, grades, benchmarks, prior iterations, and feedback.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      evaluationId: {
        type: "string",
        minLength: 1,
        maxLength: 128,
        pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
      },
      workspacePath: { type: "string", minLength: 1 },
      skillName: { type: "string", minLength: 1 },
      benchmarkPath: { type: "string", minLength: 1 },
      previousWorkspacePath: { type: "string", minLength: 1 },
    },
    required: ["evaluationId", "workspacePath", "skillName"],
  },
  actions: [
    {
      name: "refresh",
      description: "Reload evaluation outputs, grades, benchmark data, prior iteration data, and saved feedback.",
      handler: async (ctx) => {
        const entry = instance(ctx);
        Object.assign(entry.state, await loadReviewState(entry.input));
        return {
          evaluationId: entry.state.evaluationId,
          runCount: entry.state.runs.length,
          status: entry.state.feedback.status,
        };
      },
    },
    {
      name: "get_feedback",
      description: "Read the feedback saved for this evaluation.",
      handler: (ctx) => instance(ctx).state.feedback,
    },
    {
      name: "submit_feedback",
      description: "Persist complete per-run feedback for this evaluation.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          evaluation_id: { type: "string", minLength: 1 },
          reviews: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                run_id: { type: "string", minLength: 1 },
                feedback: { type: "string" },
                timestamp: { type: "string" },
              },
              required: ["run_id", "feedback"],
            },
          },
          status: { const: "complete" },
        },
        required: ["evaluation_id", "reviews", "status"],
      },
      handler: async (ctx) => saveFeedback(instance(ctx).state, ctx.input, "complete"),
    },
  ],
  open: async (ctx) => {
    let entry = instances.get(ctx.instanceId);
    if (!entry) {
      const input = {
        ...ctx.input,
        workspacePath: path.resolve(ctx.input.workspacePath),
        benchmarkPath: ctx.input.benchmarkPath ? path.resolve(ctx.input.benchmarkPath) : undefined,
        previousWorkspacePath: ctx.input.previousWorkspacePath
          ? path.resolve(ctx.input.previousWorkspacePath)
          : undefined,
      };
      const state = await loadReviewState(input);
      entry = { ...(await startReviewServer(state, reviewHtml)), input };
      instances.set(ctx.instanceId, entry);
    }
    return {
      title: `Eval review: ${entry.state.skillName}`,
      status: `${entry.state.runs.length} runs`,
      url: entry.url,
    };
  },
  onClose: async (ctx) => {
    const entry = instances.get(ctx.instanceId);
    if (!entry) return;
    instances.delete(ctx.instanceId);
    await new Promise((resolve) => entry.server.close(resolve));
  },
});

await joinSession({ canvases: [reviewCanvas] });
