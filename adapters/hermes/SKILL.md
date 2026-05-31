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
topic, references prior work or AI conversations, asks for a brief grounded in
their past context, asks what sources are available, or wants reusable
knowledge saved.

For research, synthesis, and write-back behavior, follow:

```text
docs/AGENT_WORKFLOWS.md
```

Read that workflow before substantial research, source browsing, or context
creation. Use Hermes MCP tools when available; use the scripts below as the
fallback command surface.

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

When MCP is configured, use `nessie_check_in` when the user says "Nessie
check-in", "check in with Nessie", or asks to load their Nessie context before
continuing. That MCP tool returns generated profile sections and recent Nessie
activity. The script fallback below does not expose an exact check-in
equivalent yet.

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
scripts/search.sh "query" context
scripts/search.sh "query" transcript
scripts/search.sh "query" obsidian
```

Read:

```bash
scripts/read.sh <document-id>
```

List sources:

```bash
scripts/ls.sh
scripts/ls.sh obsidian
scripts/ls.sh all <parent-id>
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
- Do not treat context generation as the only use case. Normal use is
  search -> read -> answer -> optionally write back.
