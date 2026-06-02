---
name: nessie
description: Search and read the user's Nessie context library from OpenClaw through hosted MCP.
version: 0.1.0
metadata:
  openclaw:
    requires:
      env:
        - NESSIE_API_KEY
    primaryEnv: NESSIE_API_KEY
    envVars:
      - name: NESSIE_API_KEY
        required: true
        description: Nessie API key created in the Nessie app settings.
    homepage: https://github.com/nessielabs/nessie-openclaw
---

# Nessie

Use Nessie when the user asks about their prior work, decisions, projects,
saved context, notes, AI conversations, relationships, or anything they may
have discussed or researched before.

Nessie is available through native OpenClaw tools registered by the
`nessie-openclaw` plugin. Those tools call Nessie's hosted MCP server with the
user's Nessie API key. Prefer these tools over shell commands; this plugin
intentionally does not require a local Nessie app or copied scripts.

## First Step

If the user says "Nessie check-in", "check in with Nessie", or asks to load
their Nessie context before continuing, call the native Nessie check-in tool.

Treat the check-in output as context for the session. If the user then asks a
specific follow-up, continue with the normal search, read, and answer loop.

## Core Loop

1. Search or browse Nessie before answering questions about the user's past
   work, conversations, decisions, projects, or saved knowledge.
2. Read full sources before making strong claims. Search snippets are only
   breadcrumbs.
3. Synthesize in the session. Answer directly and name the source types you
   relied on when it helps the user judge confidence.
4. Write back only when useful. If the user asks to save durable knowledge,
   create or update a Nessie context.

## Available Operations

Use the Nessie tools exposed by the native plugin:

- check-in: load profile sections and recent Nessie activity.
- team list: list readable teams and team-shared resources.
- integration list: list readable integration roots and team-shared roots.
- list documents: list recent contexts, transcripts, or all documents.
- list sources: list source worlds or children under a source node.
- search: search contexts, transcripts, notes, and other sources.
- read: read a source document or node in full.
- resume: resume or take over a prior AI session.
- who am I: read generated profile sections.
- folders: list folders or inspect a folder.
- create context: save a new reusable context.
- edit context: update an existing context by exact replacement.
- rename, move, or delete context: organize or remove context documents.
- create, rename, or delete folder: organize contexts.

## Search Strategy

For knowledge questions, search contexts first for orientation, then read the
best matching source in full. Search transcripts, notes, and source graphs when
no context exists, when the context may be stale, or when primary-source detail
matters.

For team-shared work, use team list or integration list before searching. For
session handoff requests such as "resume this session", use the resume tool
before normal search.

Run multiple searches when the first query is too narrow. Use names, companies,
project names, related people, exact phrases, and likely synonyms. Do not stop
after the first plausible result if the answer depends on timeline, current
state, or several related decisions.

## Manual Research Workflow

Use this workflow for substantial briefs, summaries, timelines, prep docs, and
high-confidence answers.

1. Interpret the query. Infer purpose, audience, time scope, and likely source
   types.
2. Search broadly. Start with contexts, then primary sources.
3. Read deeply. For substantial answers, read several full sources before
   synthesizing.
4. Cross-reference. Compare sources for recency, contradictions, and missing
   context.
5. Synthesize. Prefer specific dates, names, decisions, and concrete outcomes
   over vague summaries.

## Writing Back

Use write operations when the user asks to save something or when new durable
knowledge emerged and preserving it would help future sessions.

Before creating a new context, search for an existing context on the topic.
Create a context when no existing context covers the topic or when the new work
is a coherent reusable artifact. Edit an existing context when a targeted
addition or correction is enough.

Keep operations additive unless the user explicitly asks to replace or remove
content. Do not delete or overwrite existing context to clean up without
explicit confirmation.

## Epistemic Rules

Only state something as a fact about the user or another real person if Nessie
sources establish it. Treat user questions and hypotheticals as exploration,
not facts. Use words like "discussed", "explored", "asked about", or
"researched" when the source does not establish a claim as true.

When transcripts mention multiple people, verify who said or did what before
attributing. Names appearing in the same source do not mean one person said
everything.

## Authentication Failures

If Nessie tool calls fail with an authentication or entitlement error, tell the
user to run `openclaw nessie init --email <email>` and then
`openclaw nessie init --email <email> --code <code>`. If OTP setup is not
available, tell them to create a Nessie agent API key and run
`openclaw nessie init --api-key sk_nes_v1_...`, or set the key as
`NESSIE_API_KEY` in the OpenClaw environment. Do not ask the user to run a
device-code login flow for this plugin.
