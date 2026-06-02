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
    "openclaw.plugin.json",
    "index.js",
    "skills/nessie/SKILL.md",
    "docs/openclaw-setup.md",
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
if "nessie" not in manifest.get("providers", []):
    raise SystemExit("openclaw.plugin.json providers must include nessie")
if manifest.get("skills") != ["skills/nessie"]:
    raise SystemExit("openclaw.plugin.json must load skills/nessie")
if "NESSIE_API_KEY" not in json.dumps(manifest):
    raise SystemExit("openclaw.plugin.json must declare NESSIE_API_KEY setup metadata")
auth_choices = manifest.get("providerAuthChoices", [])
if not any(choice.get("provider") == "nessie" and choice.get("method") == "api-key" and choice.get("choiceId") == "nessie-api-key" for choice in auth_choices):
    raise SystemExit("openclaw.plugin.json must declare the nessie-api-key provider auth choice")
expected_tools = [
    "nessie_team_list",
    "nessie_integration_list",
    "nessie_list",
    "nessie_ls",
    "nessie_search",
    "nessie_read",
    "nessie_resume",
    "nessie_who_am_i",
    "nessie_check_in",
    "nessie_folders",
    "nessie_create_context",
    "nessie_edit_context",
    "nessie_rename_context",
    "nessie_move_context",
    "nessie_delete_context",
    "nessie_create_folder",
    "nessie_rename_folder",
    "nessie_delete_folder",
]
tools = manifest.get("contracts", {}).get("tools", [])
for tool in expected_tools:
    if tool not in tools:
        raise SystemExit(f"openclaw.plugin.json contracts.tools must include {tool}")
    metadata = manifest.get("toolMetadata", {}).get(tool, {})
    if "nessie" not in json.dumps(metadata) or "apiKey" not in json.dumps(metadata):
        raise SystemExit(f"openclaw.plugin.json toolMetadata must declare Nessie API-key auth for {tool}")

runtime = (root / "index.js").read_text(encoding="utf-8")
for needle in [
    "registerTool",
    "registerCli",
    "openclaw nessie init",
    "/agent/openclaw/otp/start",
    "/agent/openclaw/otp/verify",
    "StreamableHTTPClientTransport",
    "client.callTool",
    "registerProvider",
    "resolveApiKeyForProvider",
    "https://mcp.nessielabs.com/mcp",
    "NESSIE_API_KEY",
]:
    if needle not in runtime:
        raise SystemExit(f"index.js must mention {needle}")
for tool in expected_tools:
    if tool not in runtime:
        raise SystemExit(f"index.js must register {tool}")

skill = (root / "skills/nessie/SKILL.md").read_text(encoding="utf-8")
for needle in ["check-in", "search", "read", "NESSIE_API_KEY"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must mention {needle}")
for needle in ["requires:", "primaryEnv: NESSIE_API_KEY", "envVars:"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must declare {needle}")

readme = (root / "README.md").read_text(encoding="utf-8")
for needle in ["openclaw plugins install", "docs/openclaw-setup.md", "openclaw nessie init", "openclaw nessie status", "openclaw models auth login --provider nessie", "NESSIE_API_KEY", "https://mcp.nessielabs.com/mcp"]:
    if needle not in readme:
        raise SystemExit(f"README.md must mention {needle}")
for tool in expected_tools:
    if tool not in readme:
        raise SystemExit(f"README.md must mention {tool}")

setup_prompt = (root / "docs/openclaw-setup.md").read_text(encoding="utf-8")
for needle in ["Prompt for Agent", "openclaw nessie init --email", "openclaw nessie status"]:
    if needle not in setup_prompt:
        raise SystemExit(f"docs/openclaw-setup.md must mention {needle}")
PY

echo "Nessie OpenClaw package validation passed."
