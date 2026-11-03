---
name: skill-creator
description: Create new skills, revise existing skills, and evaluate skill quality. Use when users want to capture a workflow as a skill, improve a SKILL.md, run realistic skill and baseline evaluations, review outputs, benchmark performance, refine trigger descriptions, validate a skill, or package it.
---

# Skill Creator

Create and improve skills through this loop:

1. Capture intent.
2. Draft or revise `SKILL.md`.
3. Create realistic test cases.
4. Run isolated skill and baseline evaluations.
5. Grade objective checks.
6. Show outputs and benchmark data to the user.
7. Apply feedback and repeat.
8. Validate and package when supported.

Adapt the depth to the request. If the user wants a lightweight review, inspect
the skill and give focused feedback. Do not force a full benchmark.

## Communicate clearly

Match the user's technical level. Explain uncommon terms when needed.

- An **evaluation** is a test run.
- A **benchmark** compares results across runs.
- An **assertion** is an objective check that can pass or fail.

## 1. Capture intent

First use the current conversation and existing files. Do not ask for details
that are already known.

Confirm these points when they are not clear:

- What task should the skill enable an agent to complete?
- When should the skill trigger?
- What output should it create?
- Which constraints, examples, and edge cases matter?
- Does the user want a quick review or a measured evaluation?

Research relevant documentation or similar skills when this reduces questions
for the user. Use only research tools available in the current host.

## 2. Draft the skill

Preserve the existing skill name when revising a skill.

Use this structure:

```text
skill-name/
|-- SKILL.md
|-- scripts/       # deterministic or repeated work
|-- references/    # detailed guidance loaded only when needed
`-- assets/        # templates or output resources
```

In `SKILL.md`:

- Put `name` and `description` in YAML frontmatter.
- Make the description state both the task and the trigger conditions.
- Keep all trigger guidance in the description.
- Keep the main workflow concise. Move detail to referenced files.
- Use imperative instructions.
- Explain why important constraints exist.
- Reuse host tools and repository helpers. Do not invent tools.
- State a fallback when a tool or host capability is optional.
- Avoid unsafe, deceptive, or unauthorized workflows.

Keep the body below 500 lines when practical. For a large reference file, add a
table of contents.

## 3. Create test cases

For a full evaluation, create two or three realistic prompts first. Use prompts
that resemble actual user requests. Include a difficult or near-boundary case.

Save them in `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "A realistic user request",
      "expected_output": "A short description of success",
      "files": [],
      "expectations": []
    }
  ]
}
```

Read `references/schemas.md` when creating evaluation files.

Draft objective expectations while runs execute. Prefer checks that prove the
task was completed. Do not turn subjective quality into weak numeric checks.

## 4. Run isolated evaluations

Store results in a sibling workspace:

```text
<skill-name>-workspace/
`-- iteration-1/
    `-- <eval-name>/
        |-- eval_metadata.json
        |-- with_skill/
        `-- baseline/
```

Use an isolation mechanism available in the current host, such as a background
worker, child session, or separate agent task. If the host has no isolation
mechanism, run cases one at a time in the current session and disclose that the
runs are not independent.

For each test case, start a skill run and a baseline run in the same batch.
Parallel starts reduce timing bias.

### Skill run

Give the evaluator:

- The skill path or installed skill name.
- The exact test prompt.
- Input file paths.
- The output directory.
- The artifacts that must be saved.
- A request to record a concise transcript and any errors.

Tell it to load the skill through the host's skill mechanism before it starts
the task. Do not paste the skill text into the prompt as a substitute.

### Baseline run

- For a new skill, run the same prompt without that skill.
- For an existing skill, snapshot the original skill before edits and use that
  snapshot as the baseline.

Keep the prompt, inputs, model settings, and expected artifacts equal.

Write `eval_metadata.json` beside each run:

```json
{
  "eval_id": 1,
  "eval_name": "descriptive-name",
  "prompt": "The exact test prompt",
  "expectations": []
}
```

Capture timing and usage only when the runtime returns them. Do not invent
missing metrics.

## 5. Grade and aggregate

For each run:

1. Check deterministic expectations with a script when practical.
2. Otherwise use a separate grader with `agents/grader.md`.
3. Save `grading.json` beside the run.
4. Use the exact expectation fields `text`, `passed`, and `evidence`.

Aggregate completed runs:

```bash
python -m scripts.aggregate_benchmark <iteration-path> --skill-name <name>
```

This creates `benchmark.json` and `benchmark.md`. Read
`agents/analyzer.md` for the optional analyst pass. Report weak assertions,
high variance, and time or token tradeoffs without hiding them in averages.

Use `agents/comparator.md` only when the user asks for a blind comparison or
when two versions have similar objective scores.

## 6. Present results and collect feedback

Use the bundled review viewer:

```bash
python eval-viewer/generate_review.py \
  <iteration-path> \
  --skill-name "<name>" \
  --benchmark <iteration-path>/benchmark.json
```

For iteration 2 and later, also pass:

```bash
--previous-workspace <previous-iteration-path>
```

If the host cannot open a browser, create a standalone file:

```bash
python eval-viewer/generate_review.py \
  <iteration-path> \
  --skill-name "<name>" \
  --benchmark <iteration-path>/benchmark.json \
  --static <output-path>
```

The viewer shows prompts, outputs, previous outputs, formal grades, feedback
fields, and benchmark data. Ask the user to review each case and submit the
feedback. The server mode saves `feedback.json` directly. Static mode downloads
the file; place it in the iteration workspace before continuing.

If the viewer cannot run, present the same material in the conversation and
collect feedback there.

Example feedback file:

```json
{
  "reviews": [
    {
      "run_id": "table-cleanup-with-skill",
      "feedback": "The output needs a rejected-row report."
    }
  ],
  "status": "complete"
}
```

Empty feedback means no change was requested for that case.

## 7. Improve and repeat

Apply feedback to the general workflow, not only to one test prompt.

- Remove instructions that cause repeated or unhelpful work.
- Add a helper script when several runs recreate the same deterministic logic.
- Clarify ambiguous decisions.
- Add missing error handling.
- Keep the skill concise.

Create a new iteration directory. Rerun skill and baseline cases. Open the
reviewer with the previous iteration included. Stop when the user accepts the
result, all feedback is empty, or further changes do not improve results.

## 8. Review trigger descriptions

The frontmatter description is the main trigger signal. Review it after the
workflow is stable.

Create realistic positive and negative trigger prompts. Focus on near misses.
Use a documented trigger-evaluation capability only when the current runtime
provides one.

When automated trigger evaluation is not available:

1. Review the description against the prompt set.
2. Check that it states the user's intent, not implementation details.
3. Check that positive prompts are covered.
4. Check that adjacent tasks do not match.
5. Keep the description below 1024 characters.

Do not claim measured trigger accuracy without an actual supported evaluator.

## 9. Validate and package

Run the bundled validation:

```bash
python -m scripts.quick_validate <path-to-skill>
```

Also run repository-specific validation when the skill is stored in a
repository.

If the user wants a distributable file and Python with PyYAML is available:

```bash
python -m scripts.package_skill <path-to-skill> <output-directory>
```

If packaging is not supported, return the validated skill directory and state
the limitation.

## Reference files

- `references/schemas.md`: Evaluation and benchmark JSON formats.
- `agents/grader.md`: Evidence-based grading.
- `agents/analyzer.md`: Benchmark and comparison analysis.
- `agents/comparator.md`: Optional blind output comparison.
