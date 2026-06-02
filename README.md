# Nessie OpenClaw

Nessie OpenClaw is the public native OpenClaw plugin for connecting an
OpenClaw agent to a user's Nessie context library.

The plugin registers native OpenClaw tools that proxy to Nessie's hosted MCP
server over Streamable HTTP. Users authenticate by creating an API key in
Nessie and exposing it to OpenClaw as `NESSIE_API_KEY` or as plugin config; no
local Nessie app or device-code login flow is required at runtime.

## What This Package Contains

```text
openclaw.plugin.json
  Native plugin manifest, config schema, setup hints, and tool ownership.
index.js
  Native OpenClaw runtime that registers Nessie tools and calls hosted MCP.
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

Restart the OpenClaw gateway/session after installation so the native runtime
and bundled skill instructions are loaded.

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
--code` exchanges the verified code for a Nessie agent API key and writes it to
the OpenClaw config file with owner-only file permissions.

The OTP exchange expects the hosted Nessie setup API to expose:

- `POST /agent/openclaw/otp/start`
- `POST /agent/openclaw/otp/verify`

## Manual Authentication

If OTP setup is not available yet, create an agent API key in Nessie and run:

```bash
openclaw nessie init --api-key "sk_nes_v1_..."
```

This writes the same OpenClaw plugin config used by the OTP setup flow.

OpenClaw native provider auth, environment variables, and plugin config are
also supported for development and CI:

```bash
openclaw models auth login --provider nessie
```

```bash
export NESSIE_API_KEY="sk_nes_v1_..."
```

Or configure it in `openclaw.json` using an environment reference:

```json
{
  "plugins": {
    "entries": {
      "nessie-openclaw": {
        "enabled": true,
        "config": {
          "apiKey": "${NESSIE_API_KEY}"
        }
      }
    }
  }
}
```

The native plugin resolves the API key in this order:

1. `plugins.entries.nessie-openclaw.config.apiKey`
2. OpenClaw's native `nessie` auth profile
3. `NESSIE_API_KEY`

It then sends:

```text
Authorization: Bearer ${NESSIE_API_KEY}
```

to the hosted Nessie MCP endpoint `https://mcp.nessielabs.com/mcp`.

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

The native plugin registers the current Nessie MCP tool surface:

- `nessie_team_list`
- `nessie_integration_list`
- `nessie_list`
- `nessie_check_in`
- `nessie_ls`
- `nessie_search`
- `nessie_read`
- `nessie_resume`
- `nessie_who_am_i`
- `nessie_folders`
- `nessie_create_context`
- `nessie_edit_context`
- `nessie_rename_context`
- `nessie_move_context`
- `nessie_delete_context`
- `nessie_create_folder`
- `nessie_rename_folder`
- `nessie_delete_folder`

Each native OpenClaw tool calls the matching Nessie MCP tool on the hosted MCP
server. The package does not duplicate or reimplement Nessie's tool semantics.

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
