# Nessie Agent Workflows

This file defines the product behavior for agents using the Nessie skill.
Adapter-specific `SKILL.md` files explain how to run commands in each host;
these rules explain when to search, what to read, and when to write back.

## Mental Model

Nessie is the user's personal context layer. It gives agents access to saved
contexts, raw AI conversation transcripts, synced source graphs such as
Obsidian vaults, and other source material so the agent can answer with the
user's existing context instead of starting from scratch.

When the user asks what Nessie can do, explain it in agent terms:

> I can use Nessie to browse your connected sources, search your past AI
> conversations and saved contexts, read the relevant source material, and bring
> that context into this agent session. You can ask a question, ask for a brief,
> or ask me to save a reusable context for next time.

Treat natural language as the interface. The user should not need to know which
script to run. Choose the right commands, read the relevant sources, and answer
directly.

## Core Loop

1. Read first. Search or browse Nessie before answering questions about the
   user's prior work, conversations, decisions, projects, or saved knowledge.
2. Read full sources. Search snippets are breadcrumbs, not answers. Use
   `scripts/read.sh` before making strong claims.
3. Synthesize in the session. Answer using the retrieved context and name the
   source types you relied on when it helps the user judge confidence.
4. Write back when useful. If the exchange produced durable knowledge, offer to
   save it as a context or update an existing context.

## Startup Check-In

Some Nessie host surfaces expose a dedicated check-in primitive. Use it when
the user starts with "Nessie check-in", says "check in with Nessie", or asks to
load their Nessie context before continuing.

For MCP hosts, call `nessie_check_in`. It returns generated profile sections and
recent Nessie activity. Treat that response as conversation context, not as the
entire answer. If the user asks a specific follow-up, continue with the normal
search -> read -> answer loop.

For the script fallback in this package, there is not yet an exact REST
equivalent of `nessie_check_in`. Do not invent one. Use source browsing and
search instead:

```bash
scripts/ls.sh
scripts/search.sh "current work recent decisions projects" all
```

Then read any relevant results before answering.

## When to Use Nessie

Use Nessie when the user:

- asks what they know, decided, tried, researched, or discussed before;
- references prior AI conversations, saved contexts, notes, memos, sources, or
  projects;
- asks for a brief, memo, prep doc, timeline, relationship summary, decision
  history, or project state grounded in their past work;
- asks what sources are available;
- asks to save reusable knowledge for future agent sessions.

Do not use Nessie as a substitute for web search or codebase search. Combine
Nessie with those tools when the task needs both personal context and external
or repository facts.

## Source Authority

Source types serve different roles:

- Contexts are synthesized knowledge. Search them first for orientation.
- Transcripts are primary evidence for what happened in AI conversations.
- Notes and source graphs are user-authored or user-maintained material. Use
  them when the user references files, vaults, folders, memos, journals, or
  project notes.

For discovery, start with contexts. For verification, prefer primary sources
over synthesized contexts. For creation, ground new contexts in primary-source
evidence whenever possible.

## Search Strategy

For knowledge questions:

1. Search contexts first:

   ```bash
   scripts/search.sh "topic" context
   ```

2. Read the best matching context in full:

   ```bash
   scripts/read.sh <document-id>
   ```

3. Search transcripts and notes when no context exists, the context is stale, or
   primary-source detail is needed:

   ```bash
   scripts/search.sh "topic" transcript
   scripts/search.sh "topic" obsidian
   scripts/search.sh "topic" all
   ```

For navigation questions, browse before searching:

```bash
scripts/ls.sh
scripts/ls.sh obsidian
scripts/ls.sh all <parent-id>
scripts/read.sh <document-id>
```

Use browsing when the user asks what sources exist, wants to inspect a vault or
folder, or asks for a specific artifact by name.

Run multiple searches when the first query is too narrow. Use names, companies,
project names, related people, exact phrases, and likely synonyms. Do not stop
after the first plausible hit if the answer depends on a timeline, current
state, or several related decisions.

## Manual Research Workflow

Use this workflow for substantial briefs, summaries, timelines, prep docs, and
high-confidence answers.

### 1. Interpret the Query

Infer purpose, audience, time scope, and likely source types.

- Person or relationship queries need names, companies, related people, key
  interactions, and current status.
- Product or project queries need the product name, related decisions, adjacent
  projects, and evolution over time.
- Current-state queries should prefer recent content while still checking
  foundational contexts.

### 2. Search Broadly

Search exact terms, related terms, and broader conceptual phrases. Start with
contexts, then primary sources. For source hierarchies, list sources before
searching.

### 3. Read Deeply

Read the relevant documents, not only snippets. When enough sources exist, read
at least 3-5 full sources before synthesizing a substantial answer. If a result
cuts off mid-thought, paginate with `scripts/read.sh <id> <offset> <limit>`
instead of guessing.

### 4. Cross-Reference

Compare sources for recency, contradictions, and missing context. Follow
mentions of related people, decisions, dates, or projects with additional
searches when they matter.

### 5. Synthesize

Prefer specific details over vague summaries. Include dates, names, decisions,
and concrete outcomes when they matter. Distinguish what the user stated as
fact from questions, hypotheticals, and external material they merely analyzed.

## Writing Back

Use write operations when the user asks to save something or when new durable
knowledge emerged and preserving it would help future sessions.

Before creating a new context, search for existing contexts on the topic:

```bash
scripts/search.sh "topic" context
```

Create a context when no existing context covers the topic or when the new work
is a coherent reusable artifact:

```bash
scripts/create-context.sh "Context title" /path/to/body.md
```

Edit an existing context when a targeted addition or correction is enough:

```bash
scripts/edit-context.sh <context-id> /tmp/old.txt /tmp/new.txt
```

Write-back rules:

- Keep operations additive unless the user explicitly asks to replace or remove
  content.
- Do not delete or overwrite existing context to "clean up" without explicit
  confirmation.
- Do not include the title as the first H1 in the body; Nessie stores titles
  separately.
- When writing synthesized context, make the body useful prose with headings,
  bullets, dates, names, and concrete details.

## Epistemic Rules

Only state something as a fact about the user or another real person if the
sources establish it. Treat user questions and hypotheticals as exploration,
not facts. Use words like "discussed", "explored", "asked about", or
"researched" when the source does not establish a claim as true.

When transcripts mention multiple people, verify who said or did what before
attributing. Names appearing in the same source do not mean one person said
everything.

## Failure Handling

If a command says the user is not logged in, run:

```bash
scripts/login.sh
```

If a command returns `agent_access_required`, tell the user Nessie agent access
requires Pro or an active trial.

If a search has no relevant results, say that Nessie did not find relevant
context and continue with the best available tools. Do not invent personal
context.
