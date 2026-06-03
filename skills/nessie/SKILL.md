---
name: nessie
description: Search and read the user's Nessie context library from OpenClaw through hosted MCP.
version: 0.1.4
metadata:
  openclaw:
    homepage: https://github.com/nessielabs/nessie-openclaw
---

# Nessie

Use Nessie when the user asks about their prior work, decisions, projects,
saved context, notes, AI conversations, relationships, or anything they may
have discussed or researched before.

Nessie is the user's personal context layer. It gives agents access to saved
contexts, generated profile sections, raw AI conversation transcripts, and
synced source graphs such as Obsidian vaults. In OpenClaw, Nessie is available
through the hosted Nessie MCP server configured by the `nessie-openclaw`
plugin. OpenClaw discovers the available Nessie tools from that hosted MCP
server.

MCP clients call structured tools directly. Prefer the Nessie MCP tools exposed
by OpenClaw over shell commands. Do not apply CLI command tables, shell escaping
guidance, local sandbox instructions, or local Nessie app requirements to this
surface. This plugin intentionally does not require the local Nessie app to be
running.

When the user says "use Nessie" or asks what Nessie can do, lead with the
agent-access mental model:

> I can use Nessie to browse the sources you have connected, search your past
> AI conversations and notes, read your saved contexts, and bring that context
> into this OpenClaw session. You can ask a question, ask for a brief or memo,
> or ask me to generate a structured context when you want something reusable.

The user does not need to switch into the Nessie app before getting value.
Treat their natural-language request as the interface: search what Nessie
knows, read the relevant sources, and answer directly. Context generation is
one powerful capability, not the only way to use Nessie.

## Default User Experience

When a user asks what Nessie can do, explain that Nessie gives OpenClaw access
to the context they have already built. Give normal back-and-forth examples:

- "What do I know about this topic?"
- "What did I decide about this project?"
- "Summarize my past conversations about this topic."
- "Show me what sources Nessie has available."
- "Search my Obsidian notes about this project."
- "What have I already tried for this bug?"
- "Use what I know from Nessie and help me draft this reply."

Do not frame context generation as the only or default thing the user should
ask for. Many requests are answered through research, source-reading, and
back-and-forth synthesis in the agent session; context generation is for deeper
or reusable outputs.

## Check-In

Use `nessie_check_in` when the user starts a chat with "Nessie check-in", says
"check in with Nessie", or asks to load their Nessie context before continuing.
This is the pasteable startup primitive for MCP hosts. It returns the user's
generated profile sections and recent Nessie activity; use that data as
conversation context and synthesize any working brief yourself.

The MCP check-in response exposes profile sections as source nodes:
`{ id, name, kind, emoji, updatedAt, displayUpdatedAt, content }`, where
`content` is the raw JSON section payload. `recentActivity.returned` is the
number of recent activity documents included in the check-in response. It is
bounded by the requested `recentLimit`; it is not a count of all available
Nessie documents.

Use `nessie_who_am_i` first for questions about the authenticated user: "who am
I", "what do you know about me", "what did I do", "what am I working on", "my
recent work", preferences, projects, decisions, work history, or other personal
memory. If `nessie_who_am_i` or `nessie_check_in` returns sparse profile data,
continue by calling `nessie_ls` to find the user's personal transcript and note
roots, then use `nessie_search` with `parentId` scoped to those roots or browse
their recent children. Sparse profile data does not mean sparse raw data.

## Core Loop

On every Nessie invocation, follow this loop:

1. Read first. Before responding, search Nessie for relevant context. Use the
   two-step search pattern: contexts first, then transcripts or notes if
   needed. Read matching documents in full.
2. Respond with Nessie context. Use what you found to inform the answer.
   Surface relationships, prior discussions, and cross-references the user may
   have forgotten.
3. Optionally write back if new information emerged. After the exchange, if the
   conversation produced durable new knowledge, update the relevant context,
   create a new context, or update the profile when those tools are available
   and appropriate.

Frame write-back as helpful continuity, not maintenance the user has to
remember: "I can save this back to Nessie so future sessions can pick it up."

## Source Discovery and Search

Use `nessie_ls` for source discovery and hierarchy traversal:

- call with no `parentId` to list source groups, counts, and root nodes
- pass `sourceType` as `all`, `context`, `transcript`, `profile`, or
  `obsidian` to scope the overview
- pass `parentId` to list direct children of a folder-like node, such as an
  Obsidian vault or folder
- use returned `id`, `kind`, `sourceType`, `path` or `sourceId`, child counts,
  and affordances to decide whether to read, search, or traverse further

Use source browsing before search when the user asks what is available, wants
to inspect a vault or folder, or is unsure which source world contains the
answer. Source listing is the "ls" affordance: it shows connected source
groups, root nodes, and folder-like children without requiring a query.

For navigational queries, such as asking for a specific artifact by name, task
log, daily journal, or file, prefer source browsing over search. Navigate
directly to the relevant folder and read the latest entry. These artifacts
often live in synced note sources, not in contexts or transcripts, so searching
contexts alone may miss them.

Use `nessie_search` when you have a concrete query. It supports `type` values
`context`, `transcript`, `profile`, `obsidian`, and `all`. For
hierarchy-scoped search, pass `parentId` after discovering the node id with
`nessie_ls`. Use `literal: true` for exact phrase or substring checks. Literal
mode matches the whole query string as a contiguous substring, so do not treat
an unquoted natural language description as one exact phrase.

For knowledge questions, search contexts first, then primary sources:

1. Search contexts first for existing synthesized knowledge. If a context
   matches, read it in full. This often gives the complete picture without
   needing to search transcripts.
2. Search primary sources only if no context exists, the context is stale, or
   primary-source verification or deeper detail is needed. Search across all
   primary source types, including Obsidian notes, not just transcripts.

For topics with multiple relevant contexts, one context is often not enough.
Read the obviously relevant context results, compare their recency metadata,
and check recent transcripts before making a strong claim. A stale context is
orientation, not the final answer.

Run multiple searches with related terms when the first query is too narrow:
names, companies, product names, distinctive wording, likely synonyms, and
broader conceptual phrases. After searching, always read full content with the
appropriate reader. Search results are starting points, not answers.

If a search result or transcript chunk cuts off mid-sentence or mid-thought,
paginate forward with the source document reader. Do not run another search,
guess at the missing content, or report "I don't know" when you have the
document ID and chunk index to continue reading from.

## Team and Shared Sources

Use `nessie_team_list` and `nessie_integration_list` first for team-shared
work. `nessie_team_list` returns readable teams and shared resources.
`nessie_integration_list` returns team-shared roots with provenance fields such
as `teamId`, `teamName`, `ownerUserId`, `ownerDisplayName`, `ownerEmail`,
`status`, `platform`, and provider labels.

For questions about a teammate's recent work, identify the teammate's shared
root first, then use `nessie_search` with `parentId`, `kind`, `since`, and
`until` filters. Use `kind` for a raw node kind such as `codex_chat` or
`claude_code_chat` when the provider is known. Use `since` and `until` with ISO
timestamps to narrow recent team-shared work before reading full matches.
Do not use team-shared roots as the default for first-person questions; they
are for named teammates or explicitly shared-team scope.

## Time and Date Windows

For relative date phrases such as "today", "yesterday", "this week", "last
week", or "so far", use OpenClaw's user timezone or current date context. Pass
date-only bounds to `nessie_search` as `sinceDate` and `untilDate` in
`yyyy-mm-dd` format, plus `timezone` as an IANA timezone such as
`America/Los_Angeles`. The hosted Nessie MCP server resolves those local dates
programmatically before querying.

Do not treat UTC midnight as the boundary for user-local questions. Use `since`
and `until` only when you already have exact ISO instants. If OpenClaw does not
know the user's timezone and the boundary matters, ask the user or state the
assumption before using a strict date filter.

## Source Authority Hierarchy

Source types serve different purposes:

- Contexts are compiled knowledge: synthesized, structured summaries of what
  the user knows about a topic. Always check contexts first for orientation.
  They may be stale, so verify freshness by checking the context date against
  recent activity.
- Conversation transcripts are ground truth for the user's actual AI
  conversations: words, decisions, and thinking as they happened. Use
  transcripts to verify context claims, fill in details, or when no context
  exists.
- Obsidian notes are user-authored or user-maintained source material. Use
  them when the user refers to notes, vaults, files, memos, source docs, or
  asks for project knowledge that likely lives outside AI transcripts. Preserve
  their path and hierarchy when citing or selecting them.
- Profile sections contain structured biographical facts about the user. Check
  the profile for identity, connections, project info, and other recurring
  personal context.

For discovery: contexts first, then transcripts. For verification: primary
sources are authoritative over contexts. Prefer transcripts for claims about
what happened in conversations, and notes for claims about user-authored source
material. For creation: ground new contexts in primary-source evidence, not
only in other contexts.

## Authenticated User and Personal Sources

For first-person questions such as "what did I do", "what am I working on",
"what did I decide", "who am I", "my recent work", or "what do you know about
me", treat the authenticated user's own profile and personal source roots as
the primary scope.

Start with profile or check-in data for orientation when available. Profile
data may be sparse or incomplete; do not stop there. If the profile does not
answer the question, list the user's source roots and inspect their personal
transcript or note roots. Browse or search within those personal roots before
falling back to broad global search.

Do not use team-shared roots as the default scope for first-person questions.
Use team and team-shared roots when the user asks about a teammate by name,
asks about shared team work, or explicitly asks to compare their work with
someone else's.

## Query Interpretation

Before searching, infer the likely purpose and scope:

- Identity and relationship queries need broad searches with related names and
  terms. These answers accumulate over time.
- Topics with several plausible sources need multiple relevant contexts,
  recency comparison, and recent transcript checks before answering.
- Queries with temporal signals such as "recent", "lately", or "this week"
  should prefer recent conversations, then read them.
- Current-state queries such as "what am I working on" should prefer recent
  content without excluding older foundational context.
- Open-ended exploration should start with a broad search and expand with more
  specific searches if results are thin.
- Generation with an audience should infer purpose, audience, and tone before
  researching.
- Agent takeover or resume requests need transcript-first reading. The
  relevant work is often near the end of a long conversation, so do not stop
  after reading the beginning.

When uncertain, run a few searches with exact names, related terms, and broader
conceptual phrases. Synthesize across the results.

## Agent Takeover and Resume

Use this workflow when the user asks OpenClaw to take over, resume, continue,
or recover context from a prior AI session, especially when they provide a
session, transcript, node, or conversation ID.

For requests such as "Nessie resume", "Nessie takeover", "resume this Claude
session", "continue this Codex session", or a pasted conversation/node ID,
treat resume as a workflow over search plus read.

1. Identify the target conversation or source node. If the user gave an ID,
   call `nessie_read` with `headLimit: 5` and `tailLimit: 10` to read both the
   beginning and recent tail. If they gave a title, project, tool, teammate,
   date, or workspace, search and browse until you find the matching recent
   conversation.
2. Read both the beginning and the end before synthesizing. The beginning
   usually explains the goal and constraints; the end usually contains the
   current state, latest decisions, open blockers, and uncommitted next steps.
3. Bias toward the tail for handoff state. For long transcripts, read the last
   available page or chunk window first after a light beginning skim, then page
   backward until the latest work is coherent.
4. Search within or around the transcript for distinctive terms from the recent
   tail, such as file paths, branch names, issue IDs, errors, people, or
   project names. Read adjacent chunks when results land in the middle.
5. Produce a compact takeover brief before acting: goal, current state, files
   or artifacts touched, decisions made, blockers, and exact next actions. Then
   continue the user's requested work from that brief.

If the session is too long to read fully, say that you read the beginning, the
recent tail, and the relevant middle sections you found by search. Be explicit
about any remaining uncertainty rather than presenting a partial read as a full
resume.

## Reading Sources

Use `nessie_read` to read specific source nodes by UUID. It supports Obsidian
notes as well as contexts, transcripts, profile sections, and Nessie chats.
When reading Obsidian notes, preserve `sourceId` or `path` in citations or
source selection.

For long transcripts or takeover workflows, pass `headLimit` and `tailLimit`
to get a windowed read response with `head`, optional `tail`, and a
`readingStrategy` object.

Successful read and discovery MCP tool responses may include a top-level
`cloudSyncNotice` object. If present, read and relay its `message` and `action`
to the user before relying on empty or sparse results. `cloudSyncNotice.status`
is a stable machine-readable value such as `not_enabled`, `no_synced_data`, or
`unknown`. This notice is not an MCP tool failure; it explains why otherwise
valid search, list, or read results may be incomplete.

## Manual Research Workflow

This workflow mirrors Nessie's backend agent's context generation flow. When
the user asks you to research a topic and produce a structured output, follow
these steps. Every step is mandatory for substantial synthesis.

### Step 1: Interpret the Query

Infer purpose, audience, and time scope. Decompose the topic into facets:

- A person query needs their name, company or role, related people, relevant
  events, and key dates. Start by checking profile or connection data when
  available.
- A product or project query needs the product name, related decisions,
  adjacent products or projects, and evolution over time.
- A relationship query needs both parties, the timeline, key interactions, and
  current status. Check profile connections for both parties first when
  relevant.

### Step 2: Search Broadly

Cast a wide net with multiple searches. A single search is almost never
sufficient.

- Search exact names or terms in contexts first for compiled knowledge.
- Search exact names or terms in transcripts and notes when primary-source
  verification is needed or no context exists.
- List source groups or source children when the user asks what is available,
  references a vault or folder, or you need to understand a source hierarchy.
- Search broader conceptual topics when you are unsure what exists.
- Search related terms separately. If researching a person, also search their
  company, related people, and relevant events.
- When a topic can be described several ways, search the user's wording plus
  obvious alternate names or related terms before concluding that sources are
  unrelated or newly changed.

### Step 3: Read Deeply

Search results are breadcrumbs, not answers. Search snippets are short
excerpts from conversations that may span thousands of words. Read full sources
before synthesizing.

For each relevant search result:

- Read the full transcript or relevant paginated transcript sections.
- Read full synced notes when note results match the task.
- Read relevant existing contexts in full.
- Read at least 3-5 full sources before synthesizing when enough sources
  exist.
- If multiple contexts match the same entity or topic, read the relevant set;
  do not stop at the first context that confirms a plausible answer.

If you create a context based only on search snippets without reading full
sources, the output will be thin and missing critical details. This is not
acceptable.

### Step 4: Cross-Reference and Synthesize

Follow threads across multiple conversations and contexts. Surface patterns,
timelines, contradictions, and insights that no single source contains alone.
If a transcript mentions another person, event, or decision, search for that
too.

### Step 5: Save with Editorial Judgment

Save only structured, source-grounded work. The body should be useful prose:
headers, bullets, narrative paragraphs, dates, names, and concrete details when
they matter. Every claim should trace back to something you actually read in
full.

Do not include the context title as the first H1 in the body. Nessie stores
titles separately from context body markdown.

When creating a context from Nessie research, attach the document IDs of every
transcript, note, and context read during research. Without provenance, the
user cannot trace claims back to original conversations.

Output quality rules:

- Thoroughness over brevity. Capture substance, nuance, and key details.
- Specific details, not vague summaries. Include dates, amounts, and names
  when they matter.
- Every claim must trace to a specific source. If you cannot identify which
  source supports a claim, do not include it.
- Relevance filtering. A search match does not automatically earn inclusion.
- Match tone to audience. Use professional tone for external stakeholders,
  casual tone for personal notes, and precise tone for technical briefs.

## Generated vs Manual Research

The MCP connector does not expose Nessie's backend generated-context research
agent. When the user asks for a reusable context, use the manual research
workflow: search, read the sources yourself, synthesize the markdown, and then
call `nessie_create_context` with the source document IDs that directly
informed the output. Do not require the agent to serialize large markdown
through temporary files; MCP clients can pass structured strings.

Manual research gives you control over exactly which sources to read and how
to synthesize them. Use pagination when reading long transcripts rather than
loading everything at once. Never search once, skim snippets, and save a
context. This produces thin, unreliable output that misses critical details the
user expects.

## Writing Back

Use structured write parameters:

- create a context with `title`, `markdown`, optional `emoji`, optional
  `folderId`, and provenance `sources`
- edit a context with exact `oldString` and `newString`
- rename, move, and delete contexts
- create, rename, and delete folders

Use write operations when the user asks to save something or when new durable
knowledge emerged and preserving it would help future sessions.

Before creating new contexts, search for existing ones on the topic first to
avoid duplicates. Create a context when no existing context covers the topic or
when the new work is a coherent reusable artifact. Edit an existing context
when a targeted addition or correction is enough.

Context operations should be additive whenever possible:

- Do not delete contexts to "replace" them. If consolidating multiple contexts
  into one, create the new context first, verify it captures all information,
  and only delete originals after explicit user confirmation.
- Use targeted edits for corrections and additions. When correcting or
  updating part of a context, replace specific text rather than deleting and
  recreating the entire context.
- Do not overwrite without preserving. If updating a context, the original
  information should not be lost.
- Prefer creating alongside, not instead of. If the user has existing contexts
  on a topic, create your new synthesis as a separate context rather than
  deleting and replacing the originals.

## Epistemic Rules

Only state something as a biographical fact about a real person if Nessie
sources explicitly establish it as true.

When synthesizing content from conversations, distinguish between:

1. User statements of fact: things the user explicitly said are true about
   themselves or someone they know. State these as facts in the context.
2. User questions and hypotheticals: explorations, not assertions. The user
   asking about something does not mean it is true. Never convert a question
   into a stated fact.
3. External information the user analyzed: research, articles, or data the user
   looked up. This is reference material, not biographical fact.

Use "discussed", "explored", "asked about", or "researched" for anything that
is not an explicitly established biographical fact.

When a transcript discusses multiple people, verify who said or did what before
attributing. Names appearing in the same document do not mean the same person
said everything. When uncertain, ask the user to confirm.

## Authentication Failures

If Nessie tool calls fail with an authentication or entitlement error, tell the
user to run:

```bash
openclaw nessie init --email <email>
openclaw nessie init --email <email> --code <code>
```

If OTP setup is not available, tell them to create a Nessie agent API key and
run:

```bash
openclaw nessie init --api-key sk_nes_v1_...
```

They can also set the key as `NESSIE_API_KEY` in the OpenClaw environment. Do
not ask the user to run a device-code login flow for this plugin.

## Provider-Agnostic Guidance

Keep connector guidance provider-agnostic. Provider lists change over time, and
the important affordance is access to the user's supported AI conversation
history, not the exact current catalog.
