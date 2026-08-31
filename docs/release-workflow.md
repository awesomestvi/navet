# Release Workflow

Navet uses one repo, one shared version, and multiple release artifacts.

## Assisted Release Boundary

During assisted release work, the agent prepares and checks the release surfaces but does not run
release or publishing commands. The maintainer runs the listed `pnpm release:*` commands, creates
and pushes tags, and verifies published artifacts. Normal release preparation does not include a
local `pnpm build:ha-panel`; release automation builds and packages that artifact.

Versioned release surfaces:

- standalone app image
- Home Assistant add-on image
- Home Assistant custom panel build output and downloadable release archive
- GitHub release notes

Continuous `main` surfaces:

- marketing website on Cloudflare Pages at `navet.app`
- public demo on its own Cloudflare Pages project at `demo.navet.app`
- Storybook on its own Cloudflare Pages project at `storybook.navet.app`
- public documentation on its own Cloudflare Pages project at `docs.navet.app`

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

- `edge`: published from Navet Dev publishes
- `dev`: published from Navet Dev publishes
- `beta`: published from prerelease tags
- `latest`: published from stable tags only
- `sha-*`: immutable publish trace for every artifact push

`edge` and `dev` are main-backed moving channels. A Navet Dev tag created from another named branch
publishes only its immutable exact-version and `sha-*` artifacts.

Standalone app image tags:

- edge: `edge`, `dev`, `sha-*`
- main dev tag: exact `0.x.y-dev.YYYYMMDDHHMMSS`, `edge`, `dev`, `sha-*`
- non-main dev tag: exact `0.x.y-dev.YYYYMMDDHHMMSS`, `sha-*`
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
- Tier 1 release-critical validation
- Tier 2 blocking app contracts
- standalone app smoke boot

Visible but non-blocking:

- Tier 3 broad regression coverage

### Dev tag publish

Primary local flow:

- commit and validate the tested changes on a named branch
- require a clean worktree before publishing; staged, unstaged, and untracked work is not included
- run `pnpm release:dev-publish -- --push` locally from that branch
- let the script create and push the matching `navet-dev-*` tag with source branch and commit
  provenance
- let the pushed tag trigger the publish workflow

Publishing from `main`:

- publishes the immutable exact-version and `sha-*` standalone and add-on images
- refreshes the moving standalone and add-on `edge` and `dev` aliases
- advances `platform/home-assistant/addons/navet-dev/config.yaml` on `main`, allowing Home Assistant
  supervised installations to discover the update

Publishing from any other named branch:

- publishes immutable exact-version and `sha-*` standalone and add-on images
- creates the matching GitHub prerelease with source branch and commit provenance
- does not update `main`, the moving `edge` or `dev` aliases, or Home Assistant Add-on Store metadata
- remains installable through its exact standalone Docker version; Add-on Store discovery waits
  until matching metadata lands on `main`

Tag-triggered publish workflow:

`/.github/workflows/dev-tag-release.yml`

Trigger:

- push a `navet-dev-*` tag

Behavior:

- requires Tier 1 validation
- validates that the computed Navet Dev version and created tag match
- publishes immutable standalone and add-on images for that exact dev version and matching `sha-*`
  trace
- refreshes the moving standalone and add-on `edge` and `dev` aliases only when the tag came from
  `main`
- advances supervised Navet Dev add-on metadata only for a main publish
- creates a GitHub prerelease for the dev tag
- expected dev version shape: `0.x.y-dev.YYYYMMDDHHMMSS`
- does not move `latest` or `beta`
- does not sync HACS or create a custom-panel release artifact

Manual fallback helper:

`/.github/workflows/dev-tag-publish.yml`

Trigger:

- manual workflow dispatch from `main` only

Behavior:

- requires Tier 1 validation
- creates the matching `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` metadata commit on `main`
- creates and pushes the matching `navet-dev-*` tag
- relies on the tag-triggered publish workflow to perform the actual artifact publication

### Release publish

`/.github/workflows/release.yml`

Trigger:

- push a `v*` tag

Behavior:

- validates release-managed files and changelog alignment
- requires Tier 1 validation
- syncs the release HACS payload into `awesomestvi/navet-hacs/main`
- creates or refreshes the matching `awesomestvi/navet-hacs` Git tag for the release
- pins Node 22 anywhere the workflow runs repo JavaScript
- builds the custom panel assets in workflow and attaches a panel archive
- publishes standalone app release images
- publishes add-on release images
- creates the GitHub release from `CHANGELOG.md`
- publishes the same `CHANGELOG.md` entries on the docs changelog during the next docs build
- marks prerelease tags as GitHub prereleases
- never moves `latest` on prerelease tags

### Public site deploys

Trigger:

- Cloudflare Pages builds directly from the connected repo on push

Behavior:

- the marketing project runs `pnpm website:build` and deploys `apps/website/dist`
- the demo project runs `pnpm build:demo` and deploys `apps/demo/dist`
- the Storybook project runs `pnpm storybook:build` and deploys `apps/storybook/dist`
- the docs project runs `pnpm docs:build` and deploys `apps/docs/dist`
- every surface builds independently from the repository root and receives its own preview deploy

Cloudflare Pages remains a continuous documentation, demo, Storybook, and marketing surface. It is
not part of tagged release promotion in phase 1.

## Release Notes

Use Linear issues in `Ready for Release` as the preferred scope, with commits since the previous
tag as the fallback. Write for people using Navet rather than contributors reading a diff:

- use only non-empty `New features`, `Improvements and bug fixes`, and `Security` sections
- keep one user outcome per short bullet and prefer three to five bullets
- omit issue IDs, file names, test coverage, internal architecture, and commit narration
- combine related work instead of producing one bullet per issue or commit
- avoid vague claims such as “more reliably” unless the result says what is now dependable
- write `No user-facing changes in this release.` when that is the honest outcome
- keep the add-on changelog limited to changes that affect add-on users

## Maintainer Flow

1. Decide the release bump and update `package.json`.
2. Run `pnpm release:version-sync`.
3. Fetch Linear issues in the `Ready for Release` workflow state with `pnpm release:linear` and
   treat them as the primary release-note source.
4. Draft the changelog section for the target version from those Linear issues. If no matching
   issues exist, fall back to commit history since the previous release tag.
5. Update `platform/home-assistant/addons/navet/CHANGELOG.md` for the release version.
6. Run `pnpm release:check`.
   Do not run `pnpm build:ha-panel` as part of local release prep. The automated release/HACS workflow
   builds the custom panel assets and packages the panel artifact.
7. Merge the release commit to `main`.
8. Create and push the release tag for `awesomestvi/navet`.
9. Let the tagged release workflow build the panel bundle, package it, and attach
    `navet-panel-<tag>.tar.gz` to the GitHub release.
10. Verify the published standalone/add-on artifacts, the matching `navet-hacs` branch/tag sync, and
    the GitHub release page.

Optional immutable Navet Dev publish:

1. Commit and validate the tested changes on a named branch, then verify its worktree is clean.
2. Run `pnpm release:dev-publish -- --push` from that branch.
3. Let the script create and push the matching `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` tag with source
   branch and commit provenance.
4. Let the pushed tag trigger `/.github/workflows/dev-tag-release.yml` to publish the immutable
   exact-version and `sha-*` images plus the GitHub prerelease.
5. If the source branch is `main`, let the workflow also move `edge` and `dev` and advance the
   supervised add-on metadata on `main`.
6. If the source branch is not `main`, install the exact standalone image for testing. The publish
   intentionally leaves shared channels and Add-on Store discovery unchanged.
7. Use `/.github/workflows/dev-tag-publish.yml` only as a main-only fallback helper if you cannot
   run the local script.

## What Stays Manual

- choosing the SemVer bump
- checking Linear `Ready for Release` scope and deciding whether the commit-history fallback is needed
- drafting release notes
- keeping the HA panel source buildable when the automated export/release workflows rebuild it
- monitoring the automatic `navet-hacs` sync from `main` and tagged releases, and stepping in if that repo rejects a push
- updating `platform/home-assistant/addons/navet/CHANGELOG.md` for every add-on release
- final runtime sanity checks for Home Assistant panel and add-on installs
- choosing when to publish an immutable branch build and when to promote `main` to the shared Navet
  Dev channels
- rollback execution if a bad release escapes

## Rollback

Rollback is artifact-based. Keep the last known-good stable tag and prefer exact Docker tags or
digests in production.

- **Docker:** redeploy the previous exact tag or digest while keeping the same Compose project and
  named volume. Never use `docker compose down -v` for a normal rollback; it removes credential
  sessions and the dashboard profile.
- **Home Assistant add-on:** redeploy the earlier published image for the matching architecture,
  using the previous GitHub release to identify its exact tag when repository metadata has moved.
- **Custom panel:** reinstall the panel archive attached to the earlier release tag.
- **Website, demo, Storybook, and docs:** use the affected Cloudflare Pages project's previous
  known-good deployment. These continuous surfaces roll back independently.

After rollback, verify the affected runtime directly, including Home Assistant Ingress, panel, or
add-on behavior where applicable, and publish follow-up guidance when users need to take action.
