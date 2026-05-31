# nessie-skill

Nessie Skill gives AI agents access to a user's Nessie context library.

This package is intentionally agent-host agnostic. It contains shared cloud
client scripts plus small adapters for hosts with different skill systems.

## Supported Hosts

- OpenClaw: installs a native `~/.openclaw/skills/nessie` skill.
- Hermes Agent: installs a native `~/.hermes/skills/productivity/nessie` skill
  and documents the preferred remote MCP configuration.

## Install

OpenClaw:

```bash
./adapters/openclaw/install.sh
```

Hermes:

```bash
./adapters/hermes/install.sh
```

## Authentication

The skill uses hosted Nessie auth. Run:

```bash
~/.config/nessie/skill/scripts/login.sh
```

The login script starts a device activation flow, asks the user to open
`https://nessielabs.com/activate`, and stores short-lived access credentials in:

```text
~/.config/nessie/agent.json
```

The hosted API remains authoritative for access control. If a user does not
have Nessie Pro access or an active trial, requests fail server-side.

## Configuration

The scripts default to the production-hosted API:

```text
NESSIE_ENDPOINT=https://mcp.nessielabs.com
```

For development or staging, override it before running a command:

```bash
NESSIE_ENDPOINT=http://127.0.0.1:8787 ~/.config/nessie/skill/scripts/login.sh
```

The device activation client name defaults to `nessie-skill`. Override
`NESSIE_AGENT_CLIENT` if an adapter wants a more specific value in server logs.

## Repository Layout

```text
shared/
  AGENT_WORKFLOWS.md   Shared research, synthesis, and write-back behavior.
  auth.sh              Shared token loading and refresh helpers.
  login.sh             Device activation login flow.
  ls.sh                List source worlds or child nodes.
  search.sh            Search Nessie.
  read.sh              Read a Nessie source node.
  create-context.sh    Create a context.
  edit-context.sh      Edit a context by exact replacement.
adapters/
  openclaw/
    SKILL.md
    install.sh
  hermes/
    SKILL.md
    install.sh
scripts/
  validate.sh          Syntax-check scripts and dry-run both installers.
```

## Validate

```bash
scripts/validate.sh
```

The validation script runs `bash -n` on every shell script and installs the
OpenClaw and Hermes adapters into a temporary home directory.

## Development Status

This package expects the hosted Nessie agent API endpoints:

- `POST /agent/device/start`
- `POST /agent/device/token`
- `POST /agent/tools/ls`
- `POST /agent/tools/search`
- `POST /agent/tools/read`
- `POST /agent/tools/context/create`
- `POST /agent/tools/context/edit`
