# Nessie OpenClaw

Nessie OpenClaw is the public native OpenClaw plugin for connecting an
OpenClaw agent to a user's Nessie context library.

The plugin provides a native OpenClaw setup command and bundled skill guidance
for Nessie's hosted MCP server. Setup writes `mcp.servers.nessie` into
OpenClaw config so OpenClaw's MCP client can discover the hosted Nessie tools
directly from `https://mcp.nessielabs.com/mcp`.

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

After installing the plugin, configure the hosted Nessie MCP server:

```bash
openclaw nessie init
```

Then authorize OpenClaw through Nessie's browser-based MCP OAuth flow:

```bash
openclaw mcp login nessie
```

OpenClaw prints an authorization URL. After approving access, pass the returned
code if prompted:

```bash
openclaw mcp login nessie --code <code>
```

Verify the saved OAuth session and live MCP connection:

```bash
openclaw mcp status --verbose
openclaw mcp doctor nessie --probe
```

`openclaw nessie init` writes only the fixed Nessie MCP URL, transport, OAuth
mode, and scopes to `openclaw.json`. It removes legacy Nessie Authorization
headers and plugin credential config during migration. OpenClaw stores the
OAuth session separately in its credential store and supplies current access
tokens to the MCP runtime.

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

Future releases can be picked up with:

```bash
openclaw plugins update @nessielabs/nessie-openclaw
```

## Validate

```bash
npm run validate
```
