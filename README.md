# Nessie OpenClaw

Nessie OpenClaw is the public native OpenClaw plugin for connecting an
OpenClaw agent to a user's Nessie context library.

The plugin provides a native OpenClaw setup command and bundled skill guidance
for Nessie's hosted MCP server. Setup writes `mcp.servers.nessie` into
OpenClaw config so OpenClaw's MCP client can discover the hosted Nessie tools
directly from `https://mcp.nessielabs.com/mcp`.

## What This Package Contains

```text
openclaw.plugin.json
  Native plugin manifest, setup hints, and skill roots.
index.js
  Native OpenClaw CLI setup commands for Nessie.
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
openclaw plugins enable nessie-openclaw
```

For local development:

```bash
openclaw plugins install --link .
openclaw plugins enable nessie-openclaw
```

Restart the OpenClaw gateway/session after installation so the setup CLI and
bundled skill instructions are loaded.

## OpenClaw Chat Setup

The recommended setup path mirrors Mem0's OpenClaw setup style: paste an agent
prompt into OpenClaw, let the agent install the plugin, then verify the user's
Nessie account by email OTP.

The prompt drives these commands:

```bash
openclaw nessie init --email user@example.com
openclaw nessie init --email user@example.com --code 123456
openclaw nessie status
```

`init --email` asks Nessie to send a one-time verification code. `init --email
--code` exchanges the verified code for a Nessie agent API key and writes a
root MCP server entry to the OpenClaw config file with owner-only file
permissions.

The OTP exchange expects the hosted Nessie setup API to expose:

- `POST /agent/openclaw/otp/start`
- `POST /agent/openclaw/otp/verify`

## Manual Authentication

If OTP setup is not available yet, create an agent API key in Nessie and run:

```bash
openclaw nessie init --api-key "sk_nes_v1_..."
```

This writes the same OpenClaw MCP server config used by the OTP setup flow.

The setup command writes this shape to `openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "nessie": {
        "transport": "streamable-http",
        "url": "https://mcp.nessielabs.com/mcp",
        "headers": {
          "Authorization": "Bearer sk_nes_v1_..."
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "nessie-openclaw": {
        "enabled": true,
        "config": {
          "endpoint": "https://mcp.nessielabs.com/mcp"
        }
      }
    }
  }
}
```

For development and CI, you can also configure `mcp.servers.nessie` manually
with an environment reference such as `Bearer ${NESSIE_API_KEY}`.

The Nessie backend remains authoritative for access control. The API key maps
to a Nessie user server-side and each MCP request is still checked against the
user's Pro/trial entitlement.

## Agent Behavior

The bundled skill teaches OpenClaw to:

- run a Nessie check-in when the user asks for it;
- search Nessie before answering questions about prior work, decisions,
  projects, conversations, notes, or saved context;
- read full sources before making strong claims;
- create or update Nessie contexts only when the user asks to save durable
  knowledge.

This package does not duplicate or reimplement Nessie's MCP tool schemas.
OpenClaw discovers the tool names, descriptions, and parameters from the hosted
MCP server after setup.

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
