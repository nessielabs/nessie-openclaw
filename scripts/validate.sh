#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while IFS= read -r -d '' script; do
  bash -n "$script"
done < <(find "$REPO_ROOT" -type f -name "*.sh" -print0)

tmp_home="$(mktemp -d)"
trap 'rm -rf "$tmp_home"' EXIT

HOME="$tmp_home" "$REPO_ROOT/adapters/openclaw/install.sh" >/dev/null
HOME="$tmp_home" "$REPO_ROOT/adapters/hermes/install.sh" >/dev/null

test -f "$tmp_home/.openclaw/skills/nessie/SKILL.md" || { echo "Missing OpenClaw SKILL.md" >&2; exit 1; }
test -f "$tmp_home/.openclaw/skills/nessie/docs/AGENT_WORKFLOWS.md" || { echo "Missing OpenClaw workflow docs" >&2; exit 1; }
test -x "$tmp_home/.openclaw/skills/nessie/scripts/login.sh" || { echo "Missing executable OpenClaw login.sh" >&2; exit 1; }
test -f "$tmp_home/.hermes/skills/productivity/nessie/SKILL.md" || { echo "Missing Hermes SKILL.md" >&2; exit 1; }
test -f "$tmp_home/.hermes/skills/productivity/nessie/docs/AGENT_WORKFLOWS.md" || { echo "Missing Hermes workflow docs" >&2; exit 1; }
test -x "$tmp_home/.hermes/skills/productivity/nessie/scripts/login.sh" || { echo "Missing executable Hermes login.sh" >&2; exit 1; }
test -x "$tmp_home/.config/nessie/skill/scripts/search.sh" || { echo "Missing executable shared search.sh" >&2; exit 1; }

echo "Nessie skill validation passed."
