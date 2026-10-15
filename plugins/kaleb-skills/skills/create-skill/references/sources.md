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
paths and `@` behavior, runtime tool mappings, mandatory failing baselines,
skill-level RED-GREEN-REFACTOR framing, the Iron Law, and pressure or
rationalization doctrine. Mermaid replaces Graphviz/DOT.

`anthropic-best-practices.md` is copied without modification from the reviewed
Superpowers commit. The main skill identifies its vendor-specific scope.

Pinned copy verification:

- SHA-256:
  `FD22568D2460D0BFD37783420D2CEC18CD3813F8F2A74EB72804C0E8026069C3`
- Verify by hashing the local file and comparing the result with the raw file
  at the reviewed commit.

The plugin-level `LICENSE` reproduces the Superpowers MIT notice and terms.

## Matt Pocock `tdd`

- Repository: <https://github.com/mattpocock/skills>
- Reviewed commit:
  <https://github.com/mattpocock/skills/commit/3f599139104dfceabc7754eeb91319802f85e042>
- Source:
  <https://github.com/mattpocock/skills/blob/3f599139104dfceabc7754eeb91319802f85e042/skills/engineering/tdd/SKILL.md>
- Copyright: Copyright (c) 2026 Matt Pocock
- License: MIT

`tdd.md` is a tailored runtime-neutral adaptation. It keeps behavior-focused
tests, public seams, anti-patterns, vertical slices, tracer bullets, and red
before green. It removes dependencies on named skill tools and
repository-specific skills. It explains uncommon terms. It also states that
software TDD does not govern skill authoring or validation.

The plugin-level `LICENSE` already reproduces the Matt Pocock MIT notice and
terms.

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
