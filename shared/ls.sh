#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auth.sh
source "$SCRIPT_DIR/auth.sh"

source_type="${1:-all}"
parent_id="${2:-}"

body="$(python3 - "$source_type" "$parent_id" <<'PY'
import json
import sys

body = {"sourceType": sys.argv[1]}
if sys.argv[2]:
    body["parentId"] = sys.argv[2]
print(json.dumps(body))
PY
)"
authorized_post "/agent/tools/ls" "$body"

