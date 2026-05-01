#!/usr/bin/env bash
set -euo pipefail

set +e
rg -n "issue #[0-9]+|Issue #[0-9]+|issue-[0-9]+|GitHub issue|\\|[[:space:]]*#[0-9]+[[:space:]]*\\||EPIC|epic|child issue|blocking issue|this PR|pull request|branch name|agent plan|future .* issue|this document is for|artifact for|as requested|work item|task list|closes #" \
  README.md docs research testnet \
  --glob "*.md" --glob "*.ts" --glob "!testnet/artifacts/**"
status=$?
set -e

if [ "$status" -eq 0 ]; then
  echo "Public-document contamination matches found." >&2
  exit 1
fi

if [ "$status" -eq 1 ]; then
  echo "No public-document contamination matches found."
  exit 0
fi

exit "$status"
