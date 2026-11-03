import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".c", ".cpp", ".cs", ".css", ".csv", ".go", ".h", ".hpp", ".html",
  ".java", ".js", ".json", ".jsx", ".md", ".py", ".r", ".rb", ".rs",
  ".sh", ".sql", ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);
const IMAGE_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const METADATA_FILES = new Set(["metrics.json", "transcript.md", "user_notes.md"]);
const EVALUATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function validateEvaluationId(value) {
  if (!EVALUATION_ID_PATTERN.test(value)) {
    throw new Error(
      "evaluationId must start with an alphanumeric character and contain only letters, numbers, '.', '_', or '-'.",
    );
  }
  return value;
}

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function readJson(target, fallback = null) {
  try {
    return JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw new Error(`Cannot read JSON from ${target}: ${error.message}`);
  }
}

function mimeType(extension) {
  return {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  }[extension] ?? "application/octet-stream";
}

async function embedFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  if (TEXT_EXTENSIONS.has(extension)) {
    return { name, type: "text", content: await readFile(filePath, "utf8") };
  }

  const content = (await readFile(filePath)).toString("base64");
  if (IMAGE_EXTENSIONS.has(extension)) {
    return { name, type: "image", dataUri: `data:${mimeType(extension)};base64,${content}` };
  }
  if (extension === ".pdf") {
    return { name, type: "pdf", dataUri: `data:application/pdf;base64,${content}` };
  }
  return {
    name,
    type: "binary",
    dataUri: `data:${mimeType(extension)};base64,${content}`,
  };
}

async function findMetadata(runDirectory) {
  for (const candidate of [
    path.join(runDirectory, "eval_metadata.json"),
    path.join(path.dirname(runDirectory), "eval_metadata.json"),
  ]) {
    const metadata = await readJson(candidate);
    if (metadata) {
      return metadata;
    }
  }
  return {};
}

async function findGrading(runDirectory) {
  for (const candidate of [
    path.join(runDirectory, "grading.json"),
    path.join(path.dirname(runDirectory), "grading.json"),
  ]) {
    const grading = await readJson(candidate);
    if (grading) {
      return grading;
    }
  }
  return null;
}

function configurationFromPath(relativePath) {
  const segments = relativePath.split(path.sep);
  if (segments.includes("with_skill") || segments.includes("new_skill")) {
    return "skill";
  }
  if (segments.includes("baseline") || segments.includes("without_skill") || segments.includes("old_skill")) {
    return "baseline";
  }
  return "unknown";
}

async function buildRun(workspacePath, runDirectory) {
  const relativePath = path.relative(workspacePath, runDirectory);
  const metadata = await findMetadata(runDirectory);
  const outputsDirectory = path.join(runDirectory, "outputs");
  const outputs = [];
  for (const entry of await readdir(outputsDirectory, { withFileTypes: true })) {
    if (entry.isFile() && !METADATA_FILES.has(entry.name)) {
      outputs.push(await embedFile(path.join(outputsDirectory, entry.name)));
    }
  }
  outputs.sort((left, right) => left.name.localeCompare(right.name));

  return {
    id: relativePath.split(path.sep).join("-"),
    evalId: metadata.eval_id ?? null,
    prompt: metadata.prompt || "(No prompt found)",
    expectedOutput: metadata.expected_output ?? "",
    configuration: configurationFromPath(relativePath),
    outputs,
    grading: await findGrading(runDirectory),
  };
}

async function discoverRuns(workspacePath, currentPath, runs) {
  if (await isDirectory(path.join(currentPath, "outputs"))) {
    runs.push(await buildRun(workspacePath, currentPath));
    return;
  }

  const skipped = new Set([".git", "__pycache__", "inputs", "node_modules", "skill"]);
  for (const entry of await readdir(currentPath, { withFileTypes: true })) {
    if (entry.isDirectory() && !skipped.has(entry.name)) {
      await discoverRuns(workspacePath, path.join(currentPath, entry.name), runs);
    }
  }
}

export async function loadRuns(workspacePath) {
  if (!(await isDirectory(workspacePath))) {
    throw new Error(`Evaluation workspace does not exist: ${workspacePath}`);
  }
  const runs = [];
  await discoverRuns(workspacePath, workspacePath, runs);
  runs.sort((left, right) => (
    (left.evalId ?? Number.MAX_SAFE_INTEGER) - (right.evalId ?? Number.MAX_SAFE_INTEGER)
    || left.configuration.localeCompare(right.configuration)
    || left.id.localeCompare(right.id)
  ));
  if (runs.length === 0) {
    throw new Error(`No evaluation outputs were found in ${workspacePath}`);
  }
  return runs;
}

async function loadPrevious(previousWorkspacePath) {
  if (!previousWorkspacePath) {
    return {};
  }
  const runs = await loadRuns(previousWorkspacePath);
  const feedback = await readJson(path.join(previousWorkspacePath, "feedback.json"), { reviews: [] });
  const feedbackByRun = new Map(
    (feedback.reviews ?? []).map((review) => [review.run_id, review.feedback ?? ""]),
  );
  return Object.fromEntries(runs.map((run) => [
    run.id,
    { outputs: run.outputs, feedback: feedbackByRun.get(run.id) ?? "" },
  ]));
}

export async function loadReviewState({
  evaluationId,
  workspacePath,
  skillName,
  benchmarkPath,
  previousWorkspacePath,
}) {
  validateEvaluationId(evaluationId);
  const resolvedWorkspace = path.resolve(workspacePath);
  const benchmark = benchmarkPath ? await readJson(path.resolve(benchmarkPath)) : null;
  const feedback = await readJson(path.join(resolvedWorkspace, "feedback.json"), {
    evaluation_id: evaluationId,
    reviews: [],
    status: "in_progress",
  });
  if (feedback.evaluation_id && feedback.evaluation_id !== evaluationId) {
    throw new Error(
      `The feedback file belongs to evaluation '${feedback.evaluation_id}', not '${evaluationId}'.`,
    );
  }
  return {
    evaluationId,
    skillName,
    workspacePath: resolvedWorkspace,
    runs: await loadRuns(resolvedWorkspace),
    benchmark,
    previous: await loadPrevious(previousWorkspacePath ? path.resolve(previousWorkspacePath) : null),
    feedback: { ...feedback, evaluation_id: evaluationId },
  };
}

export function validateFeedbackPayload(payload, state, requiredStatus) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Feedback must be a JSON object.");
  }
  if (payload.evaluation_id !== state.evaluationId) {
    throw new Error(`Feedback evaluation_id must equal '${state.evaluationId}'.`);
  }
  if (!Array.isArray(payload.reviews)) {
    throw new Error("Feedback reviews must be an array.");
  }
  if (!["in_progress", "complete"].includes(payload.status)) {
    throw new Error("Feedback status must be 'in_progress' or 'complete'.");
  }
  if (requiredStatus && payload.status !== requiredStatus) {
    throw new Error(`Feedback status must be '${requiredStatus}'.`);
  }

  const validRunIds = new Set(state.runs.map((run) => run.id));
  const seen = new Set();
  const reviews = payload.reviews.map((review) => {
    if (!review || typeof review !== "object" || Array.isArray(review)) {
      throw new Error("Each review must be an object.");
    }
    if (!validRunIds.has(review.run_id)) {
      throw new Error(`Unknown run_id '${review.run_id}'.`);
    }
    if (seen.has(review.run_id)) {
      throw new Error(`Duplicate review for run_id '${review.run_id}'.`);
    }
    seen.add(review.run_id);
    if (typeof review.feedback !== "string") {
      throw new Error(`Feedback for '${review.run_id}' must be a string.`);
    }
    return {
      run_id: review.run_id,
      feedback: review.feedback,
      timestamp: typeof review.timestamp === "string"
        ? review.timestamp
        : new Date().toISOString(),
    };
  });

  if (payload.status === "complete" && reviews.length !== state.runs.length) {
    throw new Error("Complete feedback must include one review for every run.");
  }
  return {
    evaluation_id: state.evaluationId,
    reviews,
    status: payload.status,
    updated_at: new Date().toISOString(),
  };
}

export async function saveFeedback(state, payload, requiredStatus) {
  const feedback = validateFeedbackPayload(payload, state, requiredStatus);
  const feedbackPath = path.join(state.workspacePath, "feedback.json");
  const temporaryPath = `${feedbackPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(feedback, null, 2)}\n`, "utf8");
  await rename(temporaryPath, feedbackPath);
  state.feedback = feedback;
  return feedback;
}
