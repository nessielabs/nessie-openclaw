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

port_file="$tmp_home/stub-port"
python3 - "$port_file" <<'PY' &
import json
import socket
import sys

port_file = sys.argv[1]

sock = socket.socket()
sock.bind(("127.0.0.1", 0))
sock.listen(1)
with open(port_file, "w", encoding="utf-8") as f:
    f.write(str(sock.getsockname()[1]))

conn, _ = sock.accept()
request = b""
while b"\r\n\r\n" not in request:
    request += conn.recv(4096)
headers, body = request.split(b"\r\n\r\n", 1)
header_text = headers.decode("iso-8859-1")
content_length = 0
for line in header_text.split("\r\n")[1:]:
    name, _, value = line.partition(":")
    if name.lower() == "content-length":
        content_length = int(value.strip())
while len(body) < content_length:
    body += conn.recv(4096)
body = body[:content_length].decode("utf-8")
ok = (
    header_text.startswith("POST /agent/tools/search ")
    and "Authorization: Bearer test-access" in header_text
    and json.loads(body) == {"query": "hello", "type": "all"}
)
payload = b'{"ok":true}\n' if ok else b'{"error":"bad_request"}\n'
status = b"200 OK" if ok else b"400 Bad Request"
conn.sendall(
    b"HTTP/1.1 " + status + b"\r\n"
    b"Content-Type: application/json\r\n"
    b"Content-Length: " + str(len(payload)).encode("ascii") + b"\r\n"
    b"Connection: close\r\n\r\n" + payload
)
conn.close()
sock.close()
PY
server_pid=$!
for _ in 1 2 3 4 5; do
  [ -f "$port_file" ] && break
  sleep 0.1
done
test -f "$port_file" || { echo "Stub server did not start" >&2; exit 1; }
stub_port="$(cat "$port_file")"

cat > "$tmp_home/agent.json" <<EOF
{
  "endpoint": "http://127.0.0.1:$stub_port",
  "access_token": "test-access",
  "refresh_token": "test-refresh",
  "expires_at": 4102444800
}
EOF

NESSIE_ENDPOINT="http://127.0.0.1:$stub_port" \
NESSIE_CONFIG_DIR="$tmp_home/.config/nessie" \
NESSIE_TOKEN_FILE="$tmp_home/agent.json" \
bash -c 'source "$1"; authorized_post "/agent/tools/search" "{\"query\":\"hello\",\"type\":\"all\"}" >/dev/null' _ "$REPO_ROOT/shared/auth.sh"
wait "$server_pid"

echo "Nessie skill validation passed."
