# Kaleb Marketplace

Kaleb Marketplace is my personal, public collection of selected agent
plugins. It is not a universal package manager, and a listing is not a promise
that the same package works in every agent client.

Browse the current contents in the
[canonical catalog](.agents/plugins/marketplace.json). Client catalogs are
generated from this source.

## Install from the marketplace

### GitHub Copilot CLI

```bash
copilot plugin marketplace add KalebCole/kaleb-marketplace
copilot plugin marketplace browse kaleb-marketplace
copilot plugin install <plugin-name>@kaleb-marketplace
```

### Codex

```bash
codex plugin marketplace add KalebCole/kaleb-marketplace
codex plugin add <plugin-name>@kaleb-marketplace
```

Registration does not install plugins. You can also start Codex, run `/plugins`,
choose `kaleb-marketplace`, and install a plugin. Start a new session after
installation to load its skills and tools.

### Claude Code

```bash
claude plugin marketplace add KalebCole/kaleb-marketplace
claude plugin install <plugin-name>@kaleb-marketplace
```

See [usage](docs/usage.md) for install syntax, support boundaries, and native
source paths.

## Prompts and automation

The [prompt library](prompts/README.md) contains copy-paste prompts for safe
marketplace maintenance, including a Codex audit and a bounded daily sync.
Read [automation](docs/automation.md) before enabling a scheduled sync: the
repository validates and publishes marketplace changes, while each client
chooses when to refresh its own installed plugins.

## Install Impeccable

Impeccable is not a marketplace plugin. Use its supported native installer:

```bash
npx impeccable install
```

## Validate

```bash
npm ci
bash scripts/validate-marketplace.sh
```

See [contributing](docs/contributing.md) and
[maintenance](docs/maintenance.md).
