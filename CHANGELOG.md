# Changelog

All notable changes to `@nessielabs/nessie-openclaw` are documented here. This
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); each
release is tagged `vX.Y.Z` on the commit that carries that version.

## 0.1.19 - 2026-07-17

- Skill: explain how to inspect images referenced by Nessie contexts through the hosted MCP asset tool.

## 0.1.18 - 2026-07-17

- Skill: explain how to inspect images referenced by Nessie contexts through the hosted MCP asset tool.

## 0.1.17 - 2026-07-12

- Skill: surface the team use case in the what-can-Nessie-do answer. The mental-model lead-in and Default UX examples were first-person only, so asking the skill what it can do never mentioned teams; add a team clause to the lead-in and team-oriented example questions (querying a team's shared sources, reading a teammate's sessions) with no hardcoded names. Mirrors the upstream `nessie-core` change.

## 0.1.16 - 2026-07-08

- Skill: check-in should pass `timezone` to `nessie_check_in` / `nessie_who_am_i` so recent-activity and profile display timestamps render in the user's local time instead of UTC, and should read the tail of recent conversations with `nessie_tail` before summarizing current work, since names/labels describe where a thread began and go stale for long-running chats (NESSIE-1274).

## 0.1.15 - 2026-07-05

- Skill: document opaque `grp_…` device-group ids from the local Nessie CLI/app - this connector keys combined device-group entries on a representative UUID root and cannot resolve pasted `grp_…` ids yet; agents are told to rerun `nessie_ls` and use the combined entry's UUID (NESSIE-1216/NESSIE-1242).

## 0.1.14 - 2026-07-02

- Skill: document the `nessie_move_folder` tool (move a folder into another folder, or to the top level; rejects moving a folder into itself or one of its own subfolders).

## 0.1.13 - 2026-06-29

- Skill: document the `nessie_ls` shared column and folder share inheritance.
- Skill: mirror upstream "bounded headline" wording for the shared column.

## 0.1.12 - 2026-06-28

- Skill: document `nessie_delete_conversation` in the bundled guidance.

## 0.1.11 - 2026-06-26

- Skill: surface the Chats root and name its kind (`nessie_folder`).

## 0.1.10 - 2026-06-23

- Skill: guide literal search for name and identifier lookups.
- Skill: narrow `all_readable` for first-person questions and add a cloud-sync example.

## 0.1.9 - 2026-06-23

- Skill: align guidance with the CLI coreutil MCP surface (pagination, owner/team resolution, Granola, takeover Ns).

## 0.1.8 - 2026-06-21

- Skill: weight the user's own words over the agent's proposals when scoping a request.

## 0.1.7 - 2026-06-21

- Skill: refresh the Nessie framing and add read-to-conclusion guidance.
- Sync the version across `package.json`, `openclaw.plugin.json`, `index.js`, and the bundled skill.

## 0.1.6 - 2026-06-10

- Skill: align Nessie timezone listing guidance.

## 0.1.5 - 2026-06-06

- Skill: add Nessie team resolution and source selection guidance.

## 0.1.4 - 2026-06-03

- Skill: clarify timezone and date-filter guidance (`since`/`until`, week windows, MCP date fields).

## 0.1.3 - 2026-06-03

- Skill: clarify personal source scope for OpenClaw.
- Keep the `index.js` runtime version in sync with the package.

## 0.1.2 - 2026-06-03

- Point setup at the deployed Go setup API.
- Keep the README user-facing.

## 0.1.1 - 2026-06-02

- Point OTP setup at the Go API.
- Centralize the plugin version across the package files.

## 0.1.0 - 2026-06-02

- Initial release: native OpenClaw plugin bundling the Nessie setup CLI
  (`openclaw nessie init` / `openclaw nessie status`) with API-key and OTP auth,
  hosted-MCP config merge into `mcp.servers.nessie`, and the bundled Nessie skill.
