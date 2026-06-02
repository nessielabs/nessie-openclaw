#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auth.sh
source "$SCRIPT_DIR/auth.sh"

id="${1:-}"
if [ -z "$id" ]; then
  echo "Usage: read.sh <document-id> [offset] [limit]" >&2
  exit 2
fi
offset="${2:-0}"
limit="${3:-25}"

body="$(python3 - "$id" "$offset" "$limit" <<'PY'
import json
import sys

print(json.dumps({"id": sys.argv[1], "offset": int(sys.argv[2]), "limit": int(sys.argv[3])}))
PY
)"
authorized_post "/agent/tools/read" "$body"

