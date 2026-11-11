# Third-Party Notices for `kaleb-skills`

This plugin contains frozen copies of reviewed upstream skill files.

## `bro`

- Source repository: `https://github.com/dmmulroy/skills`
- Reviewed commit: `8603380821fee6a77c82639f364ce8fe4f5a92be`
- Original source path: `bro/SKILL.md`
- Copied file: `skills/bro/SKILL.md`
- Reviewed license path: `LICENSE`
- Copyright notice:
  `Copyright (c) 2026 Matt Pocock`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.

## `find-context7-docs`

- Source repository: `https://github.com/upstash/context7`
- Source branch: `master`
- Reviewed commit: `ef472a4912d594fdd193a5f929fab4c62796e287`
- Original source path: `skills/find-docs/SKILL.md`
- Source skill name: `find-docs`
- Copied file: `skills/find-context7-docs/SKILL.md`
- Reviewed license path: `LICENSE`
- Copyright notice: `Copyright (c) 2021 Upstash, Inc.`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.
- Local adjustment: frontmatter `name` changed from `find-docs` to
  `find-context7-docs`. All other content is unchanged. The scheduled updater
  preserves this rename when proposing upstream changes.

## `skill-creator`

- Source repository: `https://github.com/anthropics/skills`
- Reviewed commit: `8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4`
- Original source path: `skills/skill-creator/`
- Automated source updates: `disabled`
- Source at reviewed commit:
  <https://github.com/anthropics/skills/tree/8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4/skills/skill-creator>
- Copied files:
  - `skills/skill-creator/LICENSE.txt`
  - `skills/skill-creator/SKILL.md`
  - `skills/skill-creator/agents/analyzer.md`
  - `skills/skill-creator/agents/comparator.md`
  - `skills/skill-creator/agents/grader.md`
  - `skills/skill-creator/assets/eval_review.html`
  - `skills/skill-creator/references/schemas.md`
  - `skills/skill-creator/scripts/__init__.py`
  - `skills/skill-creator/scripts/aggregate_benchmark.py`
  - `skills/skill-creator/scripts/generate_report.py`
  - `skills/skill-creator/scripts/improve_description.py`
  - `skills/skill-creator/scripts/package_skill.py`
  - `skills/skill-creator/scripts/quick_validate.py`
  - `skills/skill-creator/scripts/run_eval.py`
  - `skills/skill-creator/scripts/run_loop.py`
  - `skills/skill-creator/scripts/utils.py`
- Reviewed license path: `skills/skill-creator/LICENSE.txt`
- Copyright notice: `Copyright 2026 Anthropic, PBC.`
- License status: Apache-2.0 permits redistribution of this directory and its
  support files. The complete directory-specific license and copyright notice
  are preserved at `skills/skill-creator/LICENSE.txt`. The plugin-level `LICENSE`
  retains the MIT notices for the other stored skills; it does not replace this
  skill's Apache-2.0 license. No applicable upstream `NOTICE` file or nested
  license override was present at the reviewed commit. Other upstream skills
  have different terms and are not included.
- Local adjustments: `skill-creator` is a locally maintained, platform-agnostic
  adaptation. Automated source updates are disabled so these maintained changes
  are not overwritten. The approved `SKILL.md` reviews results in the conversation.
  It follows the agentskills.io skill layout, states what a skill
  is not, prunes instructions that do not change behavior, and adds a pruning
  review before shipping. It does not open a review canvas. The earlier
  browser-server evaluation viewer is not part of this skill. The Copilot
  canvas at `.github/extensions/skill-eval-review/` remains in the repository
  and is unused by `SKILL.md`. Bundled agents, references, assets, and Python
  helpers also remain; `SKILL.md` does not reference them.
  `aggregate_benchmark.py` still accepts the documented single-run evaluation layout.

### Runtime dependencies and support boundaries

`SKILL.md` names user-created evaluation files such as `evals/evals.json`,
`timing.json`, `grading.json`, and `feedback.json`. Those paths are not
missing bundled files.

The copied directory still includes agent instructions, reference documents,
the HTML trigger-review template, and Python modules. `SKILL.md` does not
reference them. The Python helpers require Python 3.10 or newer. Validation
and packaging scripts import PyYAML (`import yaml` in
`scripts/quick_validate.py`). Module commands run from the installed
`skill-creator` directory; its sibling `scripts` package is included. The
packaging script's introductory `utils/package_skill.py` examples are legacy
upstream paths. The bundled entry point is `python -m scripts.package_skill`.

`scripts/run_loop.py` still expects an authenticated Claude Code CLI
(`claude -p`) and writes temporary commands under the current project's
`.claude/commands/`. `SKILL.md` does not run that loop. The trigger-review
HTML template requests Google Fonts. It requests no external scripts. The
remote fonts are not copied into this plugin and require network access.
Repository validation executes the benchmark aggregator with temporary fixture
data and bytecode writes disabled. It does not make model calls or run the
Claude-dependent helpers.

## `obsidian-cli`

- Source repository: `https://github.com/kepano/obsidian-skills`
- Reviewed commit: `3ccff5338ea700537839b21900aa5358a0402c98`
- Original source path: `skills/obsidian-cli/SKILL.md`
- Copied file: `skills/obsidian-cli/SKILL.md`
- Reviewed license path: `LICENSE`
- Copyright notice:
  `Copyright (c) 2026 Steph Ango (@kepano)`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.

## `obsidian-markdown`

- Source repository: `https://github.com/kepano/obsidian-skills`
- Reviewed commit: `3ccff5338ea700537839b21900aa5358a0402c98`
- Original source path: `skills/obsidian-markdown/SKILL.md`
- Copied files:
  - `skills/obsidian-markdown/SKILL.md`
  - `skills/obsidian-markdown/references/CALLOUTS.md`
  - `skills/obsidian-markdown/references/EMBEDS.md`
  - `skills/obsidian-markdown/references/PROPERTIES.md`
- Reviewed license path: `LICENSE`
- Copyright notice:
  `Copyright (c) 2026 Steph Ango (@kepano)`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.
