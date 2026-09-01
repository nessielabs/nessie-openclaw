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
manifest_text = json.dumps(manifest)
for forbidden in ["NESSIE_API_KEY", "api-key", "apiKey"]:
    if forbidden in manifest_text:
        raise SystemExit(f"openclaw.plugin.json must not expose manual API-key setup: {forbidden}")
auth_methods = manifest.get("setup", {}).get("providers", [{}])[0].get("authMethods", [])
if auth_methods != ["otp"]:
    raise SystemExit("openclaw.plugin.json setup authMethods must contain only otp")
if "contracts" in manifest or "toolMetadata" in manifest:
    raise SystemExit("openclaw.plugin.json must not mirror hosted MCP tool contracts")
if "endpoint" in manifest.get("uiHints", {}):
    raise SystemExit("openclaw.plugin.json must not expose an endpoint UI override")
if "endpoint" in manifest.get("configSchema", {}).get("properties", {}):
    raise SystemExit("openclaw.plugin.json must not expose an endpoint config override")

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
    "https://mcp.nessielabs.com/mcp?client=openclaw",
    "https://nessie-notes-go-843813578359.us-west1.run.app",
]:
    if needle not in runtime:
        raise SystemExit(f"index.js must mention {needle}")
for forbidden in ["registerTool", "client.callTool", "toolDefinitions"]:
    if forbidden in runtime:
        raise SystemExit(f"index.js must not mirror MCP tools via {forbidden}")
for forbidden in [
    "NESSIE_API_KEY",
    "--api-key",
    "process.env",
    "resolveEnvRefs",
    "NESSIE_SETUP_ENDPOINT",
    "NESSIE_MCP_ENDPOINT",
    "NESSIE_ENDPOINT",
    "OPENCLAW_CONFIG_PATH",
    '--endpoint <url>',
    '--mcp-endpoint <url>',
]:
    if forbidden in runtime:
        raise SystemExit(f"index.js must not expose configurable endpoints via {forbidden}")
skill = (root / "skills/nessie/SKILL.md").read_text(encoding="utf-8")
skill_version = re.search(r"^version:\s*(\S+)\s*$", skill, re.MULTILINE)
if not skill_version:
    raise SystemExit("skills/nessie/SKILL.md must declare version frontmatter")
if skill_version.group(1) != package_version:
    raise SystemExit("skills/nessie/SKILL.md version must match package.json version")

pointer_path = root / "skill-version.json"
if not pointer_path.is_file():
    raise SystemExit("skill-version.json update pointer is required")
pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
if pointer.get("version") != package_version:
    raise SystemExit("skill-version.json version must match package.json version")
if pointer.get("skillUrl") != "https://raw.githubusercontent.com/nessielabs/nessie-openclaw/main/skills/nessie/SKILL.md":
    raise SystemExit("skill-version.json skillUrl must point at the published SKILL.md")
if pointer.get("updateCommand") != "openclaw plugins update @nessielabs/nessie-openclaw":
    raise SystemExit("skill-version.json updateCommand must be the plugin update command")
for needle in [
    "check-in",
    "search",
    "read",
    "hosted Nessie MCP server",
    "nessie_who_am_i",
    "Sparse profile data does not mean sparse raw data",
    "Do not use incoming shared roots as the default for first-person questions",
    "Follow this resolver workflow for teammate questions",
    'owner: "direct_shared"',
    'owner: "team_shared"',
    'owner: "shared"',
    "Trace content always requires its own explicit grant",
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
    "## Session Initiation",
    "`initiated` is Nessie's derived, provider-neutral category",
    "current listing's direct children",
    'pass `initiated: "human"`',
    "including the virtual Contexts root, reject an initiation filter",
    "## Native Coding-Agent Memory",
    "`native_memory_collection`",
    "`requiresVerification: true`",
    "`memory`, or `meeting`",
    "provider-derived project orientation",
    "nessie_asset_get",
    "https://assets.nessielabs.com/v1/<asset-id>",
    "Treat Nessie as read-only by default",
    "Show the user a concise preview of the exact content or change",
    "Ask for explicit confirmation of that preview",
    "Wait for a clear affirmative response after the preview",
    "Confirmation is scoped to the exact preview",
]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must mention {needle}")
for forbidden in [
    "Optionally write back if new information emerged",
    "Use write operations when the user asks to save something or when new durable knowledge emerged",
    "NESSIE_API_KEY",
    "--api-key",
]:
    if forbidden in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must not authorize unconfirmed writes: {forbidden}")

readme = (root / "README.md").read_text(encoding="utf-8")
for needle in ["openclaw plugins install", "openclaw nessie init", "openclaw nessie status", "hosted MCP server", "https://mcp.nessielabs.com/mcp?client=openclaw"]:
    if needle not in readme:
        raise SystemExit(f"README.md must mention {needle}")
for forbidden in ["NESSIE_API_KEY", "--api-key"]:
    if forbidden in readme:
        raise SystemExit(f"README.md must not expose manual API-key setup: {forbidden}")
PY

echo "Nessie OpenClaw package validation passed."
