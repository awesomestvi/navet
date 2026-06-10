# Release And Publishing

Internal maintainer reference. This file is for release operators and agent workflows, not normal
user documentation.

This file defines release workflow constraints and publishing behavior for Navet.

## Release Command Rules

- For release work, do not run any `pnpm` command yourself.
- List the required `pnpm` commands for the user, wait for the reported results, and continue from
  there.
- Use `pnpm release:linear` or the Linear app as the preferred release-note source before falling
  back to commit history.
- Keep `package.json`, `CHANGELOG.md`, `platform/home-assistant/addons/navet/CHANGELOG.md`,
  `platform/home-assistant/custom_components/navet/manifest.json`,
  `platform/home-assistant/addons/navet/config.yaml`, and built panel assets
  aligned for versioned releases when those surfaces are part of the release.
- Keep root `repository.yaml` in the monorepo because `awesomestvi/navet` is the discoverable Home
  Assistant add-on repository root.
- Treat `platform/home-assistant/custom_components/navet/` as the HACS source-of-truth and export
  it into the sibling `../navet-hacs` repo for `awesomestvi/navet-hacs` without `repository.yaml`.

## Release Flow

Recommended operator flow:

1. Decide whether the change is `patch`, `minor`, or `prerelease`.
2. Bump `package.json`.
3. Run `pnpm release:version-sync`.
4. Fetch Linear issues in the `Ready for Release` workflow state and use them as the release-note
   source. If the release has no matching issues, draft the changelog from commit history instead.
5. Add a matching `CHANGELOG.md` section for the release version. The GitHub Release workflow
   publishes this section as the release notes that HACS/Home Assistant can show before users
   update.
6. Do not require maintainers to prebuild Home Assistant panel assets for HACS or release
   publishing. The export and release workflows build them automatically.
   Do not ask for `pnpm build:ha-panel` during local release prep unless the user explicitly wants
   a separate manual panel build outside the normal release path.
7. Add or update the matching `platform/home-assistant/addons/navet/CHANGELOG.md` entry for every
   versioned add-on release.
   Keep it concise and add-on-facing, even when it mostly mirrors the main app changelog.
8. If the release meaning changed, update [../VERSIONING.md](../VERSIONING.md).
9. Run `pnpm release:check`.
10. Tag the monorepo commit with a version tag such as `v0.3.1-beta.1`, `v0.3.1-rc.1`, or
    `v0.3.1`.
11. Push the tag to GitHub to trigger
    [../../.github/workflows/release.yml](../../.github/workflows/release.yml).
12. The tagged release workflow validates the committed release surfaces, packages the committed
    custom panel assets, and attaches `navet-panel-<tag>.tar.gz` to the GitHub release.
13. The tagged release workflow also syncs `awesomestvi/navet-hacs/main` and refreshes the matching
    `awesomestvi/navet-hacs` tag.
14. For developer hardware testing from `main`, use
    [../../.github/workflows/edge-publish.yml](../../.github/workflows/edge-publish.yml).

## Release Note Style

Release notes must be issue-led and concise. Fetch Linear first, then draft the changelog from the
release-ready issues instead of copying commit summaries.

Preferred source:

1. Fetch Linear issues in the `Ready for Release` workflow state.
2. Treat those issues as the complete release scope.
3. Group related issues into user-facing outcomes.
4. Mention the Linear issue identifiers only while drafting; do not include them in `CHANGELOG.md`.

Use the Linear app to list issues where status is `Ready for Release`. Alternatively, fetch the
same source with:

```bash
pnpm release:linear
```

The script reads `LINEAR_API_KEY` from the current environment, or from `~/.zshrc` through an
interactive zsh shell for local release drafting.

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

## New
- User-visible capability that is now available

## Fixed
- Problem that no longer happens, with the affected user flow named

## Improved
- Existing behavior that now feels clearer, faster, or more reliable

## Documentation
- User-facing setup or troubleshooting guidance that changed
```

Only use `New`, `Fixed`, `Improved`, and `Documentation`. Do not add a summary paragraph under the
version heading. For small releases, one or two sections are enough. Prefer `Fixed` when the
release resolves broken behavior, even if the implementation also changed internals.

Fallback source:

If there are no issues in `Ready for Release`, build concise notes from every commit since the
previous release tag. Query the range with
`git log --reverse --format=%H%x09%s%n%b <previous-tag>..<release-tag>`. Account for each commit
during drafting, but do not force every commit into the final changelog. Consolidate duplicate,
internal, or release-only changes into the fewest useful user-facing bullets.

## Automated Workflow Expectations

- CI now splits testing into:
  - Tier 1 release-critical validation
  - Tier 2 blocking app-contract validation
  - Tier 3 broad regression visibility
- Tier 1 validation runs as a distinct workflow or job and covers:
  - focused provider/runtime/auth/resource tests
  - provider boundary enforcement
  - Docker validation
- Publish and release workflows should require Tier 1 validation before shipping.
- Tagged releases should build the custom-panel artifact in workflow before creating the GitHub
  release.
- Pushes to `main` and tagged releases should also sync the exported HACS payload into
  `awesomestvi/navet-hacs/main`.
- Tagged releases should also create or refresh the matching Git tag in `awesomestvi/navet-hacs`
  so both repositories expose the same release tag name.
- That sync should authenticate with a GitHub App installed on `awesomestvi/navet-hacs`, using
  `NAVET_HACS_APP_ID` and `NAVET_HACS_APP_PRIVATE_KEY` secrets in the `edge`, `beta`, and
  `production` environments as needed by the workflow environment.
- Local `pnpm sync:hacs` remains useful for previewing the export against `../navet-hacs` before a
  release or when debugging CI sync issues.
- Home Assistant ingress and install behavior remain partly manual release checks unless a real
  runtime automation path is added later.

## Publishing Rules

- Cloudflare Pages deploys the demo at `/demo/` and Storybook at `/storybook/` from the website bundle.
- Cloudflare Pages builds directly from the repo; GitHub Pages is retired and there is no GitHub Pages or GitHub deploy workflow for the website bundle.
- Pushes to `main` publish edge app images: `ghcr.io/awesomestvi/navet:edge`, temporary `dev`,
  and `sha-*`.
- Standalone app prerelease tags publish the exact tag, `beta`, and `sha-*`.
- Standalone app stable tags publish the exact tag, `X.Y`, `latest`, and `sha-*`.
- Pushes to `main` publish the committed `Navet Dev` add-on version such as
  `0.x.y-dev.YYYYMMDDHHMMSS`, plus moving `edge`, temporary `dev`, and `sha-*` tags.
- Before pushing `main`, refresh that committed dev version locally with `pnpm release:dev-version`.
- Tagged releases also update `awesomestvi/navet-hacs/main` and sync the same Git tag there.
- Tagged releases rebuild the committed custom-panel output and attach the downloadable panel
  archive to the GitHub release.
- Versioned add-on publishes emit the configured add-on version, the channel tag (`beta` or
  `latest`), and `sha-*`.
- Prerelease tags do not update `latest`.

## Related Guidance

- Command restrictions and commit rules live in [commands.md](commands.md).
- Versioning, release-note drafting, and the Linear fallback flow live in [../VERSIONING.md](../VERSIONING.md).
