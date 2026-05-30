#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while IFS= read -r script; do
  bash -n "$script"
done < <(find "$REPO_ROOT" -type f -name "*.sh" -print)

tmp_home="$(mktemp -d)"
trap 'rm -rf "$tmp_home"' EXIT

HOME="$tmp_home" "$REPO_ROOT/adapters/openclaw/install.sh" >/dev/null
HOME="$tmp_home" "$REPO_ROOT/adapters/hermes/install.sh" >/dev/null

test -f "$tmp_home/.openclaw/skills/nessie/SKILL.md"
test -x "$tmp_home/.openclaw/skills/nessie/scripts/login.sh"
test -f "$tmp_home/.hermes/skills/productivity/nessie/SKILL.md"
test -x "$tmp_home/.hermes/skills/productivity/nessie/scripts/login.sh"
test -x "$tmp_home/.config/nessie/skill/scripts/search.sh"

echo "Nessie skill validation passed."
