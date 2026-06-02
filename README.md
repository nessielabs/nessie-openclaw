# Nessie OpenClaw

Nessie OpenClaw is the public OpenClaw plugin bundle for connecting an
OpenClaw agent to a user's Nessie context library.

The plugin uses the hosted Nessie MCP server. Users authenticate by creating an
agent API key in Nessie and exposing it to OpenClaw as `NESSIE_API_KEY`; no
local Nessie app or device-code login flow is required at runtime.

## What This Package Contains

```text
.mcp.json
  Hosted Nessie MCP server configuration for OpenClaw.
.codex-plugin/plugin.json
  Bundle marker and package metadata that OpenClaw can map into native
  capabilities.
skills/nessie/
  Agent instructions for when and how to use Nessie context.
package.json
  ClawHub/package metadata.
scripts/validate.sh
  Static package validation.
```

## Install

Once published to ClawHub:

```bash
openclaw plugins install clawhub:@nessielabs/nessie-openclaw
```

For local development:

```bash
openclaw plugins install --link .
openclaw plugins enable nessie-openclaw
```

Restart the OpenClaw gateway/session after installation so the bundled MCP
configuration and skill instructions are loaded.

## Authentication

Create an agent API key in Nessie, then make it available to OpenClaw:

```bash
export NESSIE_API_KEY="nsk_agent_..."
```

OpenClaw reads `.mcp.json` and sends:

```text
Authorization: Bearer ${NESSIE_API_KEY}
```

to the hosted Nessie MCP endpoint:

```text
https://mcp.nessielabs.com/mcp
```

The Nessie backend remains authoritative for access control. The API key maps
to a Nessie user server-side and each request is still checked against the
user's Pro/trial entitlement.

## Agent Behavior

The bundled skill teaches OpenClaw to:

- run a Nessie check-in when the user asks for it;
- search Nessie before answering questions about prior work, decisions,
  projects, conversations, notes, or saved context;
- read full sources before making strong claims;
- create or update Nessie contexts only when the user asks to save durable
  knowledge.

OpenClaw registers bundled MCP tools with provider-safe names. Depending on the
host display, Nessie tools may appear as `nessie__search`/`nessie__read` or as
the upstream tool names from the hosted MCP server.

## Publishing

ClawHub publishes plugin packages from a local folder or GitHub source:

```bash
clawhub package publish nessielabs/nessie-openclaw --dry-run
clawhub package publish nessielabs/nessie-openclaw
```

ClawHub/OpenClaw plugin installs use package update records, so future releases
can be picked up with:

```bash
openclaw plugins update @nessielabs/nessie-openclaw
```

## Validate

```bash
npm run validate
```
