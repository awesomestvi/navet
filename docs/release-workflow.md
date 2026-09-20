# Release Workflow

Navet uses one repo, one shared version, and multiple release artifacts.

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

## Version And Changelog Sources

The release tag is the canonical published version. GitHub Releases are the canonical published
changelog. A release no longer needs a version-bump commit on `main`.

Every pull request adds one `.changes/*.yaml` fragment. The fragment records a concise outcome,
its category, and affected audiences. Use `type: internal` with an empty audience list when a pull
request has no user-facing change. CI requires and validates the newly added fragment.

Dev releases render the merged pull request's fragment. Beta, release-candidate, and stable
releases render every fragment added since the previous stable tag. Internal fragments are omitted.
HACS and other audience-specific artifacts receive only their relevant notes.

Home Assistant packaging uses two existing public repository surfaces:

- `awesomestvi/navet-home-assistant` contains only HACS integration files at its repository root
- `awesomestvi/navet` remains the Home Assistant App repository and keeps `repository.yaml` at its
  root; Supervisor discovers the nested App configuration recursively

Release automation never pushes App metadata directly to protected `main`. After artifacts are
verified, it opens a generated metadata PR, waits for the existing required checks, and merges it
through the normal branch rules using the release GitHub App.

This keeps the existing `https://github.com/awesomestvi/navet` App repository URL. Installed users
receive the new version without adding another repository or reinstalling Navet.

The release GitHub App installation needs Contents and Pull requests write access on `navet`. It
creates and merges the generated branch through the PR API; it has no branch-protection bypass.

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
- Tier 3 broad regression coverage
- Storybook standards and production build
- responsive demo smoke checks and phone/tablet/desktop screenshot artifacts
- one aggregate product-review gate

The full Storybook browser interaction suite is not a required gate yet because its current
baseline contains stale interaction assertions. Promote it only after the suite is green on
`main`; do not hide known failures behind a successful required check.

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
- tags the merged commit without creating or pushing another commit to protected `main`
- leaves Home Assistant Add-on Store metadata unchanged

Publishing from any other named branch:

- publishes immutable exact-version and `sha-*` standalone and add-on images
- creates the matching GitHub prerelease with source branch and commit provenance
- does not update `main`, the moving `edge` or `dev` aliases, or Home Assistant Add-on Store metadata
- remains installable through its exact standalone Docker version

Tag-triggered publish workflow:

`/.github/workflows/dev-tag-release.yml`

Trigger:

- push a `navet-dev-*` tag
- manual `workflow_dispatch` using an existing `navet-dev-*` tag ref

Behavior:

- requires Tier 1 validation
- validates that the computed Navet Dev version and created tag match
- publishes immutable standalone and add-on images for that exact dev version and matching `sha-*`
  trace
- refreshes the moving standalone and add-on `edge` and `dev` aliases only when the tag came from
  `main`
- never writes supervised Navet Dev add-on metadata to protected `main`
- creates a GitHub prerelease for the dev tag
- expected dev version shape: `0.x.y-dev.YYYYMMDDHHMMSS`
- does not move `latest` or `beta`
- does not sync HACS or create a custom-panel release artifact

Main publish preparation:

`/.github/workflows/dev-tag-publish.yml`

Trigger:

- every pull request merged into `main`
- manual workflow dispatch from `main` when an automatic run needs to be repeated

Behavior:

- requires Tier 1 validation
- starts a distinct publish for every merged pull request
- tags that merge as `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` without advancing `main`
- creates and pushes the matching `navet-dev-*` tag
- dispatches `dev-tag-release.yml` using the new tag so the artifact publication starts after tag
  creation; the workflow's tag-push trigger remains available as the event-driven entry point

### Release publish

`/.github/workflows/release.yml`

Trigger:

- explicit dispatch from the promotion workflow at a new `v*` tag

Behavior:

- validates that the annotated target tag and selected source tag resolve to the same commit on
  protected `main`
- requires Tier 1 validation
- builds the beta artifact from the selected tested Dev commit, then promotes that exact beta/RC
  image digest to later channels without rebuilding it
- syncs the release HACS payload into `awesomestvi/navet-home-assistant/main`
- opens and merges a generated metadata PR against `awesomestvi/navet/main` only after the matching
  add-on images have been verified
- creates or refreshes the matching `awesomestvi/navet-home-assistant` Git tag for the release
- pins Node 22 anywhere the workflow runs repo JavaScript
- builds the custom panel assets in workflow and attaches a panel archive
- generates package versions and release notes in CI without a source commit
- creates the GitHub and HACS releases from `.changes` fragments since the previous stable tag
- marks prerelease tags as GitHub prereleases
- never moves `latest` on prerelease tags
- fails when HACS synchronization cannot run instead of reporting a partial success
- verifies exact standalone and add-on images, the panel archive, both GitHub releases, and the
  availability of the website, demo, docs, and Storybook before the workflow is complete

Production tag preparation:

`/.github/workflows/release-tag-publish.yml`

Trigger:

- manual workflow dispatch with a tested source tag and a new target release tag

Behavior:

- checks out protected `main`
- requires beta to promote Dev, and stable to promote beta or an RC
- rejects malformed, missing, unrelated, or existing tags
- creates and pushes only the annotated release tag without advancing `main`
- explicitly dispatches the release workflow at that tag because `GITHUB_TOKEN` tag pushes do not
  create downstream workflow runs
- relies on the dispatched release workflow to publish and verify the production artifacts

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

## Maintainer Flow

1. Select a tested immutable Dev tag for beta, or a tested beta/RC tag for stable.
2. Select the new target tag, such as `v0.18.0-beta.1` or `v0.18.0`.
3. Dispatch `/.github/workflows/release-tag-publish.yml` with both tags.
4. Approve the `beta` or `production` environment.
5. Let the workflow create only the annotated tag, promote container digests, build the panel,
   generate release notes, and publish HACS.
6. After verifying the artifacts, let it open the Home Assistant App metadata PR, wait for required
   checks, and merge it through the protected branch.
7. Verify the exact images, HACS release, panel archive, GitHub release, and App Store version.

No manually prepared release commit or release pull request is needed. Normal feature pull requests
already carry the reviewed changelog fragments. The workflow creates the small Home Assistant App
metadata PR itself because the Store reads version metadata from protected `main`.

Navet Dev publish:

1. Merge a pull request into `main` to automatically publish a main-backed Navet Dev release.
2. For an immutable build from another named branch, commit and validate the tested changes, then
   verify its worktree is clean.
3. Run `pnpm release:dev-publish -- --push` from that branch.
4. Let the script create and push the matching `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` tag with source
   branch and commit provenance.
5. Let the pushed tag trigger `/.github/workflows/dev-tag-release.yml` to publish the immutable
   exact-version and `sha-*` images plus the GitHub prerelease.
6. If the source branch is `main`, let the workflow also move `edge` and `dev` without writing to
   protected `main`; supervised Add-on Store metadata remains unchanged.
7. If the source branch is not `main`, install the exact standalone image for testing. The publish
   intentionally leaves shared channels and Add-on Store discovery unchanged.
8. Manually dispatch `/.github/workflows/dev-tag-publish.yml` only to repeat a failed or otherwise
   missing automatic main publish.

## What Stays Manual

- choosing the SemVer bump
- reviewing each pull request's release fragment as part of normal code review
- keeping the HA panel source buildable when the automated export/release workflows rebuild it
- monitoring the automatic `navet-home-assistant` sync and generated App metadata PR, and stepping
  in if either workflow fails
- final runtime sanity checks for Home Assistant panel and add-on installs
- choosing when to publish an immutable branch build and when to promote `main` to the shared Navet
  Dev channels
- rollback execution if a bad release escapes
- approving channel-specific communication drafts and publishing them publicly

After a release is published, `/.github/workflows/release-communication.yml` opens one grounded
draft request for the configured research agent. It never publishes to Reddit, Discord, YouTube,
or the website.
