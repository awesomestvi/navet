# Release Workflow

Navet uses one repo, one shared version, and many release artifacts.

Versioned release surfaces:

- standalone Docker image
- Home Assistant add-on image
- Home Assistant custom panel build output and downloadable release archive
- GitHub release notes

Continuous `main` surfaces:

- website on GitHub Pages
- demo on GitHub Pages
- Storybook on GitHub Pages

## Branches And Tags

- `main` is the default integration branch
- optional `hotfix/*` branches are allowed when a production fix cannot wait
- stable releases use tags such as `v0.4.1`
- prereleases use tags such as `v0.5.0-beta.1` or `v0.5.0-rc.1`

Navet does not use GitFlow.

## Version Source Of Truth

`package.json` is the canonical release version.

Release-managed files that must stay aligned:

- `package.json`
- `custom_components/navet/manifest.json`
- `addons/navet/config.yaml`
- `CHANGELOG.md`
- `docs/VERSIONING.md`

`packages/app/src/constants/app-version.ts` remains the app-facing version surface, but it is
build-injected from `package.json` rather than manually edited.

`addons/navet/CHANGELOG.md` is optional. Update it only when add-on-facing notes need to differ
materially from the main app changelog.

## Channels

- `edge`: published from `main`
- `beta`: published from prerelease tags
- `latest`: published from stable tags only
- `sha-*`: immutable publish trace for every artifact push

Standalone image tags:

- edge: `edge`, `dev`, `sha-*`
- prerelease: exact `vX.Y.Z-beta.N` or `vX.Y.Z-rc.N`, `beta`, `sha-*`
- stable: exact `vX.Y.Z`, `X.Y`, `latest`, `sha-*`

Add-on image tags follow the same channel semantics, but keep the existing per-arch repository
naming and exact version tags without the leading `v`.

## Workflow Lanes

### PR validation

`/.github/workflows/ci.yml`

Merge safety gates:

- dependency install
- `pnpm check`
- `pnpm check:stories`
- `pnpm check:ui-kit`
- `pnpm typecheck`
- app build
- `pnpm build:ha-panel`
- committed custom panel asset verification
- Tier 1 release-critical validation
- Tier 2 blocking app contracts
- standalone Docker smoke boot

Visible but non-blocking:

- Tier 3 broad regression coverage

### Edge publish

`/.github/workflows/edge-publish.yml`

Trigger:

- push to `main`

Behavior:

- requires Tier 1 validation
- publishes standalone Docker edge artifacts
- publishes add-on edge artifacts
- pins Node 22 anywhere the workflow runs repo JavaScript
- does not create a GitHub release
- does not update `latest`

### Release publish

`/.github/workflows/release.yml`

Trigger:

- push a `v*` tag

Behavior:

- validates release-managed files and changelog alignment
- requires Tier 1 validation
- pins Node 22 anywhere the workflow runs repo JavaScript
- packages the committed custom panel assets and attaches a panel archive
- publishes standalone release images
- publishes add-on release images
- creates the GitHub release from `CHANGELOG.md`
- marks prerelease tags as GitHub prereleases
- never moves `latest` on prerelease tags

### Pages deploy

`/.github/workflows/pages-demo.yml`

Trigger:

- push to `main` for website, demo, or Storybook changes

Behavior:

- builds website
- builds demo
- builds Storybook
- deploys to GitHub Pages

Pages remains a continuous documentation and marketing surface. It is not part of tagged release
promotion in phase 1.

## Maintainer Flow

1. Decide the release bump and update `package.json`.
2. Run `node scripts/sync-release-versions.mjs`.
3. Draft the changelog section for the target version.
4. For custom panel releases, run `pnpm build:ha-panel` and commit the generated assets.
5. Run `node scripts/check-release-surfaces.mjs`.
6. Merge the release commit to `main`.
7. Create and push the release tag.
8. Let the tagged release workflow package the committed panel bundle and attach
   `navet-panel-<tag>.tar.gz` to the GitHub release.
9. Verify the published Docker/add-on artifacts and the GitHub release page.

## What Stays Manual

- choosing the SemVer bump
- drafting release notes
- regenerating committed panel assets
- updating `addons/navet/CHANGELOG.md` when add-on-facing notes need to differ from the main changelog
- final runtime sanity checks for Home Assistant panel and add-on installs
- rollback execution if a bad release escapes
