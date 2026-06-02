#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auth.sh
source "$SCRIPT_DIR/auth.sh"

title="${1:-}"
markdown_file="${2:-}"
if [ -z "$title" ] || [ -z "$markdown_file" ]; then
  echo "Usage: create-context.sh <title> <markdown-file>" >&2
  exit 2
fi

body="$(python3 - "$title" "$markdown_file" <<'PY'
import json
import sys

with open(sys.argv[2], "r", encoding="utf-8") as f:
    markdown = f.read()
print(json.dumps({"title": sys.argv[1], "markdown": markdown}))
PY
)"
authorized_post "/agent/tools/context/create" "$body"

