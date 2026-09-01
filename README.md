# Nessie OpenClaw

Nessie OpenClaw is the public native OpenClaw plugin for connecting an
OpenClaw agent to a user's Nessie context library.

The plugin provides a native OpenClaw setup command and bundled skill guidance
for Nessie's hosted MCP server. Setup writes `mcp.servers.nessie` into
OpenClaw config so OpenClaw's MCP client can discover the hosted Nessie tools
directly from `https://mcp.nessielabs.com/mcp?client=openclaw`.

The `client=openclaw` marker uses the same hosted MCP route as every other
Nessie connector. It only provides a bounded client-surface label for usage
telemetry.

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

After installing the plugin, connect OpenClaw to your Nessie account with an
email verification code.

Ask OpenClaw to run:

```bash
openclaw nessie init --email user@example.com
```

Check your email for the 6-digit Nessie code, then ask OpenClaw to run:

```bash
openclaw nessie init --email user@example.com --code 123456
openclaw nessie status
```

`init --email` asks Nessie to send a one-time verification code. `init --email
--code` exchanges the verified code for a Nessie agent API key and writes a
root MCP server entry to the OpenClaw config file with owner-only file
permissions.

The verified OTP flow stores the bearer key in the local OpenClaw config file
in plaintext with `0600` permissions so OpenClaw can use the hosted MCP server
without extra shell setup.

The Nessie backend remains authoritative for access control. The API key maps
to a Nessie user server-side and each MCP request is still checked against the
user's Pro/trial entitlement.

## Agent Behavior

The bundled skill teaches OpenClaw to:

- run a Nessie check-in when the user asks for it;
- search Nessie before answering questions about prior work, decisions,
  projects, conversations, notes, or saved context;
- use read-only Claude Code and Codex native memory to orient project research,
  then verify it against transcripts or repository files;
- read full sources before making strong claims;
- create or update Nessie contexts only when the user asks to save durable
  knowledge.

This package does not duplicate or reimplement Nessie's MCP tool schemas.
OpenClaw discovers the tool names, descriptions, and parameters from the hosted
MCP server after setup.

Future releases can be picked up with:

```bash
openclaw plugins update @nessielabs/nessie-openclaw
```

## Validate

```bash
npm run validate
```
