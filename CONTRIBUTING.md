# Contributing

Thanks for improving `@nessielabs/nessie-openclaw`. This plugin is small and
mostly documentation (the Nessie skill), but every change ships as a versioned
npm package, so a few release mechanics are required on every PR.

## Every PR must bump the version

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Bump the version on every change that ships (skill edits, runtime changes, setup
metadata):

- Patch (`0.1.13` -> `0.1.14`) for skill wording, docs, and fixes.
- Minor for a new capability or setup flow.
- Major for a breaking change to the plugin contract.

The version is stored in **four** places that must stay identical.
`scripts/validate.sh` fails the build if they drift, so update all four in the
same commit:

1. `package.json` - `"version"`
2. `openclaw.plugin.json` - `"version"`
3. `index.js` - `const PLUGIN_VERSION = "..."`
4. `skills/nessie/SKILL.md` - the `version:` frontmatter field

## Every PR must add a CHANGELOG entry

Add a new section at the top of `CHANGELOG.md`, above the previous release, in
the existing format:

```
## X.Y.Z — YYYY-MM-DD

- Skill: one line per user-visible change.
```

Use the same version you bumped to, and today's date. `CHANGELOG.md` is shipped
inside the published package (it is listed in `package.json` `files`), so keep
entries user-facing and concise.

## Before you push

Run the validator, which checks the required files, the cross-file version
match, and the plugin contract:

```
npm run validate
```

## Releasing

Each release is tagged `vX.Y.Z` on the commit that carries that version, matching
the `CHANGELOG.md` header. Tagging happens at release time, not in the feature
PR.
