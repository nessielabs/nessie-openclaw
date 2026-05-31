---
name: nessie
description: Search, read, and update the user's Nessie context library from OpenClaw.
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
creation. The scripts below are the OpenClaw command surface for that workflow.
The hosted script API does not yet expose the exact MCP `nessie_check_in` tool;
for check-in requests, follow the fallback in `docs/AGENT_WORKFLOWS.md`.

## Setup

If `scripts/search.sh` says the user is not logged in, run:

```bash
scripts/login.sh
```

Ask the user to open the activation URL and enter the displayed code.
The login script prints a prefilled `https://nessielabs.com/activate` URL and
stores credentials under `~/.config/nessie/agent.json` after approval.

## Core Workflow

1. Search or browse Nessie before answering questions about the user's prior
   work, conversations, projects, decisions, or saved sources.
2. Read full matching documents before making strong claims. Snippets are not
   enough for final answers.
3. Synthesize across sources using the rules in `docs/AGENT_WORKFLOWS.md`.
4. Offer to save durable new knowledge back to Nessie when useful.

## Commands

Search:

```bash
scripts/search.sh "query"
scripts/search.sh "query" context
scripts/search.sh "query" transcript
scripts/search.sh "query" obsidian
```

For knowledge questions, search contexts first, then transcripts or notes:

```bash
scripts/search.sh "topic" context
scripts/read.sh <context-id>
scripts/search.sh "topic" transcript
scripts/search.sh "topic" obsidian
```

List source worlds:

```bash
scripts/ls.sh
scripts/ls.sh obsidian
scripts/ls.sh all <parent-id>
```

Read:

```bash
scripts/read.sh <document-id>
scripts/read.sh <document-id> 25 25
```

Create a context:

```bash
scripts/create-context.sh "Context title" /path/to/body.md
```

Edit a context:

```bash
scripts/edit-context.sh <context-id> /tmp/old.txt /tmp/new.txt
```

## Rules

- Do not use snippets alone for final answers when a full source can be read.
- Do not invent context if Nessie has no relevant results.
- Treat contexts as synthesized knowledge and transcripts/notes as primary
  evidence.
- Keep write operations additive unless the user explicitly asks to replace or
  remove content.
- If a command returns `agent_access_required`, tell the user Nessie agent
  access requires Pro or an active trial.
- Do not treat context generation as the only use case. Normal use is
  search -> read -> answer -> optionally write back.
