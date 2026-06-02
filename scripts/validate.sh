#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "$REPO_ROOT" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])

required = [
    "README.md",
    "LICENSE",
    "package.json",
    "openclaw.plugin.json",
    "index.js",
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
openclaw = package.get("openclaw", {})
if openclaw.get("extensions") != ["./index.js"]:
    raise SystemExit("package.json must declare openclaw.extensions ./index.js")
if not openclaw.get("compat", {}).get("pluginApi"):
    raise SystemExit("package.json must declare openclaw.compat.pluginApi")

manifest = json.loads((root / "openclaw.plugin.json").read_text(encoding="utf-8"))
if manifest.get("id") != "nessie-openclaw":
    raise SystemExit("openclaw.plugin.json id must be nessie-openclaw")
if manifest.get("skills") != ["skills/nessie"]:
    raise SystemExit("openclaw.plugin.json must load skills/nessie")
if "NESSIE_API_KEY" not in json.dumps(manifest):
    raise SystemExit("openclaw.plugin.json must declare NESSIE_API_KEY setup metadata")
if "contracts" in manifest or "toolMetadata" in manifest:
    raise SystemExit("openclaw.plugin.json must not mirror hosted MCP tool contracts")

runtime = (root / "index.js").read_text(encoding="utf-8")
for needle in [
    "registerCli",
    "openclaw nessie init",
    "mcp",
    "servers",
    "streamable-http",
    "/agent/openclaw/otp/start",
    "/agent/openclaw/otp/verify",
    "StreamableHTTPClientTransport",
    "client.listTools",
    "https://mcp.nessielabs.com/mcp",
    "NESSIE_API_KEY",
]:
    if needle not in runtime:
        raise SystemExit(f"index.js must mention {needle}")
for forbidden in ["registerTool", "client.callTool", "toolDefinitions"]:
    if forbidden in runtime:
        raise SystemExit(f"index.js must not mirror MCP tools via {forbidden}")

skill = (root / "skills/nessie/SKILL.md").read_text(encoding="utf-8")
for needle in ["check-in", "search", "read", "hosted Nessie MCP server"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must mention {needle}")

readme = (root / "README.md").read_text(encoding="utf-8")
for needle in ["openclaw plugins install", "openclaw nessie init", "openclaw nessie status", "mcp.servers.nessie", "NESSIE_API_KEY", "https://mcp.nessielabs.com/mcp"]:
    if needle not in readme:
        raise SystemExit(f"README.md must mention {needle}")
PY

echo "Nessie OpenClaw package validation passed."
