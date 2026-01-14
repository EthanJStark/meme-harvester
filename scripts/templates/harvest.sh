#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$DIR/bin/node"

# Validate bundle integrity
if [[ ! -x "$NODE_BIN" ]]; then
  echo "Error: Node binary not found at $NODE_BIN" >&2
  echo "Bundle may be corrupted. Please re-download." >&2
  exit 1
fi

exec "$NODE_BIN" "$DIR/dist/cli.js" "$@"
