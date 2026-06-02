# Nessie OpenClaw

Nessie OpenClaw is the public native OpenClaw plugin for connecting an
OpenClaw agent to a user's Nessie context library.

The plugin uses hosted Nessie agent endpoints backed by the same MCP tool
implementations. Users authenticate by creating an API key in Nessie and
exposing it to OpenClaw as `NESSIE_API_KEY` or as plugin config; no local
Nessie app or device-code login flow is required at runtime.

## What This Package Contains

```text
openclaw.plugin.json
  Native plugin manifest, config schema, setup hints, and tool ownership.
index.js
  Native OpenClaw runtime that registers Nessie tools and calls hosted Nessie.
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

## Authentication

Create an agent API key in Nessie, then make it available to OpenClaw:

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

The native plugin sends:

```text
Authorization: Bearer ${NESSIE_API_KEY}
```

to the hosted Nessie endpoint `https://mcp.nessielabs.com`.

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

The native plugin registers these tools:

- `nessie_check_in`
- `nessie_ls`
- `nessie_search`
- `nessie_read`
- `nessie_create_context`
- `nessie_edit_context`

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
