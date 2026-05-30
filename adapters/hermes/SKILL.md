---
name: nessie
description: Search, read, and update the user's Nessie context library from Hermes Agent.
version: 0.1.0
metadata:
  hermes:
    tags: [nessie, memory, context, mcp]
    category: productivity
---

# Nessie

Use this skill when the user asks to use Nessie, asks what they know about a
topic, references past AI conversations, or wants a reusable context saved.

## Preferred Hermes MCP Setup

Hermes supports remote HTTP MCP servers with OAuth. Prefer configuring Nessie
as a remote MCP server when possible:

```yaml
mcp_servers:
  nessie:
    url: "https://mcp.nessielabs.com"
    auth: oauth
```

After changing MCP config, reload MCP in Hermes.

## Script Fallback

If MCP is not configured or not available, use the scripts bundled with this
skill.

Login:

```bash
scripts/login.sh
```

The login script prints a prefilled `https://nessielabs.com/activate` URL and
stores fallback-script credentials under `~/.config/nessie/agent.json`.

Search:

```bash
scripts/search.sh "query"
```

Read:

```bash
scripts/read.sh <document-id>
```

List sources:

```bash
scripts/ls.sh
```

Create a context:

```bash
scripts/create-context.sh "Context title" /path/to/body.md
```

## Rules

- Search Nessie before answering questions about the user's prior work,
  conversations, projects, decisions, or notes.
- Read full matching documents before making strong claims.
- Treat contexts as synthesized knowledge and transcripts/notes as primary
  evidence.
- Offer to save durable new knowledge back to Nessie when useful.
- If a script returns `agent_access_required`, tell the user Nessie agent
  access requires Pro or an active trial.
