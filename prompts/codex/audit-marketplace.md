# Audit Kaleb Marketplace in Codex

Use this before enabling a scheduled sync. It is read-only.

## Copy-paste prompt

> Audit my local `kaleb-marketplace` setup without making any changes. Confirm
> that the Git marketplace `KalebCole/kaleb-marketplace` is registered; list
> only plugins installed from that marketplace with their installed versions
> and enabled state; refresh nothing; and compare the installed set with the
> marketplace catalog. Report: (1) whether the marketplace is configured,
> (2) installed plugins that have an available update or mismatch, and (3) any
> missing catalog entries. Do not install, remove, enable, disable, update, or
> authenticate anything. Keep the result to a short status summary.

## Expected result

The audit identifies drift without changing the local machine. Run it manually
after first registering the marketplace and again after any client update
failure.
