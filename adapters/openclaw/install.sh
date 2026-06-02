#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$HOME/.openclaw/skills/nessie"
SHARED_DEST="$HOME/.config/nessie/skill/scripts"

mkdir -p "$DEST/scripts" "$SHARED_DEST"
cp "$REPO_ROOT/adapters/openclaw/SKILL.md" "$DEST/SKILL.md"
cp "$REPO_ROOT/shared/"*.sh "$DEST/scripts/"
cp "$REPO_ROOT/shared/"*.sh "$SHARED_DEST/"
chmod +x "$DEST/scripts/"*.sh "$SHARED_DEST/"*.sh

echo "Installed Nessie skill for OpenClaw at $DEST"
echo "Run $DEST/scripts/login.sh to authenticate."

