# Release And Publishing

Use this file for maintainer and agent release work.

## Hard Rules

- release-preparation agents may run non-publishing validation such as `pnpm release:check`
- tag creation, pushes, production publication, and public communication require explicit authority
- require one validated `.changes/*.yaml` fragment in every pull request, including an explicit
  `internal` fragment when there is no user-facing change
- generate release notes from all fragments added since the previous stable tag
- keep root `repository.yaml` in the monorepo
- treat `platform/home-assistant/custom_components/navet/` as the HACS integration source of truth
- keep generated panel assets out of the monorepo; release automation assembles them into exports

## Release Inputs

- `.changes/*.yaml` records the user-facing outcome and affected audiences in the pull request
- an immutable `navet-dev-*` tag identifies the exact tested commit and container images
- a beta or release-candidate tag can be promoted again without rebuilding those images
- GitHub Releases are the canonical published changelog; `CHANGELOG.md` is historical material

## Beta And Stable Promotion

1. Choose an already-published Dev, beta, or release-candidate tag whose commit and artifacts have
   been tested.
2. Choose the new tag: `vX.Y.Z-beta.N`, `vX.Y.Z-rc.N`, or `vX.Y.Z`.
3. Dispatch
   [../../.github/workflows/release-tag-publish.yml](../../.github/workflows/release-tag-publish.yml)
   with both tags.
4. Approve the `beta` or `production` GitHub environment.
5. Let [../../.github/workflows/release.yml](../../.github/workflows/release.yml) retag the tested
   container digests, generate notes from fragments, and publish the panel and HACS artifacts.

Important note:

- do not ask maintainers to run `pnpm build:ha-panel` during normal release prep
- the automated release and HACS workflows build the custom panel assets
- promotion does not create or push another commit to protected `main`
- stable releases must promote a tested beta or release candidate
- beta releases must promote an immutable Dev tag
- versions in HACS artifacts are injected during packaging; source files do not need a release commit
- Home Assistant App Store metadata is the exception: automation creates its small protected-main
  PR only after the matching images exist, so existing repository subscribers receive the update
- automated tag publishers explicitly dispatch their downstream workflows after pushing tags;
  do not rely on a `GITHUB_TOKEN` tag push to create another workflow run

## Immutable Navet Dev Flow

Every pull request merged into `main` automatically dispatches the main-backed flow:

1. Let [../../.github/workflows/dev-tag-publish.yml](../../.github/workflows/dev-tag-publish.yml)
   run Tier 1 validation after the merge.
2. Let that workflow tag the merged commit as `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` without
   creating or pushing another commit to protected `main`.
3. Let [../../.github/workflows/dev-tag-release.yml](../../.github/workflows/dev-tag-release.yml)
   publish the prerelease artifacts from the pushed tag.

To publish an immutable build from another named branch:

1. Commit and validate the changes you want to publish.
2. Check out the named branch that owns those commits and make sure its worktree is clean.
3. Run `pnpm release:dev-publish -- --push` locally from that branch.
4. Let the script create and push the matching
   `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` tag with branch and commit provenance.
5. Let [../../.github/workflows/dev-tag-release.yml](../../.github/workflows/dev-tag-release.yml)
   publish the prerelease artifacts from the pushed `navet-dev-*` tag.

Channel behavior depends on the source branch:

- a publish from `main` creates immutable exact-version and `sha-*` images and refreshes the moving
  `edge` and `dev` aliases without changing protected `main`
- a publish from any other named branch creates immutable exact-version and `sha-*` images plus a
  GitHub prerelease only; it does not change `main`, `edge`, `dev`, or Home Assistant Add-on Store
  metadata
- automatic publishes do not change Home Assistant Add-on Store metadata; supervised `Navet Dev`
  discovery advances only through a separately reviewed metadata change

Fallback:

- manually dispatch
  [../../.github/workflows/dev-tag-publish.yml](../../.github/workflows/dev-tag-publish.yml) from
  `main` if the automatic post-merge run needs to be repeated
- the dispatch workflow only creates and pushes the `navet-dev-*` tag
- the tag-triggered publish workflow performs the actual artifact publication

Important note:

- immutable dev-tag versioning comes from the publish workflow and tag name
- every dev tag retains its source branch and commit provenance
- a main publish refreshes Docker `edge` and `dev` without writing to protected `main`
- automatic dev publishes do not advance `platform/home-assistant/addons/navet-dev/config.yaml` or
  the supervised `Navet Dev` Add-on Store surface
- install a non-main publish by its exact immutable Docker version; do not expect the moving aliases
  or Add-on Store to select it
- dev publishes do not sync `awesomestvi/navet-home-assistant` and do not create HACS updates

## Release Notes

Source:

1. Add one `.changes/<topic>.yaml` file in every pull request.
2. Use `new`, `improved`, `fixed`, `security`, or `internal` as its type.
3. Name affected audiences when the change is user-facing.
4. CI validates the fragment; Dev notes use the merged PR fragment and beta/stable notes use the
   complete range since the previous stable tag.
5. `internal` fragments prove the pull request was considered but are omitted from published notes.

Writing style:

- Use plain, direct language. Write for people using Navet, not contributors reading the diff.
- Use only headings that have entries: `New features`, `Improvements and bug fixes`, and
  `Security`.
- Give each distinct user-visible topic one bullet, even when several commits contributed to it.
- Keep every bullet to one physical Markdown line, one short sentence, and 20 words or fewer.
- Default to one bullet for a single-topic release and one to three bullets otherwise.
- Start with a clear verb such as `Added`, `Improved`, or `Fixed`, or state what Navet now does.
- State the primary user outcome, then stop. Omit secondary details, implementation, file names,
  test coverage, and commit-by-commit narration.
- Combine related features, fixes, privacy details, and polish into their topic's single bullet.
- Avoid vague qualifiers such as `more reliably`, `more consistently`, or `clearer` unless the
  bullet says what is now reliable, consistent, or clear.
- Do not add boilerplate such as `Updated Navet to X`; the release heading already provides the
  version.
- If a release has no user-facing changes, write `No user-facing changes in this release.`
- Keep the add-on changelog limited to changes that affect add-on users.

Example:

```markdown
## Improvements and bug fixes

- Navet now adjusts visual effects to match each device, with manual controls in Settings.
- Fixed docs navigation on mobile.
```

## Automated Workflow Expectations

- Tier 1 release-critical validation is the release gate
- Tier 2 remains blocking for main CI
- Tier 3 is a blocking pull-request gate
- beta builds release artifacts from a tested Dev commit; RC and stable promote those tested
  container digests without rebuilding them
- tagged releases build the custom-panel artifact from the promoted commit
- tagged releases sync the exported HACS payload into `awesomestvi/navet-home-assistant/main`
- after artifact verification, tagged releases open a generated Home Assistant App metadata PR in
  `awesomestvi/navet`, wait for required checks, and merge it through normal branch protection
- tagged releases also create or refresh the matching Git tag in `awesomestvi/navet-home-assistant`
- missing HACS credentials fail the release instead of silently producing a partial release
- the release GitHub App must also be installed on `awesomestvi/navet` with Contents and Pull
  requests write access so the generated metadata PR can be created and merged without bypassing
  branch protection
- a release is complete only after exact app/add-on images, HACS release, panel archive, GitHub
  release, and public website/demo/docs/Storybook availability are verified
- local `pnpm sync:hacs` is still useful for previewing export output before release work

## Publishing Rules

- Cloudflare Pages deploys the marketing website, demo, Storybook, and docs as independent projects
- GitHub Pages is retired for this surface
- all dev tags publish immutable exact-version and `sha-*` app and add-on images
- only dev tags sourced from `main` refresh the moving `edge` and `dev` aliases
- dev tags do not write supervised add-on metadata to protected `main`
- prerelease tags do not move `latest`
- stable tags publish the exact tag, moving stable aliases, and `sha-*`
- stable tags continue to move Docker `latest`; Navet does not publish a separate Docker `stable`
  alias

## Related Guidance

- command restrictions and commit rules: [commands.md](commands.md)
- versioning and release-note policy: [../VERSIONING.md](../VERSIONING.md)
