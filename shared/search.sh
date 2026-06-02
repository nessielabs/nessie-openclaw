#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auth.sh
source "$SCRIPT_DIR/auth.sh"

query="${1:-}"
if [ -z "$query" ]; then
  echo "Usage: search.sh <query> [type]" >&2
  exit 2
fi
type="${2:-all}"

body="$(python3 - "$query" "$type" <<'PY'
import json
import sys

print(json.dumps({"query": sys.argv[1], "type": sys.argv[2]}))
PY
)"
authorized_post "/agent/tools/search" "$body"

