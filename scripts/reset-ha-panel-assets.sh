#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="apps/ha-panel/dist"

cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git worktree: $REPO_ROOT" >&2
  exit 1
fi

rm -rf "$DIST_DIR"

echo "Reset HA panel generated assets:"
echo "- removed $DIST_DIR"
