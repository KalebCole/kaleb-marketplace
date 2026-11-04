#!/usr/bin/env bash
set -euo pipefail

if ! command -v az >/dev/null 2>&1; then
  echo "Warning: Azure CLI (az) is not installed. Install it from https://learn.microsoft.com/cli/azure/install-azure-cli" >&2
fi
