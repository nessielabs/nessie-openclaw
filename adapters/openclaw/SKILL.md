---
name: nessie
description: Search, read, and update the user's Nessie context library from OpenClaw.
---

# Nessie

Use this skill when the user asks to use Nessie, asks what they know about a
topic, references past AI conversations, or wants a reusable context saved.

## Setup

If `scripts/search.sh` says the user is not logged in, run:

```bash
scripts/login.sh
```

Ask the user to open the activation URL and enter the displayed code.

## Core Workflow

1. Search Nessie before answering questions about the user's prior work,
   conversations, projects, decisions, or notes.
2. Read full matching documents before making strong claims.
3. Answer using the retrieved context.
4. Offer to save durable new knowledge back to Nessie when useful.

## Commands

Search:

```bash
scripts/search.sh "query"
scripts/search.sh "query" context
scripts/search.sh "query" transcript
scripts/search.sh "query" obsidian
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

