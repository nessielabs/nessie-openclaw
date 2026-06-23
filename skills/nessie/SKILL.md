---
name: nessie
description: Search and read the user's Nessie context library from OpenClaw through hosted MCP.
version: 0.1.9
metadata:
  openclaw:
    homepage: https://github.com/nessielabs/nessie-openclaw
---

# Nessie

Use Nessie when the user asks about their prior work, decisions, projects,
saved context, notes, AI conversations, relationships, or anything they may
have discussed or researched before.

Nessie is the context layer for AI-native work — both the user's own work and
their team's. It gives agents unified access to what the user (and, in team
scope, their teammates) already know: saved contexts, generated profile
sections, raw AI conversation transcripts, and synced source graphs such as
Obsidian vaults. In OpenClaw, Nessie is available
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
roots, then use `nessie_grep` with `parentId` scoped to those roots or browse
their recent children. Sparse profile data does not mean sparse raw data.

## Core Loop

On every Nessie invocation, follow this loop:

1. Read first. Before responding, search Nessie for relevant context. Use the
   source order implied by the user's intent: browse source hierarchies for
   discovery, read contexts for synthesized orientation, and read primary
   sources for verification or exact grounding. Read matching documents in
   full.
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

- call with no `parentId` to list the root nodes, including a virtual
  `Contexts` root (a `nessie_folder`) that groups the user's top-level contexts
  and folders; open it by passing its id as `parentId`
- pass `sourceType` as `all`, `context`, `transcript`, `profile`, `obsidian`,
  or `granola` to scope the overview
- `nessie_ls` defaults to `owner: "all_readable"` — everything the user can
  read, their own sources plus team-shared. Pass `current_user` / `me` to
  narrow to the authenticated user's own sources for first-person questions;
  pass an explicit `{ userId }` / `{ email }` for a specific teammate. For named
  teammates, prefer `nessie_team_list` or `nessie_integration_list`, then pass
  the member `userId` / resource `ownerUserId` as `owner: { userId: "..." }`.
  `{ email }` resolves only from existing team member email metadata.
- pass `parentId` to list direct children of a folder-like node, such as an
  Obsidian vault or folder
- use returned `id`, `kind`, `sourceType`, `path` or `sourceId`, child counts,
  `sourceOwner`, and affordances to decide whether to read, search, or traverse
  further

Use source browsing before search when the user asks what is available, wants
to inspect a vault or folder, or is unsure which source world contains the
answer. Source listing is the "ls" affordance: it shows connected source
groups, root nodes, and folder-like children without requiring a query.

For navigational queries, such as asking for a specific artifact by name, task
log, daily journal, or file, prefer source browsing over search. Navigate
directly to the relevant folder and read the latest entry. These artifacts
often live in synced note sources, not in contexts or transcripts, so searching
contexts alone may miss them.

Use `nessie_grep` when you have a concrete query. It returns text blocks — one
per hit, an `id · kind · owner · date · title` header followed by the matching
content; copy a hit's id to read the full node with `nessie_cat`. It supports
`type` values `context`, `transcript`, `profile`, `obsidian`, `granola`, and
`all`. For hierarchy-scoped search, pass `parentId` after discovering the node
id with `nessie_ls` to restrict the search to that node and its descendants.
Pass `repos` (canonical repoKeys) to narrow to specific git repos; that filter
excludes everything not tied to a repo. Use `literal: true` for exact phrase or
substring checks. Literal mode matches the whole query string as a contiguous
substring, so split a natural language description into salient exact terms
rather than treating it as one phrase.

`nessie_grep` and `nessie_ls` default to `owner: "all_readable"` — the user's
own sources plus team-shared. Pass `current_user` / `me` to narrow to the
authenticated user's own sources, and explicit `{ userId }` or `{ email }`
objects for teammate-owned sources.

Do not default every discovery or knowledge request to `type: "context"`.
Choose `type` from the user's intent: use `context` for synthesized
orientation, `obsidian` for notes, vaults, files, memos, source docs, task
logs, and journals, `granola` for recorded meetings and calls, `transcript`
for prior AI conversations and agent resume state, and `all` when several
source types are plausible.

Choose the source order from the user's intent, not from a global ranking:

- Discovery, navigation, and "what sources exist" requests should start with
  `nessie_ls` to list source roots and traverse hierarchies.
- Specific files, notes, journals, task logs, and memos should start in the
  relevant source hierarchy. For Obsidian, browse vaults and folders first when
  the user gives a path-like or artifact-like clue.
- Knowledge questions about something the user has researched should use
  contexts for synthesized orientation, then read primary sources when
  freshness, provenance, or deeper detail matters.
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
Start with recent source discovery and recent transcript search for the
relevant project, product, people, repository, issue, or distinctive terms. Read
several recent matching conversations or notes, including relevant tail windows
for long transcripts, and synthesize across them. Existing contexts can explain
the background, but recent primary sources establish the latest state.

Run multiple searches with related terms when the first query is too narrow:
names, companies, product names, distinctive wording, likely synonyms, and
broader conceptual phrases. After searching, always read full content with the
appropriate reader. Search results are starting points, not answers.

If a search result or transcript chunk cuts off mid-sentence or mid-thought,
paginate forward with the source document reader. Do not run another search,
guess at the missing content, or report "I don't know" when you have the
document ID and chunk index to continue reading from.

A search hit drops you into the middle of a conversation, not its conclusion.
Multi-message conversations build to their resolution at the end — the decision,
the final answer, the "I already handled this", the corrected position that
overturns an earlier one. When the user asks what was decided, what the
conclusion was, who someone is, or what the current state of a thread is, do not
answer from the single chunk a search returned. Read the whole node with
`nessie_cat`, or for a long transcript use `nessie_tail` for the very end —
since the resolution usually comes later, sometimes a few chunks on, sometimes
at the end, and skim its beginning for framing, before you synthesize or
attribute. Reading only the
opening or a middle chunk gives you the setup of a thread, not its outcome, and
is a recurring source of wrong answers and misattributed quotes — the
conversation's title and first messages also tell you whether the matched text
is the user's own words or quoted, pasted, or translated material.

A transcript is a dialogue between the user and an AI agent, and the two voices
do not carry equal authority. The agent proposes — options, drafts, plans,
names, recommendations — but a proposal is not a decision. Anchor on what the
user said: an agent's suggestion only became the outcome if the user adopted it,
and the user's next message often narrows, edits, rejects, or overrides what the
agent just laid out. When you reconstruct what was decided or attribute a
position, treat the agent's text as proposals and scaffolding and the user's
words as what actually holds. Do not mistake the shape the agent sketched for
the shape the user chose.

## Team and Shared Sources

Use `nessie_team_list` and `nessie_integration_list` first for team-shared work.
This is the MCP equivalent of the CLI `nessie team list` /
`nessie integration list --status team_remote` resolver path.

`nessie_team_list` returns readable teams, members, and shared resources.
`nessie_integration_list` returns connected and team-shared roots with
provenance fields such as `teamId`, `teamName`, `ownerUserId`,
`ownerDisplayName`, `ownerEmail`, `status`, `platform`, and provider labels.

Do not use team-shared roots as the default for first-person questions.
Team-shared roots are for named teammates or explicitly shared-team scope.

Follow this resolver workflow for teammate questions:

1. Decide whether the user is asking about themself, a named teammate, or a
   whole shared team. First-person requests stay in the authenticated user's
   scope.
2. For a named teammate, call `nessie_team_list` or `nessie_integration_list`
   before searching. Match the teammate by team member name/email and by shared
   resource metadata.
3. Resolve the teammate owner ID from the member `userId` returned by
   `nessie_team_list` or the resource `ownerUserId` returned by
   `nessie_integration_list`. That resolved ID is the input owner selector;
   returned `sourceOwner` metadata is what you read back to confirm scope.
4. Choose the shared integration root or source root that matches the request.
   Use its root `id` as `parentId` when the user names a provider, repository,
   vault, project, or other source. If the request is broader, you may search
   all readable sources for that owner without `parentId`.
5. Search or browse with `owner: { userId: "..." }`. Add `parentId` for the
   selected root, `kind` for raw node kinds such as `claude_code_chat` or
   `codex_chat`, and date-only `since` / `until` plus `timezone` for time
   windows.
6. Read the matching sources with `nessie_cat` (or `nessie_tail` for the recent
   end of a long transcript) before attributing work or answering. Search and
   list results are routing breadcrumbs, not final evidence.

For questions like "what did Tiger do yesterday?", start with
`nessie_team_list` or `nessie_integration_list`, identify Tiger's shared
integration root and `ownerUserId`, then call `nessie_grep` with
`owner: { userId: "<tiger-owner-user-id>" }`, the selected `parentId` when one
is available, and date-only `since` / `until` plus `timezone`. `nessie_ls` can
be used with the same owner and `parentId` to browse recent children instead of
searching when the request is navigational.

Use `owner: { email: "..." }` only when that email appears in team member
metadata; otherwise email selectors return a clear error instead of silently
producing zero results. Do not pass raw owner strings such as `"tiger"` or
objects shaped as `{ ownerUserId: "..." }`; MCP owner objects use `{ userId }`
or `{ email }`.

Returned descriptors may include both `sourceOwner` and integration/provider
metadata. Use `sourceOwner` as the only ownership and scoping signal. It tells
you whose source/transcript was queried, not who semantically performed every
task mentioned inside the transcript. Read the content before assigning work to
a person. Treat integration fields such as account names, provider names,
device labels, and team/provider labels as provenance only.

If a scoped team search is too broad or sparse, narrow with a smaller time
window, a more specific `parentId`, or a narrower `kind`, then retry.

## Time and Date Windows

For relative date phrases such as "today", "yesterday", "this week", "last
week", or "so far", use OpenClaw's user timezone or current date context when
it is exposed, such as through `agents.defaults.userTimezone`. Pass
date-only bounds to `nessie_grep` and `nessie_ls` through
`since` and `until` as `yyyy-mm-dd` values, plus `timezone` as an IANA timezone
such as `America/Los_Angeles`. The hosted Nessie MCP server resolves those
local dates programmatically before querying.

Treat "this week" and "last week" as the user's local Monday-Sunday week unless
the user gives a different convention.

Do not treat UTC midnight as the boundary for user-local questions. Exact ISO
instants are also accepted through `since` and `until` when you already have
them. Date-only bounds require `timezone`. If OpenClaw does not expose both a
reliable user timezone and current date context, ask the user; do not silently
fall back to UTC.

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
- Profile sections contain structured biographical facts about the user. Check
  the profile for identity, connections, project info, and other recurring
  personal context.

For discovery: browse source roots and hierarchies first. For synthesized
orientation: read relevant contexts. For verification: primary sources are
authoritative over contexts. Prefer transcripts for claims about what happened
in conversations, and notes for claims about user-authored source material. For
creation: ground new contexts in primary-source evidence, not only in other
contexts.

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

When a Nessie tool exposes an `owner` selector, omit it or use `current_user` /
`me` for first-person questions. Pass `owner: { userId: "..." }`,
`owner: { email: "..." }`, or `owner: "team"` only for teammate-owned sources
or explicit shared-team scope. Never infer current-user ownership from provider
account email, integration display name, or machine label; use returned
`sourceOwner` metadata instead.

## When to Use

1. Start of session: use `nessie_who_am_i` or `nessie_check_in` for
   orientation. If profile data is sparse, inspect personal source roots and
   recent transcripts before concluding Nessie lacks information.
2. Prior work: use contexts for orientation when the request is a knowledge
   question, but use source browsing or primary-source search when the work
   likely lives in files, memos, vaults, source documents, or a specific
   conversation.
3. "What do I know about X": search contexts for the compiled picture, then
   read transcripts or notes for verification, freshness, or deeper detail.
4. Past conversations: search transcripts, then read the relevant transcript
   content.
5. Available sources or browsing: use `nessie_ls` before searching.
6. Teammate or shared-team work: resolve the owner first with
   `nessie_team_list` or `nessie_integration_list`, then search or list with
   the resolved `owner`.
7. Reusable synthesis: follow the manual research workflow and create a context
   only when the user asks for one or the exchange produced durable knowledge
   worth preserving.
8. Profile changes: use profile update tools when durable personal facts
   changed; do not edit profile section nodes as normal contexts.

## Query Interpretation

Before searching, infer the likely purpose and scope:

- Identity and relationship queries need broad searches with related names and
  terms. These answers accumulate over time.
- Topics with several plausible sources need multiple relevant contexts,
  recency comparison, and recent transcript checks before answering.
- Queries with temporal signals such as "recent", "lately", or "this week"
  should prefer recent conversations and notes, then read them. Existing
  contexts are background only until checked against recent primary sources.
- Current-state queries such as "what am I working on" should prefer recent
  content without excluding older foundational context.
- Latest-development queries such as "latest developments on Nessie", "what
  changed recently on X", or "where are we now" need a broad synthesis over
  recent transcript/source activity. Search multiple related terms, read several
  recent sources, and compare against any existing context before answering.
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
   call `nessie_head` for the beginning and `nessie_tail` for the recent tail to
   read both ends. If they gave a title, project, tool, teammate, date, or
   workspace, search and browse until you find the matching recent conversation.
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

Use `nessie_cat` to read a specific source node's full content by UUID, and
`nessie_head` / `nessie_tail` for the first / last N lines. They support
Obsidian notes as well as contexts, transcripts, profile sections, Nessie chats,
and single messages; containers (integration roots, vaults, folders) are
rejected with an "is a directory" error pointing back to `nessie_ls`. When
reading Obsidian notes, preserve `sourceId` or `path` in citations or source
selection.

For long transcripts or takeover workflows, read `nessie_head` for the framing
beginning and `nessie_tail` for the recent end rather than loading the whole
node. Use `nessie_stat` to see a node's metadata (kind, owner, size, dates)
without its body — to size or inspect a node before reading it.

Successful read and discovery responses may include a trailing `cloud sync`
notice (text, on the filesystem verbs) or a top-level `cloudSyncNotice` object
(on the JSON profile, check-in, and team tools). If present, read and relay its
message and action to the user before relying on empty or sparse results. The
status is a stable machine-readable value such as `not_enabled`,
`no_synced_data`, or `unknown`. This notice is not a tool failure; it explains
why otherwise valid search, list, or read results may be incomplete.

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
- Conversations build over many exchanges, and the conclusion lands later than
  where a search drops you. Read the chunks that follow the match through to the
  resolution — not just the opening or the single middle chunk — so you capture
  the decision, correction, or outcome, not only the setup.

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
call `nessie_tee` with the source document IDs that directly
informed the output. Do not require the agent to serialize large markdown
through temporary files; MCP clients can pass structured strings.

Manual research gives you control over exactly which sources to read and how
to synthesize them. Use pagination when reading long transcripts rather than
loading everything at once. Never search once, skim snippets, and save a
context. This produces thin, unreliable output that misses critical details the
user expects.

## Writing Back

The write verbs mirror the CLI and return a CLI-style confirmation line, not
JSON:

- `nessie_tee` — create a context with `title`, `markdown`, optional `emoji`,
  optional `folderId`, and provenance `sources`
- `nessie_sed` — edit a context by exact `oldString` / `newString` (unique
  unless `replaceAll`)
- `nessie_mv` — move (`to`), rename (`name`), or unfile (`unfiled`) a context
  (pass exactly one)
- `nessie_rm` — delete a context
- `nessie_mkdir` — create a folder (optional `parentId` to nest)
- `nessie_rename_folder` — rename a folder, and optionally set or clear its
  emoji
- `nessie_rmdir` — delete an empty folder

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
