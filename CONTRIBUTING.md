# Contributing

Thanks for improving `@nessielabs/nessie-openclaw`. This plugin is small and
mostly documentation (the Nessie skill), but every change ships as a versioned
npm package, so a few release mechanics apply. Most of them are automated.

## Setup

Run `npm install` once after cloning. Its `prepare` script points
`core.hooksPath` at `scripts/hooks`, which installs the pre-commit hook below.

## Versioning is automatic

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
When you stage a change to shipped plugin content (`skills/`, `index.js`, or
`openclaw.plugin.json`), the pre-commit hook auto-bumps the **patch** version and
keeps the four locations `scripts/validate.sh` enforces in lockstep:

1. `package.json` - `"version"`
2. `openclaw.plugin.json` - `"version"`
3. `index.js` - `const PLUGIN_VERSION = "..."`
4. `skills/nessie/SKILL.md` - the `version:` frontmatter field

You do not bump these by hand for a normal change.

**Minor or major bumps:** stage a hand-edited `package.json` version in your
commit. The hook sees `package.json` already staged and leaves your value alone
(including the other three files, so set them yourself to match).

## The CHANGELOG is auto-stubbed

The same hook prepends a dated entry to `CHANGELOG.md` for the new version with a
default bullet derived from what changed. **Refine that bullet into a concise,
user-facing line before pushing** - the changelog ships inside the published
package (it is listed in `package.json` `files`). Keep the existing format:

```
## X.Y.Z - YYYY-MM-DD

- Skill: one line per user-visible change.
```

Use a hyphen (not an em dash) in the header, matching the rest of the file.

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
