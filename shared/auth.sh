#!/usr/bin/env bash
set -euo pipefail

NESSIE_ENDPOINT="${NESSIE_ENDPOINT:-https://mcp.nessielabs.com}"
NESSIE_CONFIG_DIR="${NESSIE_CONFIG_DIR:-$HOME/.config/nessie}"
NESSIE_TOKEN_FILE="${NESSIE_TOKEN_FILE:-$NESSIE_CONFIG_DIR/agent.json}"
NESSIE_LOGIN_COMMAND="${NESSIE_LOGIN_COMMAND:-$NESSIE_CONFIG_DIR/skill/scripts/login.sh}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 127
  fi
}

json_get() {
  local key="$1"
  python3 - "$key" "$NESSIE_TOKEN_FILE" <<'PY'
import json
import sys

key, path = sys.argv[1], sys.argv[2]
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    sys.exit(2)

value = data.get(key)
if value is None:
    sys.exit(3)
print(value)
PY
}

ensure_config_dir() {
  mkdir -p "$NESSIE_CONFIG_DIR"
  chmod 700 "$NESSIE_CONFIG_DIR"
}

login_required() {
  echo "Not logged in to Nessie. Run: $NESSIE_LOGIN_COMMAND" >&2
  exit 1
}

endpoint_matches() {
  python3 - "$NESSIE_TOKEN_FILE" "$NESSIE_ENDPOINT" "$NESSIE_LOGIN_COMMAND" <<'PY'
import json
import sys

path, endpoint, login_command = sys.argv[1:4]
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    sys.exit(2)

stored = data.get("endpoint")
if not stored or stored == endpoint:
    sys.exit(0)

print(
    f"Nessie token was issued for {stored}, but NESSIE_ENDPOINT is {endpoint}. "
    f"Run {login_command} again for this endpoint.",
    file=sys.stderr,
)
sys.exit(1)
PY
}

json_set_tokens() {
  local access_token="$1"
  local refresh_token="$2"
  local expires_in="$3"
  ensure_config_dir
  python3 - "$NESSIE_TOKEN_FILE" "$NESSIE_ENDPOINT" "$access_token" "$refresh_token" "$expires_in" <<'PY'
import json
import os
import sys
import time

path, endpoint, access_token, refresh_token, expires_in = sys.argv[1:6]
data = {
    "endpoint": endpoint,
    "access_token": access_token,
    "refresh_token": refresh_token,
    "expires_at": int(time.time()) + int(expires_in) - 60,
}
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
os.chmod(tmp, 0o600)
os.replace(tmp, path)
PY
}

token_expired() {
  if [ ! -f "$NESSIE_TOKEN_FILE" ]; then
    return 0
  fi
  python3 - "$NESSIE_TOKEN_FILE" <<'PY'
import json
import sys
import time

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
expires_at = int(data.get("expires_at", 0))
sys.exit(0 if expires_at <= int(time.time()) else 1)
PY
}

refresh_access_token() {
  require_command curl
  require_command python3

  if [ ! -f "$NESSIE_TOKEN_FILE" ]; then
    login_required
  fi
  endpoint_matches

  local refresh_token
  refresh_token="$(json_get refresh_token)"

  local response
  if ! response="$(curl -fsS \
    -X POST "$NESSIE_ENDPOINT/oauth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=refresh_token" \
    --data-urlencode "refresh_token=$refresh_token")"; then
    rm -f "$NESSIE_TOKEN_FILE"
    echo "Nessie login expired. Run: $NESSIE_LOGIN_COMMAND" >&2
    exit 1
  fi

  ensure_config_dir
  python3 - "$response" "$NESSIE_TOKEN_FILE" "$NESSIE_ENDPOINT" <<'PY'
import json
import os
import sys
import time

response = json.loads(sys.argv[1])
path = sys.argv[2]
endpoint = sys.argv[3]
access_token = response["access_token"]
refresh_token = response["refresh_token"]
expires_in = int(response.get("expires_in", 3600))
data = {
    "endpoint": endpoint,
    "access_token": access_token,
    "refresh_token": refresh_token,
    "expires_at": int(time.time()) + expires_in - 60,
}
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
os.chmod(tmp, 0o600)
os.replace(tmp, path)
PY
}

access_token() {
  require_command python3
  if [ ! -f "$NESSIE_TOKEN_FILE" ]; then
    login_required
  fi
  endpoint_matches
  if token_expired; then
    refresh_access_token
  fi
  json_get access_token
}

authorized_post() {
  require_command curl
  require_command python3
  local path="$1"
  local default_body='{}'
  local body="${2:-$default_body}"
  local token
  token="$(access_token)"

  local response status payload
  if ! response="$(curl -sS \
    -w "\n%{http_code}" \
    -X POST "$NESSIE_ENDPOINT$path" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    --data "$body")"; then
    printf '{"error":"transport","error_description":"Network request to Nessie failed."}\n'
    return 1
  fi

  status="$(printf "%s" "$response" | tail -n 1)"
  payload="$(printf "%s" "$response" | sed '$d')"
  printf "%s\n" "$payload"

  python3 - "$status" <<'PY'
import sys

try:
    status = int(sys.argv[1])
except ValueError:
    sys.exit(1)
sys.exit(0 if 200 <= status < 300 else 1)
PY
}
