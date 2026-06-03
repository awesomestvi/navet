# Release Workflow

Navet uses one repo, one shared version, and many release artifacts.

Versioned release surfaces:

- standalone app image
- Home Assistant add-on image
- Home Assistant custom panel build output and downloadable release archive
- GitHub release notes

Continuous `main` surfaces:

- website bundle on Cloudflare Pages
- public demo inside the website bundle at `/demo/`
- Storybook inside the website bundle at `/storybook/`

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
- `platform/home-assistant/custom_components/navet/manifest.json`
- `platform/home-assistant/addons/navet/config.yaml`
- `CHANGELOG.md`
- `platform/home-assistant/addons/navet/CHANGELOG.md`
- `docs/VERSIONING.md`

`packages/app/src/constants/app-version.ts` remains the app-facing version surface, but it is
build-injected from `package.json` rather than manually edited.

`platform/home-assistant/addons/navet/CHANGELOG.md` is a required add-on release surface. Update it for every versioned
add-on release, even when it mostly mirrors the main app changelog.

Home Assistant packaging uses two public repository surfaces:

- `awesomestvi/navet-hacs` contains only HACS integration files at its repository root
- `awesomestvi/navet` remains the Home Assistant add-on repository root and must keep
  `repository.yaml` at the repo root

The monorepo is the packaging source for both flows. Use these source-of-truth paths:

- `platform/home-assistant/custom_components/navet/`
- `platform/home-assistant/addons/navet/`
- `platform/home-assistant/addons/navet-dev/`

Generated HACS packaging is exported into the sibling `../navet-hacs` repository. That export must
refresh `custom_components/navet/`, `hacs.json`, `README.md`, and `CHANGELOG.md`, and the target
repo must not contain `repository.yaml`.

## Channels

- `edge`: published from `main`
- `beta`: published from prerelease tags
- `latest`: published from stable tags only
- `sha-*`: immutable publish trace for every artifact push

Standalone app image tags:

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
- standalone app smoke boot

Visible but non-blocking:

- Tier 3 broad regression coverage

### Edge publish

`/.github/workflows/edge-publish.yml`

Trigger:

- push to `main`

Behavior:

- requires Tier 1 validation
- publishes standalone app edge artifacts
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
- publishes standalone app release images
- publishes add-on release images
- creates the GitHub release from `CHANGELOG.md`
- marks prerelease tags as GitHub prereleases
- never moves `latest` on prerelease tags

### Website bundle deploy

Trigger:

- Cloudflare Pages builds directly from the connected repo on push

Behavior:

- runs the configured website build
- stages the demo under `/demo/`
- stages Storybook under `/storybook/`
- deploys the single output bundle to Cloudflare Pages

Cloudflare Pages remains a continuous documentation and marketing surface. It is not part of tagged release
promotion in phase 1.

## Maintainer Flow

1. Decide the release bump and update `package.json`.
2. Run `node scripts/sync-release-versions.mjs`.
3. Fetch Linear issues in the `Ready for Release` workflow state with `pnpm release:linear` and
   treat them as the primary release-note source.
4. Draft the changelog section for the target version from those Linear issues. If no matching
   issues exist, fall back to commit history since the previous release tag.
5. For custom panel releases, run `pnpm build:ha-panel` and commit the generated assets.
6. Update `platform/home-assistant/addons/navet/CHANGELOG.md` for the release version.
7. Run `node scripts/check-release-surfaces.mjs`.
8. Merge the release commit to `main`.
9. Create and push the release tag for `awesomestvi/navet`.
10. Let the tagged release workflow package the committed panel bundle and attach
    `navet-panel-<tag>.tar.gz` to the GitHub release.
11. Run `pnpm sync:hacs`.
12. Review the changes in `../navet-hacs`.
13. Commit, tag, and push the matching `awesomestvi/navet-hacs` release.
14. Verify the published standalone/add-on artifacts, the `navet-hacs` release, and the GitHub
    release page.

## What Stays Manual

- choosing the SemVer bump
- checking Linear `Ready for Release` scope and deciding whether the commit-history fallback is needed
- drafting release notes
- regenerating committed panel assets
- exporting, reviewing, and publishing the generated `navet-hacs` repo payload
- updating `platform/home-assistant/addons/navet/CHANGELOG.md` for every add-on release
- final runtime sanity checks for Home Assistant panel and add-on installs
- rollback execution if a bad release escapes
