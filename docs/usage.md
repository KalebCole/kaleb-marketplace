# Using Kaleb Marketplace

## Choose the distribution path

Use a **local stored plugin** when this repository intentionally stores and
licenses the plugin content. Use a **maintained external plugin reference**
when the source repository already provides a package layout that a target
client can install safely. Use a **native external installer** when the source
project publishes its own installer.

## Marketplace registration

```bash
copilot plugin marketplace add KalebCole/kaleb-marketplace
claude plugin marketplace add KalebCole/kaleb-marketplace
codex plugin marketplace add KalebCole/kaleb-marketplace
```

The marketplace name in the canonical and generated client catalogs is
`kaleb-marketplace`. Registration makes its entries available; it does not
install them.
Browse the current contents in the
[canonical catalog](../.agents/plugins/marketplace.json).

Install one item at a time:

```bash
copilot plugin install <plugin-name>@kaleb-marketplace
claude plugin install <plugin-name>@kaleb-marketplace
codex plugin add <plugin-name>@kaleb-marketplace
```

### Codex installation and permissions

These commands are supported by Codex CLI 0.156.1. Use `codex plugin add --help`
to check your installed version. You can also use `/plugins` in an interactive
Codex session to select the marketplace and install an entry.

After installation, use `codex plugin list --marketplace kaleb-marketplace --json`
to inspect installed plugins. Use `--available` to include entries that are not
installed. Start a new session to load installed skills and tools.

Review plugin content before use. Project `.codex/config.toml` settings load
only for trusted projects. Installation does not trust plugin hooks: review and
approve each current hook definition before it runs. Do not bypass hook trust,
sandbox restrictions, or approval prompts. MCP servers can require separate
authentication and tool permissions.

See the [OpenAI plugin guide](https://developers.openai.com/plugins/build/plugins)
for marketplace registration, project trust, and hook requirements.

The local package follows Agent Plugins 1.0. Most external entries use the
native package layout at the exact commit in `.agents/plugins/marketplace.json`.
Matt Pocock's plugin tracks his `main` branch so installed clients can receive
his packaged skill updates.
Successful validation for one client is not proof of support for another
client.

### Matt Pocock's skills

The `mattpocock-skills` entry uses Matt's upstream plugin and its published
skill list. It currently includes 27 skills. Skills under `skills/in-progress`
and `skills/misc` are currently excluded from Matt's manifest and are not
installed through this entry.

For automatic updates, enable marketplace auto-update in Claude Code's
Marketplaces tab. In Copilot CLI, set `autoUpdate: true` for
`kaleb-marketplace` in your user-level `extraKnownMarketplaces` settings;
repository settings cannot enable it. Matt's upstream guide says Codex refreshes
his plugin at startup. If your Codex install does not, run
`codex plugin marketplace upgrade kaleb-marketplace` and start a new session.
Each client loads a new revision on its own schedule, so their versions can
briefly differ.

See [Matt's installation guide](https://github.com/mattpocock/skills#installation-30-second-setup),
[Claude Code update settings](https://code.claude.com/docs/en/discover-plugins#keep-plugins-updated),
and [Copilot CLI update settings](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

## Native installation

Impeccable is not a marketplace entry. Use its native external installer:

```bash
npx impeccable install
npx impeccable update
```

Follow the current upstream guide at
<https://github.com/pbakaus/impeccable>.

## Update installed marketplace plugins

Refresh the catalog, then update the selected client plugins:

```bash
copilot plugin marketplace update kaleb-marketplace
copilot plugin update --all
```

A refreshed catalog can contain a reviewed external pin update or a new
revision of Matt Pocock's tracked branch. Frozen skill copies change only
through a separate, explicit source-copy review.
