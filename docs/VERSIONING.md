# Versioning

Navet is currently in beta. Until the product contract is stable, use pre-`1.0` semantic versioning.

## Current Phase

- Current release line: `0.x`
- Current version: `0.1.3`
- Meaning: current stable beta-line release for the `0.1.3` Home Assistant custom panel release

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
3. Fetch Linear's `Ready for Release` column and use those tickets as the release-note source. If the column has no tickets for the release, draft a concise changelog from commit messages instead.
4. Add a matching `CHANGELOG.md` section for the release version. The GitHub Release workflow publishes this section as the release notes that HACS/Home Assistant can show before users update.
5. For HACS custom panel releases, bump `custom_components/navet/manifest.json` so its `version` matches the package/tag version.
6. For add-on releases, bump `addons/navet/config.yaml` and update `addons/navet/CHANGELOG.md`.
7. If the release meaning changed, update this file.
8. Tag the commit with a version tag such as `v0.1.1-beta.1` or `v0.1.1`.
9. Push the tag to GitHub to trigger [.github/workflows/github-release.yml](../.github/workflows/github-release.yml). Prerelease tags also trigger app image publishing and add-on image publishing.
10. For developer hardware testing before a public tag, manually run the publish workflows with the `dev` tag.

## Release Note Style

Release notes must be issue-led and concise. Fetch Linear first, then have Codex draft the changelog from the release-ready issues instead of copying commit summaries.

Preferred source:

1. Fetch Linear issues in the `Ready for Release` workflow state.
2. Treat those issues as the complete release scope.
3. Group related issues into user-facing outcomes.
4. Mention the Linear issue identifiers only while drafting; do not include them in `CHANGELOG.md`.

In Codex, use the Linear app to list issues where status is `Ready for Release`. Outside Codex, fetch the same source with:

```bash
pnpm release:linear
```

The script reads `LINEAR_API_KEY` from the current environment, or from `~/.zshrc` through an interactive zsh shell for local release drafting.

Optional filters:

```bash
pnpm release:linear -- --team NAV
pnpm release:linear -- --label "public beta"
pnpm release:linear -- --project "0.2 release"
```

Use this drafting prompt:

```text
Create the CHANGELOG.md section for version <version> from these Linear issues.

Rules:
- Write for Home Assistant users, not developers.
- Explain what was fixed or improved in plain language.
- Prefer specific outcomes over broad categories.
- Consolidate related issues into one bullet.
- Keep each bullet to one clear user-visible result.
- Do not include implementation details, commit hashes, branch names, PR numbers, or Linear issue IDs.
- Only include sections that have at least one strong entry.
- Keep the whole section short enough to read in a Home Assistant update dialog.

Format:
## <version> - <yyyy-mm-dd>

One sentence summarizing the release.

## New
- User-visible capability that is now available

## Fixed
- Problem that no longer happens, with the affected user flow named

## Improved
- Existing behavior that now feels clearer, faster, or more reliable

## Documentation
- User-facing setup or troubleshooting guidance that changed
```

Only use `New`, `Fixed`, `Improved`, and `Documentation`. For small releases, one or two sections are enough. Prefer `Fixed` when the release resolves broken behavior, even if the implementation also changed internals.

Fallback source:

If there are no issues in `Ready for Release`, build concise notes from every commit since the previous release tag. Query the range with `git log --reverse --format=%H%x09%s%n%b <previous-tag>..<release-tag>`. Account for each commit during drafting, but do not force every commit into the final changelog. Consolidate duplicate, internal, or release-only changes into the fewest useful user-facing bullets.

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
