# Release And Publishing

Internal maintainer reference. This file is for release operators and agent workflows, not normal
user documentation.

This file defines release workflow constraints and publishing behavior for Navet.

## Release Command Rules

- For release work, do not run any `pnpm` command yourself.
- List the required `pnpm` commands for the user, wait for the reported results, and continue from
  there.
- For HACS or Home Assistant custom panel releases, include `pnpm build:ha-panel` in the user-run
  release commands before the release commit or tag.
- Use `pnpm release:linear` or the Linear app as the preferred release-note source before falling
  back to commit history.
- Keep `package.json`, `CHANGELOG.md`, `custom_components/navet/manifest.json`,
  `addons/navet/config.yaml`, and built panel assets aligned for versioned releases when those
  surfaces are part of the release.

## Release Flow

Recommended operator flow:

1. Decide whether the change is `patch`, `minor`, or `prerelease`.
2. Bump `package.json`.
3. Fetch Linear issues in the `Ready for Release` workflow state and use them as the release-note
   source. If the release has no matching issues, draft the changelog from commit history instead.
4. Add a matching `CHANGELOG.md` section for the release version. The GitHub Release workflow
   publishes this section as the release notes that HACS/Home Assistant can show before users
   update.
5. For HACS custom panel releases, bump `custom_components/navet/manifest.json` so its `version`
   matches the package/tag version.
6. For HACS custom panel releases, have the user run `pnpm build:ha-panel` and include the
   generated `custom_components/navet/frontend/` changes in the release commit.
7. For add-on releases, bump `addons/navet/config.yaml` and update `addons/navet/CHANGELOG.md`.
8. If the release meaning changed, update [../VERSIONING.md](../VERSIONING.md).
9. Tag the commit with a version tag such as `v0.3.1-beta.1` or `v0.3.1`.
10. Push the tag to GitHub to trigger
    [../../.github/workflows/github-release.yml](../../.github/workflows/github-release.yml).
    Version tags also trigger app image publishing and add-on image publishing.
11. For developer hardware testing before a public tag, manually run the publish workflows with the
    `dev` tag.

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
- Home Assistant ingress and custom-panel behavior remain partly manual release checks unless a
  real automation path is added later.

## Publishing Rules

- GitHub Pages deploys the demo at `/navet/demo/` and Storybook at `/navet/storybook/`.
- Pushes to `main` publish only developer app images: `ghcr.io/awesomestvi/navet:dev` and `sha-*`.
- Manual Publish workflow runs are for developer hardware testing and default to the `dev` app
  image tag.
- Standalone app images publish the exact tag, `beta`, `latest`, and `sha-*` for every `v*` tag.
- Home Assistant add-on images publish `dev` and `sha-*` on `main` pushes or dev-channel manual
  workflow runs.
- Versioned add-on publishes emit the configured add-on version and `sha-*`.
- Prerelease tags also update `beta` and `latest`.
- There is no stable channel yet. Treat `latest` as the current public beta compatibility tag
  because existing users already consume it.

## Related Guidance

- Command restrictions and commit rules live in [commands.md](commands.md).
- Versioning, release-note drafting, and the Linear fallback flow live in [../VERSIONING.md](../VERSIONING.md).
