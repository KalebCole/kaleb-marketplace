---
name: cli-design
description: >-
  Design, review, or build an agent-native CLI. Use when wrapping an API or
  website so an agent can call it, choosing a CLI instead of an MCP server for
  that API, checking a JSON output contract, or generating one with Printing
  Press.
---

# CLI design

Treat the CLI as the deterministic layer and the agent as the creative layer. Auth, HTTP, pagination, retries, and the output contract belong in the CLI. The agent chooses the question and interprets the answer.

For a human review surface — a plan, comparison, or diagram as a page the person can mark up — use the `lavish` skill in the `lavish-axi` plugin.

## Principles

### Output contract

Stdout is a document an agent can parse.

- Success and failure are JSON objects. A design-history CLI uses `{ "status": "success", "data", "metadata" }` or `{ "status": "error", "error": { "code", "type", "message" } }`. A printed CLI uses the envelope in its own README.
- Logs, prompts, and progress go to stderr.
- A terminal may render a table. A pipe, `--json`, or `--agent` returns JSON. Call the machine path.
- `--select` returns only the named fields. `--compact` returns the high-gravity fields (id, name, status, timestamps).
- Secrets stay out of stdout, stderr, `--verbose`, and `--dry-run`.

Typed exit codes let the caller branch without reading the message. Use the map the CLI documents.

Design-history contract:

| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | API error |
| 2 | auth error |
| 3 | validation error |
| 4 | not found |
| 5 | internal error |

Printing Press CLIs, from `internal/generator/templates/readme.md.tmpl`. Codes 4, 6, and 8 appear only when that CLI has auth, partial failure, or async jobs:

| Code | Meaning |
|------|---------|
| 0 | success |
| 2 | usage error |
| 3 | not found |
| 4 | auth error |
| 5 | API error |
| 6 | partial failure |
| 7 | rate limited (or rate limited or blocked, when the CLI has no auth) |
| 8 | async job accepted, not finished |
| 10 | config error |

Grade a printed CLI on the press map. Grade an older CLI on the map in its README.

A helper or compound command earns a place when two or more calls always happen together.

### One skill per service

Match [gws](https://github.com/googleworkspace/cli/tree/main/skills): `gws-shared`, then one skill per product (`gws-drive`, `gws-gmail`), plus a recipe only for a workflow of several commands.

### Auth recon

Name the auth method before the command tree. Stop at the first source that works:

1. The browser session already open: a session cookie or a bearer token on an XHR.
2. An env var, a credentials file, or the OS keyring.
3. The spec's security scheme.
4. A cloud CLI profile (`aws`, `az`, `gcloud`).
5. An unauthenticated probe, and the `WWW-Authenticate` header on 401.

Write the env var name, the keyring entry, or a mode-0600 path. Keep the secret out of that profile. OAuth uses PKCE, asks the user to paste the redirect, and stores the refresh token in the keyring. Runtime order is env token, credentials file, interactive login, then the system credential. `--no-input` refuses a prompt so an agent cannot hang on one.

### API recon

Take a published OpenAPI, GraphQL, or proto spec when one exists. When the useful API is the one the website calls, capture traffic while a person walks that flow. Keep method, URL, status, and body shape. Keep a call only when a plain client can replay it. Diff the logged-in surface against the logged-out one.

A HAR file is the durable capture. Live browser attach misses websockets, gRPC, and sites that block automation; import the HAR instead. Probing `/api` and `/v1` is the fallback.

### Audit

Score a hand-built CLI with the 14-point checklist from [cli-audit](https://github.com/KalebCole/cli-generation/blob/master/skills/cli-audit/references/quality-checklist.md). The checklist passes JSON-as-default and marks a `--json` flag over prose as partial. A table that switches to JSON when stdout is not a terminal satisfies check 1.

A printed CLI also has to pass Printing Press shipcheck. `cli-printing-press scorecard`, `dogfood`, and `verify` grade a printed or hand-built CLI when you pass a directory and a spec. Add a read-only live smoke when a key is available. Grade A on that scorecard is 85 or higher.

| # | Check | Wt | Pass when |
|---|-------|----|-----------|
| 1 | JSON on stdout | 10 | The agent path is JSON, and stdout is only that document |
| 2 | Typed exits | 5 | Auth, usage, and not-found use the CLI's own map |
| 3 | `--help` on every command | 5 | Generated help, with a description |
| 4 | `--dry-run` on writes | 5 | Prints the request, sends nothing, exits 0 |
| 5 | `--yes` / `--force` on destructive commands | 5 | Prompts by default. Neither flag skips `--dry-run` |
| 6 | Several formats | 10 | JSON plus a table. yaml and csv when they are cheap |
| 7 | Credential precedence | 8 | Env, file, interactive, system |
| 8 | Retry | 8 | 429 and 5xx, with backoff, jitter, and `Retry-After`. Other 4xx stay failed |
| 9 | Pagination | 7 | Follows the cursor and exposes a page cap |
| 10 | Layered skills | 8 | Shared skill plus at least one resource skill |
| 11 | README | 5 | Install, auth, commands, exits, env, troubleshooting |
| 12 | No secrets | 8 | Redacted in verbose output and dry-run |
| 13 | JSON errors | 8 | Envelope with code, type, and message |
| 14 | Tests | 8 | CRUD, auth, retry, pagination, format, exits |

## Build with Printing Press

[Printing Press](https://printingpress.dev/) ([repo](https://github.com/mvanhorn/cli-printing-press)) researches a named API, or sniffs a site that never published one, and prints a Go CLI (`<api>-pp-cli`), an MCP server (`<api>-pp-mcp`), and an agent skill, then scores the result. `/printing-press` is tested in Claude Code. Codex loads the same skills with `--agent codex`.

Search the library before printing a new one:

```bash
npx -y @mvanhorn/printing-press-library search <keyword>
npx -y @mvanhorn/printing-press-library install <slug>
```

Install the generator and the skills together. The binary alone skips the agent loop. The skills alone have nothing to run. Requires Go 1.26.10 or newer (`go.mod` and `scripts/install.sh`; the marketing page still says 1.26.3), Node for `npx`, and `$GOPATH/bin` (usually `~/go/bin`) on `PATH`.

```bash
curl -fsSL https://raw.githubusercontent.com/mvanhorn/cli-printing-press/main/scripts/install.sh | bash
cli-printing-press --version
```

That script installs the binary and the skills. To install them yourself:

```bash
go install github.com/mvanhorn/cli-printing-press/v4/cmd/cli-printing-press@latest
npx -y skills@latest add mvanhorn/cli-printing-press/skills --skill '*' -g -a claude-code -y
```

Reload the agent, then:

```text
/printing-press Notion
/printing-press https://postman.com/explore
```

Give it a spec with `--spec`, a DevTools HAR with `--har`, or a URL. The sniff gate captures traffic while a person drives the browser. It does not crawl on its own.

On a printed CLI, `--json` is also selected when stdout is not a terminal. Pass `--select` to project fields, `--dry-run` to print the request without sending it, `--no-input` to refuse prompts, and `--yes` to skip confirmation. `--agent` sets `--json --compact --no-input --no-color` unless those flags were already set. It does not set `--yes`.

Give a high-gravity resource a local SQLite mirror (`sync`, `search`, `sql`) and put compound commands on that mirror. `--data-source auto` may refresh from the network before a read; `local` does not; `live` skips the mirror.

Read the service's terms before generating. A captured API is not permission to automate it.

## Examples

- [partiful-cli](https://github.com/KalebCole/partiful-cli) — every result is JSON. `schema` prints the machine contract. `--dry-run` previews a write. `--no-input` fails closed unless `--force` is set.
- [luma-cli](https://github.com/KalebCole/luma-cli) — replays the browser session cookie `luma.auth-session-key` against the site API. JSON when piped, a table on a terminal, `--json` to force JSON.
- [gflightscli](https://github.com/KalebCole/gflightscli) — JSON by default, one skill per resource, and a helper that compares dates in one command.

Archived design history, superseded by Printing Press: [cli-generation](https://github.com/KalebCole/cli-generation) (`cli-auth-recon`, `cli-api-recon`, `cli-architect`, `cli-audit`, `cli-ideate`, `cli-skillgen`) and [cli-toolkit-skills](https://github.com/KalebCole/cli-toolkit-skills).
