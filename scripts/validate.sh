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
tools = manifest.get("contracts", {}).get("tools", [])
for tool in ["nessie_check_in", "nessie_ls", "nessie_search", "nessie_read", "nessie_create_context", "nessie_edit_context"]:
    if tool not in tools:
        raise SystemExit(f"openclaw.plugin.json contracts.tools must include {tool}")

runtime = (root / "index.js").read_text(encoding="utf-8")
for needle in ["registerTool", "/agent/tools/search", "NESSIE_API_KEY"]:
    if needle not in runtime:
        raise SystemExit(f"index.js must mention {needle}")

skill = (root / "skills/nessie/SKILL.md").read_text(encoding="utf-8")
for needle in ["check-in", "search", "read", "NESSIE_API_KEY"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must mention {needle}")
for needle in ["requires:", "primaryEnv: NESSIE_API_KEY", "envVars:"]:
    if needle not in skill:
        raise SystemExit(f"skills/nessie/SKILL.md must declare {needle}")

readme = (root / "README.md").read_text(encoding="utf-8")
for needle in ["openclaw plugins install", "NESSIE_API_KEY", "https://mcp.nessielabs.com"]:
    if needle not in readme:
        raise SystemExit(f"README.md must mention {needle}")
PY

echo "Nessie OpenClaw package validation passed."
