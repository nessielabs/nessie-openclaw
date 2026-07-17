#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

python3 - "$REPO_ROOT" <<'PY'
import json
import pathlib
import re
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
package_version = package.get("version")
if not package_version:
    raise SystemExit("package.json must declare version")
openclaw = package.get("openclaw", {})
if openclaw.get("extensions") != ["./index.js"]:
    raise SystemExit("package.json must declare openclaw.extensions ./index.js")
if not openclaw.get("compat", {}).get("pluginApi"):
    raise SystemExit("package.json must declare openclaw.compat.pluginApi")

manifest = json.loads((root / "openclaw.plugin.json").read_text(encoding="utf-8"))
if manifest.get("id") != "nessie-openclaw":
    raise SystemExit("openclaw.plugin.json id must be nessie-openclaw")
if manifest.get("version") != package_version:
    raise SystemExit("openclaw.plugin.json version must match package.json version")
if manifest.get("skills") != ["skills/nessie"]:
    raise SystemExit("openclaw.plugin.json must load skills/nessie")
if "NESSIE_API_KEY" not in json.dumps(manifest):
    raise SystemExit("openclaw.plugin.json must declare NESSIE_API_KEY setup metadata")
auth_methods = manifest.get("setup", {}).get("providers", [{}])[0].get("authMethods", [])
for method in ["api-key", "otp"]:
    if method not in auth_methods:
        raise SystemExit(f"openclaw.plugin.json setup authMethods must include {method}")
if "contracts" in manifest or "toolMetadata" in manifest:
    raise SystemExit("openclaw.plugin.json must not mirror hosted MCP tool contracts")

runtime = (root / "index.js").read_text(encoding="utf-8")
runtime_version = re.search(r'const\s+PLUGIN_VERSION\s*=\s*"([^"]+)"', runtime)
if not runtime_version:
    raise SystemExit("index.js must declare PLUGIN_VERSION")
if runtime_version.group(1) != package_version:
    raise SystemExit("index.js PLUGIN_VERSION must match package.json version")
for needle in [
    "registerCli",
    "openclaw nessie init",
    "mcp",
    "servers",
    "streamable-http",
    "/auth/otp/start",
    "/auth/otp/verify",
    "StreamableHTTPClientTransport",
    "client.listTools",
    "Nessie setup request timed out.",
    "https://mcp.nessielabs.com/mcp",
    "https://nessie-notes-go-843813578359.us-west1.run.app",
    "NESSIE_API_KEY",
]:
    if needle not in runtime:
        raise SystemExit(f"index.js must mention {needle}")
for forbidden in ["registerTool", "client.callTool", "toolDefinitions"]:
    if forbidden in runtime:
        raise SystemExit(f"index.js must not mirror MCP tools via {forbidden}")

skill = (root / "skills/nessie/SKILL.md").read_text(encoding="utf-8")
skill_version = re.search(r"^version:\s*(\S+)\s*$", skill, re.MULTILINE)
if not skill_version:
    raise SystemExit("skills/nessie/SKILL.md must declare version frontmatter")
if skill_version.group(1) != package_version:
    raise SystemExit("skills/nessie/SKILL.md version must match package.json version")
for needle in [
    "check-in",
    "search",
    "read",
    "hosted Nessie MCP server",
    "nessie_who_am_i",
    "Sparse profile data does not mean sparse raw data",
    "Do not use team-shared roots as the default for first-person questions",
    "Follow this resolver workflow for teammate questions",
    "nessie integration list --status team_remote",
    "owner: { userId: \"...\" }",
    "`sourceOwner` as the only ownership and scoping signal",
    "Do not default every discovery or knowledge request to `type: \"context\"`",
    "Choose the source order from the user's intent",
    "Context search is an orientation tool",
    "latest developments",
    "date-only bounds to `nessie_grep` and `nessie_ls`",
    "plus `timezone` as an IANA timezone",
    "Date-only bounds require `timezone`",
    "local Monday-Sunday week",
    "Do not treat UTC midnight as the boundary",
    "nessie_asset_get",
    "https://assets.nessielabs.com/v1/<asset-id>",
]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must mention {needle}")

readme = (root / "README.md").read_text(encoding="utf-8")
for needle in ["openclaw plugins install", "openclaw nessie init", "openclaw nessie status", "hosted MCP server", "https://mcp.nessielabs.com/mcp"]:
    if needle not in readme:
        raise SystemExit(f"README.md must mention {needle}")
PY

echo "Nessie OpenClaw package validation passed."
