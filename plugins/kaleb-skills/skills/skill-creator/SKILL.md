---
name: skill-creator
description: >-
  Create and improve skills through a draft, test, review, and rewrite loop.
  Use when creating a new skill, turning a workflow into a skill, editing or
  improving an existing skill, testing a skill against example prompts, or
  tightening a skill's description so it triggers on the right requests.
license: Apache-2.0
---
# Skill Creator

Create new skills and improve existing ones through a draft, test, review, improve loop.

The loop:
- Decide what the skill should do and roughly how.
- Write a draft.
- Write 2-3 realistic test prompts and run them with the skill (and a baseline without it).
- Review the results with the user in chat, qualitatively and with simple pass/fail checks where outputs are objectively verifiable.
- Rewrite based on feedback and any glaring flaws.
- Repeat until the user is happy, then widen the test set.

Figure out where the user is in this loop and pick up from there. If they already have a draft, go straight to testing. If they say "just vibe with me", skip formal evals.

Match the user's technical level. Briefly define terms like "assertion" or "baseline" unless they clearly know them.

## 1. Capture intent

If the conversation already contains the workflow ("turn this into a skill"), extract it first: tools used, step order, corrections the user made, input and output formats. Then confirm gaps:
1. What should the skill let an agent do?
2. When should it trigger (phrases, contexts)?
3. What is the output format?
4. Does it need test cases? Objectively checkable outputs (file transforms, data extraction, fixed workflow steps) benefit; subjective ones (writing style) often don't. Suggest a default, let the user decide.

Ask about edge cases, inputs, example files, success criteria and dependencies before writing tests. Use available connectors and docs to research so the user carries less of the load.

Before editing, copy the existing skill folder. Use that unchanged copy for the baseline runs.

## 2. Write the skill to the Agent Skills standard (agentskills.io)

Every SKILL.md starts with YAML frontmatter, then markdown instructions. These fields and limits are the [Agent Skills spec](https://agentskills.io/specification):

```
---
name: skill-name
description: What this skill does and when to use it.
---
```

- **name** (required): 1-64 characters. Unicode lowercase letters, digits, and hyphens only. Must not start or end with a hyphen, must not contain `--`, and must match the parent directory name. Name a new skill verb-first, for the action it performs (`schedule-interview`, not `interview-scheduling`), so the name reads as what the agent will do.
- **description** (required): 1-1024 characters. What the skill does and when to use it, with keywords an agent can match. This is the only field an agent sees when deciding to load the skill, so it is the trigger. Cover each distinct use. Agents under-trigger, so phrase it to catch implicit requests ("Use when the user asks to display metrics or trends in a dashboard", not "Build a dashboard"). No lists of synonyms, no workflow details.
- **license** (optional): a short license name, or the name of a bundled license file, such as `Apache-2.0` or `Proprietary. LICENSE.txt has complete terms`.
- **compatibility** (optional): 1-500 characters when present. Environment requirements only, such as an intended product, system packages, or network access. Omit it when the skill has none.
- **metadata** (optional): a map of string keys to string values for properties the spec does not define. Keep key names specific enough to avoid clashes. Example: `author: example-org` and `version: "1.0"`.
- **allowed-tools** (optional): one space-separated string of pre-approved tools, such as `Bash(git:*) Bash(jq:*) Read`. Experimental, and support varies by agent.
- **Body**: the instructions, in markdown. No required sections.

Folder layout:

```
skill-name/
├── SKILL.md
├── scripts/     deterministic, repeatable code the skill runs
├── references/  docs loaded only when needed
└── assets/      templates and files used in output
```

Progressive disclosure: `name` and `description` load at startup, the body loads when the skill is triggered (keep it under 500 lines; the spec recommends under 5000 tokens), and bundled files load on demand. Point to each reference file with when to read it; give long references a table of contents. For multi-variant skills, keep the workflow in SKILL.md and one reference file per variant. Reference other files with paths relative to the skill root, one level deep.

### What a skill is not

A skill is a reusable, self-contained capability. Keep these out of it:
- **No user name or agent persona.** The agent already knows who it works for. Write the task, not an identity.
- **Project-management context.** No ticket numbers, map or backlog references, PR history, or "built for ticket B3".
- **Scheduling and automation.** When or how often it runs belongs in the routine or caller that invokes it. The skill just does the job when loaded.
- **Artificial stop points.** Don't write "stop here" or "wait for approval before continuing" unless the step genuinely needs a human decision (sending, submitting, paying); say why when it does.
- **Secrets.** No tokens, passwords or account numbers; reference where they live (an env var name or a local file path).

### Writing style

- Imperative voice.
- Explain why a step matters instead of shouting MUST/NEVER. All-caps rules are a yellow flag; give the reason so the model can generalize.
- Keep it general, not overfit to one example.
- Show output formats as an exact template, and include short input/output examples where they help.
- Push deterministic, repeated work into `scripts/` to save tokens and reduce drift.
- Nothing in the skill should surprise the user if described; no malicious or deceptive skills.

### Pruning

Describe only the functionality: how to do the job. Drop limits, caveats and scope notes that don't change behavior. Then prune the draft line by line:
- **One source of truth.** Each meaning lives in one place, so changing a behavior is a one-place edit. Duplicates cost tokens and inflate a rule's prominence.
- **The environment is a source of truth.** Don't restate what a script's `--help`, a schema, a config or the folder layout already says; point to the lookup. Write down only what the agent can't find by looking: unwritten conventions, the reason behind a choice, gotchas.
- **Relevance.** Every line must still bear on what the skill does. Cut exposition, stale lines, and branches that belong in a reference file.
- **No-ops.** Delete any sentence the model would obey by default (test: does it change behavior versus the default?). Delete the whole sentence, don't trim words. If a leading word is too weak to beat the default, use a stronger word.

## 3. Test cases

Write 2-3 realistic prompts, the way a real user would phrase them, and show them to the user: "here are the tests I want to run, look right?" Save them to `evals/evals.json`:

```json
{"skill_name": "example-skill", "evals": [{"id": 1, "prompt": "...", "expected_output": "...", "files": []}]}
```

## 4. Run and grade

Put results in `<skill-name>-workspace/iteration-N/<eval-name>/` next to the skill folder.

- For each test, launch two background workers at the same time: one with the skill (`with_skill/outputs/`) and a baseline (`without_skill/` for a new skill, or the unchanged copy in `old_skill/` when improving one). Launch them together so they finish together.
- While they run, draft pass/fail checks (assertions) for the objectively verifiable parts, with descriptive names, and explain them to the user. Don't force checks onto subjective qualities.
- As each worker finishes, record its duration and token use in `timing.json` when those figures are available.
- Grade each run: script the checks where possible, otherwise judge against the outputs. Save `grading.json` with `text`, `passed`, `evidence` per check.
- When the runs are independent, summarize pass rate, time and tokens for with-skill vs baseline, and patterns the averages hide (checks that pass either way, flaky tests, cost tradeoffs).

If the runs are not independent, report each check and the user's feedback. Skip numerical comparisons.

## 5. Review in chat

Present results in the conversation: for each test, the prompt, a short description or excerpt of the output (attach output files), the check results, and then the overall comparison. Ask for feedback per test. An empty comment is acceptance only after the user confirms review is complete. Until then, a test with no feedback is not reviewed. Save the feedback to `iteration-N/feedback.json` (`run_id`, `feedback`) so the next iteration can reference it.

## 6. Improve and repeat

- Generalize from the feedback. The skill will run on many prompts beyond these tests, so avoid narrow fixes; if something is stubborn, try a different framing or pattern.
- Keep it lean. Read the run transcripts, not just outputs; cut instructions that make the model waste effort.
- Explain the why behind each instruction.
- If every run reinvented the same helper, bundle it in `scripts/`.

Rerun all tests into `iteration-N+1/` with baselines, review again, and stop when the user says they are happy, when they confirm review is complete and every comment is empty, or when progress stalls. Empty feedback alone does not stop the loop.

## 7. Description check (optional)

Offer to tune the description. Write ~20 realistic queries: 8-10 that should trigger and 8-10 near-misses that share keywords but need something else (obviously unrelated negatives test nothing). Use concrete, casual, varied phrasing. Review the list with the user in chat, then judge whether the description separates them; revise and show before/after. Don't claim measured trigger accuracy unless you actually ran a trigger test.

## 8. Pruning review

Before shipping, hand the draft to a fresh reviewer: a background worker with no conversation history that gets only the skill folder and the "What a skill is not" and "Pruning" sections above. The author tends to keep its own lines; a fresh reader sees what is redundant. Ask it to return a list of cuts and rewrites, each with the rule it violates, not a rewritten file. Apply the cuts that hold up, rerun the tests if behavior could change, and show the user the before and after line counts. Without isolated workers, do the pass yourself, reading the draft line by line against those sections.

## 9. Ship

- Updating an existing skill: keep its name and folder unchanged.
- Save it with this agent's other skills, or in the skill's repository, and return the validated folder or link to the user.
