#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${WEBSITES_MCP_DIR:-$HOME/.openclaw/runtime/websites-mcp}"
RUNTIME_SRC="$SKILL_DIR/runtime"

if [[ ! -d "$RUNTIME_SRC" ]]; then
  echo "Runtime source not found at: $RUNTIME_SRC" >&2
  echo "Ensure the skill was installed correctly." >&2
  exit 1
fi

echo "Installing runtime from skill package..."
echo "  Source : $RUNTIME_SRC"
echo "  Target : $RUNTIME_DIR"

mkdir -p "$RUNTIME_DIR"
cp -r "$RUNTIME_SRC/." "$RUNTIME_DIR/"

cd "$RUNTIME_DIR"
echo "Installing dependencies..."
npm install --ignore-scripts

echo
echo "Runtime ready at: $RUNTIME_DIR"
echo "Next: configure ~/.openclaw/openclaw.json per docs/CONFIGURATION.md"
echo "Then run: PROSPAIRROW_API_KEY='...' npm run mcp:writes"
