#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=auth.sh
source "$SCRIPT_DIR/auth.sh"

require_command curl
require_command python3

start_body="$(python3 - "${NESSIE_AGENT_CLIENT:-nessie-skill}" <<'PY'
import json
import sys

print(json.dumps({"client": sys.argv[1]}))
PY
)"

start_response="$(curl -fsS \
  -X POST "$NESSIE_ENDPOINT/agent/device/start" \
  -H "Content-Type: application/json" \
  --data "$start_body")"

read -r device_code user_code verification_uri activation_uri interval expires_in <<EOF
$(python3 - "$start_response" <<'PY'
import json
import sys
from urllib.parse import urlencode, urlparse, urlunparse

data = json.loads(sys.argv[1])
verification_uri = data["verification_uri"]
parts = urlparse(verification_uri)
extra = urlencode({"user_code": data["user_code"]})
query = extra if not parts.query else parts.query + "&" + extra
activation_uri = urlunparse(parts._replace(query=query))
print(data["device_code"], data["user_code"], verification_uri, activation_uri, data.get("interval", 5), data.get("expires_in", 600))
PY
)
EOF

echo "Open $activation_uri"
echo "If the code is not filled in automatically, enter: $user_code"
echo "Waiting for approval..."

deadline=$(( $(date +%s) + expires_in ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  sleep "$interval"
  if ! token_response="$(curl -sS \
    -X POST "$NESSIE_ENDPOINT/agent/device/token" \
    -H "Content-Type: application/json" \
    --data "{\"device_code\":\"$device_code\"}")"; then
    echo "Temporary network error while waiting for approval; retrying..." >&2
    continue
  fi

  status="$(python3 - "$token_response" <<'PY'
import json
import sys

try:
    data = json.loads(sys.argv[1])
except Exception:
    print("invalid")
    sys.exit(0)
if "access_token" in data:
    print("approved")
else:
    print(data.get("error", "pending"))
PY
)"

  case "$status" in
    approved)
      read -r access_token refresh_token token_expires_in <<EOF
$(python3 - "$token_response" <<'PY'
import json
import sys

data = json.loads(sys.argv[1])
print(data["access_token"], data["refresh_token"], data.get("expires_in", 3600))
PY
)
EOF
      json_set_tokens "$access_token" "$refresh_token" "$token_expires_in"
      mkdir -p "$NESSIE_CONFIG_DIR/skill"
      echo "Logged in to Nessie."
      exit 0
      ;;
    slow_down)
      if [ "$interval" -lt 30 ]; then
        interval=$(( interval + 5 ))
        if [ "$interval" -gt 30 ]; then
          interval=30
        fi
      fi
      ;;
    authorization_pending|pending|invalid)
      ;;
    *)
      echo "Login failed: $token_response" >&2
      exit 1
      ;;
  esac
done

echo "Login timed out. Run this command again to start a new activation code." >&2
exit 1
