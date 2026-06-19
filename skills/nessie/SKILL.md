---
name: nessie
description: Search and read the user's Nessie context library from OpenClaw through hosted MCP.
version: 0.1.6
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
synced source graphs such as Obsidian vaults and Granola meeting notes. In
OpenClaw, Nessie is available through the hosted Nessie MCP server configured by
the `nessie-openclaw` plugin. OpenClaw discovers the available Nessie tools from
that hosted MCP server.

MCP clients call structured tools directly. Prefer the Nessie MCP tools exposed
by OpenClaw over shell commands. Do not apply CLI command tables, shell escaping
guidance, local sandbox instructions, or local Nessie app requirements to this
surface. This plugin intentionally does not require the local Nessie app to be
running.

---

# Nessie Agent Behavior

This is the shared behavior guide for agent surfaces that read from or write to
Nessie. Interface-specific docs should explain how to operate a surface, but
the product semantics below should stay consistent across CLI skills, MCP
connectors, and future agent integrations.

## Mental Model

Nessie is the user's personal context layer. It gives agents access to saved
contexts, profile sections, raw AI conversation transcripts, and synced source
graphs such as Obsidian vaults and Granola meeting notes so they can answer
questions, reconstruct prior decisions, and preserve durable knowledge for
future sessions.

When the user says "use Nessie" or asks what Nessie can do, lead with the
agent-access mental model:

> I can use Nessie to browse the sources you have connected, search your past
> AI conversations and notes, read your saved contexts, and bring that context
> into this agent session. You can ask a question, ask for a brief or memo, or
> ask me to generate a structured context when you want something reusable.

The user does not need to switch into the Nessie app before getting value.
Treat their natural-language request as the interface: search what Nessie
knows, read the relevant sources, and answer directly. Context generation is
one powerful capability, not the only way to use Nessie.

Nessie builds context by analyzing the user's AI conversation history across
supported AI providers, including chat apps, coding agents, and research tools.
It can also expose connected source graphs, such as Obsidian vaults with
folders and notes, or Granola meeting notes organized into folders, when those
sources are synced.

## Default User Experience

When a user asks what Nessie can do, explain that Nessie gives agents access
to the context they have already built. Give generic examples of normal
back-and-forth use:

- "What do I know about this topic?"
- "What did I decide about this project?"
- "Summarize my past conversations about this topic."
- "Show me what sources Nessie has available."
- "Search my Obsidian notes about this project."
- "What have I already tried for this bug?"
- "Use what I know from Nessie and help me draft this reply."

It is fine to show a command or tool table when it helps the user understand
the tooling. Do not frame context generation as the only or default thing the
user should ask for. Many requests are answered through research,
source-reading, and back-and-forth synthesis in the agent session; context
generation is for deeper or reusable outputs.

## Search Strategy

Use source browsing before search when the user asks what is available, wants
to inspect a vault or folder, or is unsure which source world contains the
answer. Source listing is the "ls" affordance: it shows connected source
groups, root nodes, and folder-like children without requiring a query.

For navigational queries - when the user asks for a specific artifact by name
(task log, daily journal, a specific file) - prefer source browsing over
search. Navigate directly to the relevant folder and read the latest entry.
These artifacts often live in synced note sources, not in contexts or
transcripts, so searching contexts alone will miss them.

Choose the source order from the user's intent, not from a global ranking:

- Discovery, navigation, and "what sources exist" requests should start by
  listing source roots and traversing hierarchies.
- Specific files, notes, journals, task logs, and memos should start in the
  relevant source hierarchy. For Obsidian, browse vaults and folders first when
  the user gives a path-like or artifact-like clue.
- Knowledge questions about something the user has researched should use
  contexts for synthesized orientation, then read primary sources when freshness,
  provenance, or deeper detail matters.
- Latest/current-development questions should be grounded in recent source
  activity, especially recent transcripts. Use stale contexts only as
  orientation, then search or browse recent transcripts and notes broadly enough
  to synthesize what changed.
- Verification and exact grounding should read primary sources. Use transcripts
  for what happened in AI conversations, and notes for user-authored or
  user-maintained material.
- Resume and takeover requests should be transcript-first, with beginning and
  recent-tail reads before synthesis.

Context search is an orientation tool, not the universal first step. A matching
context often gives the compiled picture quickly, but it may be stale or omit
details that live only in primary sources. Obsidian notes and conversation
transcripts are not fallback sources when the user's request clearly points to
them.

For topics with multiple relevant contexts, one context is often not enough.
Read the obviously relevant context results, compare their recency metadata,
and check recent transcripts before making a strong claim. A stale context is
orientation, not the final answer.

For questions like "latest developments on X", "what changed recently", "where
are we now", or "what is the current state", do not stop at existing contexts.
Start with recent source discovery and recent transcript search for the relevant
project, product, people, repository, issue, or distinctive terms. Read several
recent matching conversations or notes, including relevant tail windows for long
transcripts, and synthesize across them. Existing contexts can explain the
background, but recent primary sources establish the latest state.

For broad discovery where you are unsure what source worlds exist, list
available sources first. Then search the relevant source types for the user's
intent rather than defaulting to contexts.

Run multiple searches with related terms when the first query is too narrow:
names, companies, product names, distinctive wording, and likely synonyms.

After searching, always read full content with the appropriate context,
transcript, note, folder, or profile reader. Search results are starting
points, not answers.

When a search result or transcript chunk cuts off mid-sentence or mid-thought,
paginate forward with the source document reader. Do not run another search,
guess at the missing content, or report "I don't know" when you have the
document ID and chunk index to continue reading from. A cutoff is a signal to
keep reading, not to stop.

## Source Authority Hierarchy

Source types serve different purposes:

- Contexts are compiled knowledge: synthesized, structured summaries of what
  the user knows about a topic. Use them for orientation and reusable summaries
  when the user asks a knowledge question. They may be stale, so verify
  freshness by checking the context date against recent activity and primary
  sources when the answer depends on current or exact details.
- Conversation transcripts are ground truth for the user's actual AI
  conversations: words, decisions, and thinking as they happened. Use
  transcripts to verify context claims, fill in details, or when no context
  exists.
- Obsidian notes are user-authored or user-maintained source material. Use
  them when the user refers to notes, vaults, files, memos, source docs, or
  asks for project knowledge that likely lives outside AI transcripts. Preserve
  their path and hierarchy when citing or selecting them.
- Granola notes are AI-generated summaries of the user's recorded meetings,
  organized into folders. Use them when the user refers to a meeting, call,
  interview, or who-said-what, or asks for decisions and action items from a
  conversation that happened on a call rather than in an AI chat. Browse granola
  folders to find a meeting; reading a note returns its AI meeting summary, and
  the raw transcript turns are indexed for search (they surface under transcript
  or all-type search), not as browsable child nodes.
- Profile sections contain structured biographical facts about the user. Check
  the profile for identity, connections, project info, and other recurring
  personal context.

For discovery: browse source roots and hierarchies first.
For synthesized orientation: read relevant contexts.
For verification: primary sources are authoritative over contexts. Prefer
transcripts for claims about what happened in conversations, and notes for
claims about user-authored source material.
For creation: ground new contexts in primary-source evidence, not only in other
contexts.

## Authenticated User and Personal Sources

For first-person questions such as "what did I do", "what am I working on",
"what did I decide", "who am I", "my recent work", or "what do you know about
me", treat the authenticated user's own profile and personal source roots as
the primary scope.

Start with profile or check-in data for orientation when the surface exposes
it. Profile data may be sparse or incomplete; do not stop there. If the profile
does not answer the question, list the user's source roots and inspect their
personal transcript or note roots. Browse or search within those personal roots
before falling back to broad global search.

Do not use team-shared roots as the default scope for first-person questions.
Use team and team-shared roots when the user asks about a teammate by name,
asks about shared team work, or explicitly asks to compare their work with
someone else's.

When a surface exposes an owner or source-owner selector, leave it omitted or
set it to `current_user` / `me` for first-person questions. Pass an explicit
teammate identifier, teammate email, or `team` only when the user asks for that
person's sources or shared team scope.

Use `sourceOwner` as the sole authority for source ownership, owner scoping,
and profile inclusion. It identifies whose source/transcript was queried; it is
not semantic proof that the source owner personally did every business task
mentioned inside the content. Read the content before attributing work. Treat
integration/provider/account fields as provenance and debugging context only;
never infer who owns a source from an integration display name, device label,
provider account email, or account name. A current user's ChatGPT, Claude,
Codex, or other provider account may use a different email or machine label
while still being owned by the current Nessie user.

## Temporal Interpretation

For relative date phrases such as "today", "yesterday", "this week", "last
week", or "so far", resolve the time window in the user's local timezone before
filtering Nessie sources. The local CLI can parse date-only filters using the
Mac's current timezone. Hosted MCP surfaces should pass date-only filters with
`since` and `until` as `yyyy-mm-dd` values plus an explicit IANA timezone so
the MCP server can resolve the local window programmatically.

If the surface exposes a user timezone, use it. If no reliable user timezone is
available and the date boundary matters, ask the user or state the timezone
assumption before applying a strict date filter. Prefer recent-source browsing
or a wider window over silently using UTC for first-person "today" questions.

## Query Interpretation

Before searching, infer the likely purpose and scope:

- Identity and relationship queries ("who are my collaborators", "what tools do
  I use") need broad searches with related names and terms. These answers
  accumulate over time.
- Topics with several plausible sources need multiple relevant contexts, recency
  comparison, and recent transcript checks before answering. Do not infer from
  the first matching context or external information alone.
- Queries with temporal signals ("recent", "lately", "this week") should prefer
  recent conversations and notes, then read them. Existing contexts are
  background only until checked against recent primary sources.
- Current-state queries ("what am I working on") should prefer recent content
  without excluding older foundational context.
- Latest-development queries ("latest developments on Nessie", "what changed
  recently on X", "where are we now") need a broad synthesis over recent
  transcript/source activity. Search multiple related terms, read several recent
  sources, and compare against any existing context before answering.
- Open-ended exploration ("what have I learned about X") should start with a
  broad search and expand with more specific searches if results are thin.
- Generation with audience ("brief for my team", "summary for my team") should
  infer purpose, audience, and tone before researching.
- Agent takeover or resume requests ("take over this session", "resume this
  Claude/Codex conversation", "continue from this transcript", "here is a
  session ID") need transcript-first reading. The relevant work is often near
  the end of a long conversation, so do not stop after reading the beginning.
- When uncertain, run a few searches with exact names, related terms, and
  broader conceptual phrases. Synthesize across the results.

## Agent Takeover / Resume

Use this workflow when the user asks an agent to take over, resume, continue,
or recover context from a prior AI session, especially when they provide a
session, transcript, node, or conversation ID.

1. Identify the target conversation or source node. If the user gave an ID,
   read that node directly. If they gave a title, project, tool, teammate,
   date, or workspace, search and browse until you find the matching recent
   conversation.
2. Read both the beginning and the end before synthesizing. The beginning
   usually explains the goal and constraints; the end usually contains the
   current state, latest decisions, open blockers, and uncommitted next steps.
3. Bias toward the tail for handoff state. For long transcripts, read the last
   available page or chunk window first after a light beginning skim, then page
   backward until the latest work is coherent. Do not assume offset 0 is the
   most important part of an old session.
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

## Core Loop: Read -> Respond -> Optional Write Back

On every Nessie invocation, follow this loop:

1. Read first. Before responding, search Nessie for relevant context. Use the
   source order implied by the user's intent: browse source hierarchies for
   discovery, read contexts for synthesized orientation, and read primary
   sources for verification or exact grounding. Read matching documents in full.
   The response is better when grounded in what Nessie already knows.
2. Respond with Nessie context. Use what you found to inform the answer. Surface
   relationships, prior discussions, and cross-references the user may have
   forgotten.
3. Optionally write back if new information emerged. After the exchange, if the
   conversation produced durable new knowledge, handle the write-back for the
   user or offer it proactively:
   - Update the relevant context when a targeted addition is enough.
   - Create a new context if no existing one covers the topic.
   - Update the user's profile if biographical facts changed.
   Do not make this sound like maintenance the user has to remember. Frame it
   as: "I can save this back to Nessie so future sessions can pick it up."

## When to Use

1. Start of session: read the profile to understand the user. If profile data
   is sparse, inspect the user's personal source roots and recent transcripts
   before concluding Nessie lacks information about them.
2. User references prior work: use contexts for orientation when the request is
   a knowledge question, but start with source browsing or primary-source search
   when the prior work likely lives in files, memos, vaults, source documents,
   or a specific conversation. Read full content, not just snippets.
3. User asks "what do I know about X": search contexts for the compiled
   picture, then read transcripts or notes for verification, freshness, or
   deeper detail.
4. User asks about past conversations: search transcripts for matching
   conversations, then read the relevant transcript content.
5. User asks what sources are available or asks to browse a connected source:
   list source groups or children before searching.
6. Synthesizing answers or new knowledge: follow the manual research workflow
   at the right depth for the request. Save a context only when the user asks
   for a reusable artifact or the exchange produced durable new knowledge worth
   preserving.
7. Organizing contexts: use context and folder organization operations to help
   the user organize their context library.
8. Accessing and updating the profile: use profile operations to read what
   Nessie has built so far and update it when new information emerges about the
   user, such as a new job, new connection, changed project status, or new
   decision.

## Manual Research Workflow

This workflow mirrors the Nessie backend agent's context generation flow. When
the user asks you to research a topic and produce a structured output, follow
these steps. Every step is mandatory for substantial synthesis.

### Step 1: Interpret the Query

Infer purpose, audience, and time scope. Decompose the topic into facets:

- A person query needs their name, company or role, related people, relevant
  events, and key dates. Always start by checking profile or connection data
  when available. Use that as your starting point before searching transcripts.
- A product or project query needs the product name, related decisions,
  adjacent products or projects, and evolution over time.
- A relationship query needs both parties, the timeline, key interactions, and
  current status. Check profile connections for both parties first when
  relevant.

### Step 2: Search Broadly

Cast a wide net with multiple searches. A single search is almost never
sufficient.

- List source groups or source children when the user asks what is available,
  references a vault or folder, or you need to understand a source hierarchy.
- Search exact names or terms in contexts when compiled knowledge would help
  orient the task.
- Search exact names or terms in transcripts and notes when primary-source
  verification is needed, no context exists, or the user asks about artifacts,
  notes, files, conversations, task logs, journals, or other source material.
- Search broader conceptual topics when you are unsure what exists.
- Search related terms separately. If researching a person, also search their
  company, related people, and relevant events.
- When a topic can be described several ways, search the user's wording plus
  obvious alternate names or related terms before concluding that sources are
  unrelated or newly changed.

### Step 3: Read Deeply

Search results are breadcrumbs, not answers. Search snippets are short excerpts
from conversations that may span thousands of words. Read full sources before
synthesizing.

For each relevant search result:

- Read the full transcript or relevant paginated transcript sections.
- Read full synced notes when note results match the task.
- Read relevant existing contexts in full.
- Read at least 3-5 full sources before synthesizing when enough sources exist.
- If multiple contexts match the same entity or topic, read the relevant set;
  do not stop at the first context that confirms a plausible answer.
- Conversations often build over many exchanges. Read enough to understand the
  full picture.

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
transcript and context read during research. Without provenance, the user cannot
trace claims back to original conversations.

Output quality rules:

- Thoroughness over brevity. Capture substance, nuance, and key details. A thin
  summary is not useful. Err on the side of comprehensive; the user can ask for
  edits later.
- Specific details, not vague summaries. Include dates, quotes, amounts, and
  names when they matter.
- Every claim must trace to a specific source. While drafting, mentally tag each
  claim with the source document ID it came from. If you cannot identify which
  source supports a claim, do not include it.
- Relevance filtering. A search match does not automatically earn inclusion.
  Ask whether it serves the purpose of the context.
- Match tone to audience. Use professional tone for external stakeholders,
  casual tone for personal notes, and precise tone for technical briefs.

### Multi-Person Attribution

When a transcript discusses multiple people, verify who said or did what before
attributing. Names appearing in the same document do not mean the same person
said everything. When uncertain, ask the user to confirm.

### Epistemic Rules

Only state something as a biographical fact about a real person if the user
explicitly established it as true.

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

## Generated vs Manual Research

Generated context research is available only on surfaces that expose Nessie's
backend generation workflow, such as the app and CLI. Adapter-specific
instructions may narrow this guidance when a surface does not expose that
workflow.

Use generated context research when:

- The user wants a comprehensive brief, memo, summary, or prep doc grounded
  purely in their conversation history.
- The task needs synthesis across their overall history or profile, and manual
  search is likely to overfit to granular transcript citations.
- You need higher-accuracy synthesis from Nessie's backend research agent.
- The user pushes back on manual output quality after multiple rounds.

Use the manual research workflow when:

- You need to combine Nessie data with external information or code context.
- You want to control exactly which sources are consulted.
- You are answering a question directly in the agent session and need to search,
  read, and synthesize from Nessie sources before responding.
- You are creating a context that synthesizes across Nessie data and other
  sources such as files, web, or codebase context.

Both workflows have the same source authority rules. Manual research gives you
control over exactly which sources to read and how to synthesize them. Use
pagination when reading long transcripts rather than loading everything at once.
Generated context research re-runs research from scratch, so treat it as a
deliberate escalation for deeper synthesis rather than the default next step
after every manual answer.

Never search once, skim snippets, and save a context. This produces thin,
unreliable output that misses critical details the user expects.

Do not keep forcing a manual answer after the user has pushed back on quality.
If the task needs deeper synthesis or the user is not satisfied after multiple
rounds, use a generated research workflow when available and incorporate that
output.

## Auto Write-Back

This is step 3 of the core loop. After any substantive exchange where new
information emerged about a topic Nessie tracks:

- Prompt naturally. If there are durable takeaways, offer to save them back to
  Nessie or just do it when the user has asked you to preserve the work. The
  user should not feel responsible for manual library maintenance.
- Existing context on the topic? Add the new information to that context.
  Targeted edits are better than full rewrites.
- No existing context? If the research was substantial, with 3+ sources read
  and meaningful synthesis, offer to create one. Keep the prompt simple:
  "Want me to save this back to Nessie for next time?"
- Profile changed? Update the relevant profile section or card.

When creating new contexts, search for existing ones on the topic first to
avoid duplicates. Use file-backed body inputs when available for creation to
avoid escaping issues with special characters. Organize into an appropriate
folder.

## Non-Destructive Operations

Context operations should be additive whenever possible:

- Do not delete contexts to "replace" them. If consolidating multiple contexts
  into one, create the new context first, verify it captures all information,
  and only delete originals after explicit user confirmation.
- Use targeted edits for corrections and additions. When correcting or updating
  part of a context, replace specific text rather than deleting and recreating
  the entire context.
- Do not overwrite without preserving. If updating a context, the original
  information should not be lost.
- Prefer creating alongside, not instead of. If the user has existing contexts
  on a topic, create your new synthesis as a separate context rather than
  deleting and replacing the originals.

---

# Nessie MCP Adapter

MCP clients call structured tools directly. Do not apply CLI command tables,
shell escaping guidance, or local sandbox instructions to this surface.

Successful read and discovery MCP tool responses may include a top-level
`cloudSyncNotice` object. If present, read and relay its `message` and `action`
to the user before relying on empty or sparse results. `cloudSyncNotice.status`
is a stable machine-readable value such as `not_enabled`, `no_synced_data`, or
`unknown`. This notice is not an MCP tool failure; it explains why otherwise
valid search, list, or read results may be incomplete.

Use `nessie_check_in` when the user starts a chat with "Nessie check-in", says
"check in with Nessie", or asks to load their Nessie context before continuing.
This is the pasteable startup primitive for MCP hosts such as Claude Web. It
returns only the user's generated profile sections and recent Nessie activity;
the host agent should use that data as conversation context and synthesize any
working brief itself.

The MCP check-in response exposes profile sections as source nodes:
`{ id, name, kind, emoji, updatedAt, displayUpdatedAt, content }`, where
`content` is the raw JSON section payload. This differs from the local CLI
`nessie check-in` response, which is optimized for SessionStart hook rendering
and returns parsed profile values as `{ name, value, updatedAt }`. Do not assume
the two adapter surfaces have identical response shapes.

`recentActivity.returned` is the number of recent activity documents included in
the check-in response. It is bounded by the requested `recentLimit`; it is not a
count of all available Nessie documents.

Use `nessie_who_am_i` first for questions about the authenticated user: "who am
I", "what do you know about me", "what did I do", "what am I working on", "my
recent work", preferences, projects, decisions, work history, or other personal
memory. If `nessie_who_am_i` or `nessie_check_in` returns sparse profile data,
continue by calling `nessie_ls` to find the user's personal transcript and note
roots, then use `nessie_search` with `parentId` scoped to those roots or browse
their recent children. Sparse profile data does not mean sparse raw data.

Use `nessie_ls` for source discovery and hierarchy traversal:

- call with no `parentId` to list source groups, counts, and root nodes
- pass `sourceType` as `all`, `context`, `transcript`, `profile`, `obsidian`,
  or `granola` to scope the overview
- when date filters are present without `parentId`, roots remain visible for
  discovery while counts are date-filtered; child listings are date-filtered
- leave `owner` omitted, or pass `current_user` / `me`, for the authenticated
  user's own sources; pass `team` or an explicit `{ userId }` / `{ email }`
  only for a teammate or explicit shared-team question. For named teammates,
  prefer `nessie_team_list` or `nessie_integration_list`, then pass the member
  `userId` / resource `ownerUserId` as `owner: { userId: "..." }`. `{ email }`
  resolves only from existing team member email metadata.
- pass `parentId` to list direct children of a folder-like node, such as an
  Obsidian vault or folder, or a Granola integration root (top-level folders +
  loose meeting notes) or granola folder
- use returned `id`, `kind`, `sourceType`, `path` or `sourceId`, child counts,
  `sourceOwner`, and affordances to decide whether to read, search, or traverse
  further

Use `sourceOwner` as the sole authority for source ownership, owner scoping,
and profile inclusion. It identifies whose source/transcript was queried; it
does not prove who semantically performed every task mentioned inside the
content. Read the content before attributing work. Treat
integration/provider/account metadata as provenance and debugging context only.
Never infer source ownership from an integration display name, provider account
email, machine label, or account name; those can differ from the authenticated
Nessie user who owns the source.

Use `nessie_team_list` and `nessie_integration_list` first for team-shared
work. `nessie_team_list` returns readable teams and shared resources.
`nessie_integration_list` returns team-shared roots with provenance fields such
as `teamId`, `teamName`, `ownerUserId`, `ownerDisplayName`, `ownerEmail`,
`status`, `platform`, and provider labels. For questions about a teammate's
recent work, identify the teammate's shared root first, then use
`nessie_search` with `owner: { userId: "..." }` plus `parentId`, `kind`,
`since`, and `until` filters. Use `owner: { email: "..." }` only when that
email appears in team member metadata; otherwise email selectors return a clear
error instead of silently producing zero results.
Do not use team-shared roots as the default for first-person questions; they
are for named teammates or explicitly shared-team scope.

Use `nessie_ls` when the user asks what sources are available, asks to browse a
vault or folder, or when you need orientation before searching. Use
`nessie_search` when you have a concrete query. `nessie_search` supports
`type` values `context`, `transcript`, `profile`, `obsidian`, `granola`, and
`all`.
`nessie_search`, `nessie_ls`, and `nessie_list` default to `owner:
"current_user"`; use `owner: "team"` for explicit team-wide discovery and
explicit `{ userId }` or `{ email }` objects for teammate-owned sources.

Do not default every discovery or knowledge request to `type: "context"`.
Choose `type` from the user's intent: use `context` for synthesized
orientation, `obsidian` for notes, vaults, files, memos, source docs, task
logs, and journals, `granola` for recorded meetings, calls, and interviews,
`transcript` for prior AI conversations and agent resume state, and `all` when
several source types are plausible.

For "latest developments", current-state, or "what changed recently" questions,
search and browse recent primary sources before answering. Use `nessie_ls` to
find recent personal roots when needed, then call `nessie_search` with
`type: "transcript"`, `type: "obsidian"`, or `type: "all"` plus `since` /
`until` when a time window is available. Existing contexts can orient the
answer, but recent transcripts and notes establish what is current.

For hierarchy-scoped search, pass `parentId` to `nessie_search`. The search is
restricted to that source node and its descendants. This is the right shape for
"search within this Obsidian vault/folder" after discovering the node id with
`nessie_ls`.

Use `kind` for a raw node kind such as `codex_chat` or `claude_code_chat` when
the provider is known. Use `since` and `until` on `nessie_search` and
`nessie_ls` to narrow recent work before reading full matches; for "what did X
work on" date-windowed questions, `nessie_ls` on the teammate's root with
`owner` returns conversation-level nodes directly. `nessie_list` is a legacy
flat document list - prefer `nessie_ls` for browsing and `nessie_search` for
queries.

For relative date requests such as "today", "yesterday", or "this week", prefer
date-only `since` and `until` values plus `timezone` over manually computed ISO
timestamps. Pass date-only bounds as `yyyy-mm-dd` plus an IANA timezone such as
`America/Los_Angeles`; the MCP server resolves the user-local start and end of
day before querying. Exact ISO instants are also accepted through `since` and
`until` when you already have them. Date-only bounds require `timezone`; do not
treat UTC midnight as the default boundary for user-local questions.

For requests such as "Nessie resume", "Nessie takeover", "resume this Claude
session", "continue this Codex session", or a pasted conversation/node ID, treat
resume as a workflow over search plus read. If the user gave an ID, call
`nessie_read` with `headLimit: 5` and `tailLimit: 10` to read both the beginning
and recent tail. If the user did not provide an ID, call `nessie_search` with
`type: "transcript"` and the user-provided clue to get conversation candidates,
including imported transcripts and Nessie chats. Choose the matching candidate
ID, then call `nessie_read` with head/tail limits. For takeover quality, always
read both the beginning and the recent tail before summarizing; then search
distinctive terms from the tail and read adjacent chunks before continuing the
work.

For exact phrase or substring checks, pass `literal: true` to `nessie_search`.
Literal mode matches the whole query string as a contiguous substring. Use it
when the user asks which files mention specific quoted or exact wording. Do not
treat an unquoted natural language description as one exact phrase; split it
into salient exact terms or use hybrid search for semantic discovery.

Use `nessie_read` to read specific source nodes by UUID. It supports Obsidian
notes as well as contexts, transcripts, profile sections, and Nessie chats.
When reading Obsidian notes, preserve `sourceId`/`path` in citations or source
selection. For long transcripts or takeover workflows, pass `headLimit` and
`tailLimit` to get a windowed read response with `head`, optional `tail`, and a
`readingStrategy` object.

Use structured write parameters:

- create a context with `title`, `markdown`, optional `emoji`, optional
  `folderId`, and provenance `sources`
- edit a context with exact `oldString` and `newString`
- rename, move, and delete contexts
- update a structured profile card with `section`, 0-based `index`, and string
  field `updates`
- create, rename, and delete folders

Do not use `nessie_edit_context` to update profile section nodes returned by
`nessie_who_am_i`, `nessie_check_in`, `nessie_ls`, or `nessie_read`. Profile
sections have kinds such as `nessie_profile_upcoming_section`, and structured
card sections such as `upcoming`, `projects`, `decisions`, `connections`,
`workExperience`, `education`, and `expertise` should be updated with
`nessie_update_profile_card`. The profile read tool exposes the work section as
`work`; the profile card update tool uses the structured profile field name
`workExperience` for that same backing section.

The MCP connector does not expose Nessie's backend generated-context research
agent. When the user asks for a reusable context, use the manual research
workflow: search, read the sources yourself, synthesize the markdown, and then
call `nessie_create_context` with the source document IDs that directly
informed the output. Do not require the agent to serialize large markdown
through temporary files; MCP clients can pass structured strings.

Keep connector guidance provider-agnostic. Provider lists change over time, and
the important affordance is access to the user's supported AI conversation
history, not the exact current catalog.

---

# Nessie OpenClaw Adapter

This surface is an OpenClaw plugin that talks to the hosted Nessie MCP server.
Use the Nessie MCP tools (`nessie_ls`, `nessie_search`, `nessie_read`,
`nessie_check_in`, `nessie_who_am_i`, `nessie_integration_list`,
`nessie_team_list`, and the context/profile write tools) exactly as described in
the MCP guidance above. There is no local CLI and no local Nessie app on this
surface.

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
history and synced sources, not the exact current catalog.
