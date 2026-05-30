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

## Repository Layout

```text
shared/
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
```

## Development Status

This package expects the hosted Nessie agent API endpoints:

- `POST /agent/device/start`
- `POST /agent/device/token`
- `POST /agent/tools/ls`
- `POST /agent/tools/search`
- `POST /agent/tools/read`
- `POST /agent/tools/context/create`
- `POST /agent/tools/context/edit`

