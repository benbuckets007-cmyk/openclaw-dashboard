#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/openclaw"
TARGET_ROOT="${OPENCLAW_HOME:-$HOME/.openclaw}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing source directory: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_ROOT"

copy_tree() {
  local src="$1"
  local dest="$2"
  mkdir -p "$dest"
  cp -R "$src"/. "$dest"/
}

copy_tree "$SOURCE_DIR/workspaces/marketing-ops" "$TARGET_ROOT/workspaces/marketing-ops"
mkdir -p "$TARGET_ROOT/agents/orchestrator/agent"

WORKSPACE_TARGET="$TARGET_ROOT/workspaces/marketing-ops"
if [[ -d "$REPO_ROOT/node_modules" ]]; then
  ln -sfn "$REPO_ROOT/node_modules" "$WORKSPACE_TARGET/node_modules"
  echo "Linked workspace node_modules -> $REPO_ROOT/node_modules"
fi

if [[ ! -f "$TARGET_ROOT/config.json5" ]]; then
  cp "$SOURCE_DIR/config/marketing-ops.config.json5" "$TARGET_ROOT/config.json5"
  echo "Installed config template to $TARGET_ROOT/config.json5"
else
  cp "$SOURCE_DIR/config/marketing-ops.config.json5" "$TARGET_ROOT/config.marketing-ops.json5"
  echo "Left existing config.json5 untouched; wrote template to $TARGET_ROOT/config.marketing-ops.json5"
fi

echo "Synced marketing-ops workspace into $TARGET_ROOT"
