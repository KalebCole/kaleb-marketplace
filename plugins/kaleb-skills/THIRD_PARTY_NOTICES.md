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

## `skill-creator`

- Source repository: `https://github.com/anthropics/skills`
- Reviewed commit: `8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4`
- Original source path: `skills/skill-creator/`
- Source at reviewed commit:
  <https://github.com/anthropics/skills/tree/8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4/skills/skill-creator>
- Copied files:
  - `skills/skill-creator/LICENSE.txt`
  - `skills/skill-creator/SKILL.md`
  - `skills/skill-creator/agents/analyzer.md`
  - `skills/skill-creator/agents/comparator.md`
  - `skills/skill-creator/agents/grader.md`
  - `skills/skill-creator/assets/eval_review.html`
  - `skills/skill-creator/eval-viewer/generate_review.py`
  - `skills/skill-creator/eval-viewer/viewer.html`
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
- Local adjustments: none. All 18 files, including invocation metadata, are
  unchanged. This is a frozen skill copy, not an external catalog reference or
  an automatically updated source.

### Runtime dependencies and support boundaries

All referenced agent instructions, reference documents, Python modules, and HTML
templates are included. No other upstream skill or repository-level template is
required. Paths such as `evals/evals.json`, `timing.json`, and `feedback.json`
refer to user-created evaluation inputs and outputs, not missing bundled files.

The Python helpers require Python 3.10 or newer. Validation and packaging also
require PyYAML (`import yaml` in `scripts/quick_validate.py`). Run module commands
from the installed `skill-creator` directory as shown in `SKILL.md`; its sibling
`scripts` package is included. The packaging script's introductory
`utils/package_skill.py` examples are legacy upstream paths; the actual bundled
entry point is `python -m scripts.package_skill`, as specified in `SKILL.md`.

Description optimization requires an authenticated Claude Code CLI (`claude -p`)
and writes temporary commands under the current project's `.claude/commands/`.
It is not a Copilot-native evaluation backend. Subagent and presentation steps
depend on the host's available tools; storage and catalog validation do not prove
equivalent execution in every client.

The HTML templates request Google Fonts. The evaluation viewer requests
SheetJS 0.20.3 from its upstream CDN, with the upstream integrity attribute, for
spreadsheet rendering. These remote resources are not copied into this plugin;
those features require network access. The Python viewer otherwise uses only
the standard library and includes a `--static` output mode. Its unchanged server
mode attempts to terminate existing listeners on the selected port; use static
mode in a shared environment. Repository validation does not execute these
bundled helpers or make model calls.

## `copilot-delegate`

- Source repository: `https://github.com/amElnagdy/delegate-skills`
- Reviewed commit: `6826b363085dcc80875372315fe7d208c4bf733f`
- Original source directory: `skills/copilot-delegate/`
- Source at reviewed commit:
  <https://github.com/amElnagdy/delegate-skills/tree/6826b363085dcc80875372315fe7d208c4bf733f/skills/copilot-delegate>
- Copied files:
  - `skills/copilot-delegate/SKILL.md`
  - `skills/copilot-delegate/references/dispatch-and-poll.md`
  - `skills/copilot-delegate/references/multi-task-queues.md`
  - `skills/copilot-delegate/references/review-and-land.md`
  - `skills/copilot-delegate/references/writing-the-brief.md`
  - `skills/copilot-delegate/scripts/relay.mjs`
- Reviewed license path: `LICENSE` (repository root; no license override
  exists in the skill directory)
- Copyright notice: `Copyright (c) 2026 Ahmed Mohammed (amElnagdy)`
- License status: MIT. The reviewed root `LICENSE` applies to this skill and
  its complete text and copyright notice are included in the plugin-level
  `LICENSE`.
- The references linked by `SKILL.md` are included. The relay uses Node
  built-ins only; its normal dispatch does not depend on another skill.
- Optional dependency blocker: relay `--lane` requires the separate
  `delegate-setup/scripts/lane.mjs` skill beside this relay. That unrelated
  skill is not included, so `--lane` is unavailable in this copy unless the
  user installs `delegate-setup` in the expected sibling location.
- Local adjustment: `disable-model-invocation: true` was added to `SKILL.md` so
  the user can invoke the skill directly and the model cannot invoke it
  automatically. Other copied content and metadata are unchanged. This is a
  frozen skill copy; it has no automatic updater or separate external catalog
  entry.

## `grilling`

- Source repository: `https://github.com/mattpocock/skills`
- Reviewed commit: `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`
- Original source path: `skills/productivity/grilling/SKILL.md`
- Copied file: `skills/grilling/SKILL.md`
- Reviewed license path: `LICENSE`
- Copyright notice:
  `Copyright (c) 2026 Matt Pocock`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.

## `grill-me`

- Source repository: `https://github.com/mattpocock/skills`
- Reviewed commit: `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`
- Original source path: `skills/productivity/grill-me/SKILL.md`
- Copied file: `skills/grill-me/SKILL.md`
- Reviewed license path: `LICENSE`
- Copyright notice:
  `Copyright (c) 2026 Matt Pocock`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.

## `wizard`

- Source repository: `https://github.com/mattpocock/skills`
- Reviewed commit: `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`
- Original source directory: `skills/engineering/wizard/`
- Copied files (relative paths preserved from the original directory):
  - `skills/wizard/SKILL.md`
  - `skills/wizard/template.sh`
  - `skills/wizard/agents/openai.yaml`
- Reviewed license path: `LICENSE` (the only applicable upstream license)
- Copyright notice:
  `Copyright (c) 2026 Matt Pocock`
- License status: MIT; `LICENSE` in this plugin reproduces the reviewed MIT
  text from the source repository.
- All three files are unchanged frozen copies, including invocation settings.
  `template.sh` is the skill's only relative file reference; no other skill is
  required. Generated wizards use Bash and standard command-line utilities.
  Browser opening uses an available platform opener or manual URL entry;
  GitHub secret/variable writes use authenticated `gh` or report skipped writes.
  `shellcheck` is optional. No upstream script was executed during inspection.

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
