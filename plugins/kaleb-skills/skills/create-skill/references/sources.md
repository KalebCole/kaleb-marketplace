# Sources and Licenses

## Superpowers `writing-skills`

- Repository: <https://github.com/obra/superpowers>
- Reviewed commit:
  <https://github.com/obra/superpowers/commit/5bf4e78011075bcfc0dc295f0724994cd123ee71>
- Source skill:
  <https://github.com/obra/superpowers/blob/5bf4e78011075bcfc0dc295f0724994cd123ee71/skills/writing-skills/SKILL.md>
- Vendor-specific reference:
  <https://github.com/obra/superpowers/blob/5bf4e78011075bcfc0dc295f0724994cd123ee71/skills/writing-skills/anthropic-best-practices.md>
- Copyright: Copyright (c) 2025 Jesse Vincent
- License: MIT

`../SKILL.md` is an adaptation of `writing-skills/SKILL.md`. It keeps the useful
structure and guidance for skill purpose, creation criteria, skill types,
package structure, frontmatter, discovery, keyword coverage, naming, token
efficiency, progressive disclosure, concise examples, file organization,
formal diagrams, common mistakes, type-specific testing, success criteria, and
verification.

The adaptation removes Superpowers names and prerequisites, Claude-specific
paths and `@` behavior, runtime tool mappings, the Iron Law, and pressure or
rationalization doctrine. It keeps the skill-level RED-GREEN-REFACTOR method.
Mermaid replaces Graphviz/DOT.

`anthropic-best-practices.md` is copied without modification from the reviewed
Superpowers commit. The main skill identifies its vendor-specific scope.

Pinned copy verification:

- SHA-256:
  `FD22568D2460D0BFD37783420D2CEC18CD3813F8F2A74EB72804C0E8026069C3`
- Verify by hashing the local file and comparing the result with the raw file
  at the reviewed commit.

The plugin-level `LICENSE` reproduces the Superpowers MIT notice and terms.

## Superpowers `test-driven-development`

- Repository: <https://github.com/obra/superpowers>
- Reviewed commit:
  <https://github.com/obra/superpowers/commit/5bf4e78011075bcfc0dc295f0724994cd123ee71>
- Source:
  <https://github.com/obra/superpowers/blob/5bf4e78011075bcfc0dc295f0724994cd123ee71/skills/test-driven-development/SKILL.md>
- Copyright: Copyright (c) 2025 Jesse Vincent
- License: MIT
- Pinned source SHA-256:
  `64B03FCE4AEE5A97A93160CEA8111F3BA13A17B7C001DB4BD5836D67FD10705D`

`tdd.md` adapts this source and the `writing-skills` TDD mapping to skill
authoring. It keeps RED, GREEN, REFACTOR, failure verification, minimal changes,
regression checks, common mistakes, and final verification. It replaces
software production code with skill instructions and replaces software tests
with realistic agent scenarios. It removes runtime-specific commands, the Iron
Law, and pressure or rationalization doctrine.

## Anthropic Vendor Scope

The pinned vendor reference identifies itself as Anthropic guidance and links
to Anthropic documentation, including:

- <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview>
- <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>

These statements describe Anthropic products. They remain inside the unmodified
vendor reference. The runtime-neutral main skill does not present them as
universal rules.

No separate Anthropic copyright or license statement appears in the pinned
reference file. This repository distributes that copied file under the
reviewed Superpowers repository's MIT license.
