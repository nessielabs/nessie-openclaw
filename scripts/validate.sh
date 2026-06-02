#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash -n "$0"

python3 - "$REPO_ROOT" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])

required = [
    "README.md",
    "LICENSE",
    "package.json",
    ".codex-plugin/plugin.json",
    ".mcp.json",
    "skills/nessie/SKILL.md",
]
missing = [path for path in required if not (root / path).is_file()]
if missing:
    raise SystemExit(f"Missing required files: {', '.join(missing)}")

package = json.loads((root / "package.json").read_text(encoding="utf-8"))
if package.get("name") != "@nessielabs/nessie-openclaw":
    raise SystemExit("package.json name must be @nessielabs/nessie-openclaw")
if package.get("license") != "MIT-0":
    raise SystemExit("package.json license must be MIT-0")

manifest = json.loads((root / ".codex-plugin/plugin.json").read_text(encoding="utf-8"))
if manifest.get("name") != "nessie-openclaw":
    raise SystemExit(".codex-plugin/plugin.json name must be nessie-openclaw")
if manifest.get("skills") != "./skills/":
    raise SystemExit(".codex-plugin/plugin.json must expose ./skills/")

mcp = json.loads((root / ".mcp.json").read_text(encoding="utf-8"))
server = mcp.get("mcp", {}).get("servers", {}).get("nessie")
if not server:
    raise SystemExit(".mcp.json must declare mcp.servers.nessie")
if server.get("transport") != "streamable-http":
    raise SystemExit("Nessie MCP transport must be streamable-http")
if server.get("url") != "https://mcp.nessielabs.com/mcp":
    raise SystemExit("Nessie MCP URL must point at production hosted MCP")
auth = server.get("headers", {}).get("Authorization", "")
if "NESSIE_API_KEY" not in auth:
    raise SystemExit("Nessie MCP Authorization header must reference NESSIE_API_KEY")

skill = (root / "skills/nessie/SKILL.md").read_text(encoding="utf-8")
for needle in ["check-in", "search", "read", "NESSIE_API_KEY"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must mention {needle}")
for needle in ["requires:", "primaryEnv: NESSIE_API_KEY", "envVars:"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must declare {needle}")

readme = (root / "README.md").read_text(encoding="utf-8")
for needle in ["openclaw plugins install", "NESSIE_API_KEY", "https://mcp.nessielabs.com/mcp"]:
    if needle not in readme:
        raise SystemExit(f"README.md must mention {needle}")
PY

echo "Nessie OpenClaw package validation passed."
