# Versioning

Navet is currently in beta. Until the product contract is stable, use pre-`1.0` semantic versioning.

## Current Phase

- Current release line: `0.x`
- Current version: `0.1.0-beta.2`
- Meaning: first structured beta milestone, second prerelease build in that milestone

## Scheme

Use semantic versioning with prerelease tags when needed:

- `0.x.y` for beta releases
- `0.x.y-beta.n` for prerelease/beta candidates within a milestone
- `1.0.0` only when core behavior and compatibility are considered stable

Examples:

- `0.1.0-beta.1`
- `0.1.0-beta.2`
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
- the in-app Settings -> Project screen reads the version from `package.json` through [app-version.ts](/Users/vishal/Development/Github/Navet/Navet/src/app/constants/app-version.ts)

## Release Flow

Recommended lightweight flow:

1. Decide whether the change is `patch`, `minor`, or `beta prerelease`.
2. Bump `package.json`.
3. If the release meaning changed, update this file.
4. Tag the commit with `v<version>`, for example `v0.1.0-beta.2`.
5. Push the tag to GitHub to trigger [.github/workflows/github-release.yml](/Users/vishal/Development/Github/Navet/Navet/.github/workflows/github-release.yml).
6. If needed, manually run the container publish workflows for matching image tags.

## GitHub Releases

- Tags matching `v*` create a GitHub Release automatically.
- Tags containing `-beta.`, `-alpha.`, or `-rc.` are published as GitHub prereleases.
- Stable tags such as `v0.1.0` are published as normal releases.

## Stable Exit

Move to `1.0.0` when:

- core dashboard flows are stable
- major card types and settings behavior are no longer changing in breaking ways
- import/export and persistence formats are considered durable
- language, theming, and interaction models are stable enough to support compatibility expectations
