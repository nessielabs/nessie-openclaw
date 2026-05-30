#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auth.sh
source "$SCRIPT_DIR/auth.sh"

id="${1:-}"
old_file="${2:-}"
new_file="${3:-}"
if [ -z "$id" ] || [ -z "$old_file" ] || [ -z "$new_file" ]; then
  echo "Usage: edit-context.sh <context-id> <old-string-file> <new-string-file>" >&2
  exit 2
fi

body="$(python3 - "$id" "$old_file" "$new_file" <<'PY'
import json
import sys

with open(sys.argv[2], "r", encoding="utf-8") as f:
    old = f.read()
with open(sys.argv[3], "r", encoding="utf-8") as f:
    new = f.read()
print(json.dumps({"id": sys.argv[1], "oldString": old, "newString": new}))
PY
)"
authorized_post "/agent/tools/context/edit" "$body"

