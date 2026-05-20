# Versioning

Navet is currently in beta. Until the product contract is stable, use pre-`1.0` semantic versioning.

## Current Phase

- Current release line: `0.x`
- Current version: `0.1.2`
- Meaning: current stable beta-line release for the `0.1.2` Home Assistant custom panel release

## Scheme

Use semantic versioning with prerelease tags when needed:

- `0.x.y` for beta releases
- `0.x.y-beta.n` for prerelease/beta candidates within a milestone
- `1.0.0` only when core behavior and compatibility are considered stable

Examples:

- `0.1.0-beta.1`
- `0.1.0-beta.2`
- `0.1.0-beta.3`
- `0.1.0-beta.4`
- `0.1.1-beta.1`
- `0.1.0`
- `0.1.1`
- `0.2.0`

## Bump Rules

- `patch`:
  - bug fixes
  - translation fixes
  - docs-only corrections tied to a shipped release
  - small visual polish without feature expansion
- `minor`:
  - new cards
  - new settings
  - meaningful dashboard behavior changes
  - new integrations or user-visible capabilities
- `prerelease`:
  - `-beta.n` for builds that should be tested before the milestone is treated as the current baseline
- `major`:
  - reserve for `1.0.0` and later stable-breaking releases

## Source Of Truth

- `package.json` is the canonical app version
- the in-app Settings -> Project screen reads the version from `package.json` through [app-version.ts](../src/app/constants/app-version.ts)
- `CHANGELOG.md` is the source of truth for HACS-visible GitHub Release notes

## Release Flow

Recommended lightweight flow:

1. Decide whether the change is `patch`, `minor`, or `beta prerelease`.
2. Bump `package.json`.
3. Read Linear's `Ready for release` column and use those tickets to draft the release notes. If the column has no tickets for the release, draft a concise changelog from commit messages instead.
4. Add a matching `CHANGELOG.md` section for the release version. The GitHub Release workflow publishes this section as the release notes that HACS/Home Assistant can show before users update.
5. For HACS custom panel releases, bump `custom_components/navet/manifest.json` so its `version` matches the package/tag version.
6. For add-on releases, bump `addons/navet/config.yaml` and update `addons/navet/CHANGELOG.md`.
7. If the release meaning changed, update this file.
8. Tag the commit with a version tag such as `v0.1.1-beta.1` or `v0.1.1`.
9. Push the tag to GitHub to trigger [.github/workflows/github-release.yml](../.github/workflows/github-release.yml). Prerelease tags also trigger app image publishing and add-on image publishing.
10. For developer hardware testing before a public tag, manually run the publish workflows with the `dev` tag.

## Release Note Style

When preparing a release, always check Linear first:

1. Read the Linear `Ready for release` column.
2. Use those tickets as the primary release-note source when the column has tickets.
3. If the release has no tickets in `Ready for release`, fall back to commit messages.

For the commit-message fallback, build concise release notes from every commit since the previous release tag. Query the range with `git log --reverse --format=%H%x09%s%n%b <previous-tag>..<release-tag>`. Account for each commit, but consolidate duplicate or related changes into one user-facing bullet.

Use this format inside the matching `CHANGELOG.md` version section:

Brief one-sentence description of the main improvements.

## ✨ New features
- User-friendly description of what users can now do

## 🐛 Bug fixes
- What no longer happens or works better

## ⚡ Improvements
- How something works better or faster

## 📝 Documentation
- New guides or help information available

## 🚧 In progress
- Features coming soon

Core rules:

1. Query commits from the last release.
2. Process every commit without skipping.
3. Categorize changes by user impact.
4. Write for non-technical users and avoid jargon, technical terms, and code references.
5. Focus on what users can do, not how it works.
6. Use simple, direct language in present tense.
7. Put one benefit in each concise bullet.
8. Keep the output as raw markdown without code fences.

Only include sections that have entries. Write from the user perspective: prefer phrasing such as "You can now" and "Works better when". Avoid developer perspective, implementation details, and terms such as API, backend, frontend, merge, patch, or commit.

## GitHub Releases

- All `v*` tags create a GitHub Release automatically.
- Tags matching `v*-alpha.*`, `v*-beta.*`, or `v*-rc.*` are marked as prereleases. Other `v*` tags are marked as stable releases.
- GitHub Release bodies are generated from the matching `CHANGELOG.md` version section. The workflow fails if the tag has no changelog entry.

## Stable Exit

Move to `1.0.0` when:

- core dashboard flows are stable
- major card types and settings behavior are no longer changing in breaking ways
- import/export and persistence formats are considered durable
- language, theming, and interaction models are stable enough to support compatibility expectations
