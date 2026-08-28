# Release And Publishing

Use this file for maintainer and agent release work.

## Hard Rules

- do not run release `pnpm` commands yourself during assisted release work
- list the required commands for the user and wait for the reported results
- use `pnpm release:linear` or the Linear app as the preferred release-note source
- keep release-managed files aligned for versioned releases
- keep root `repository.yaml` in the monorepo
- treat `platform/home-assistant/custom_components/navet/` as the HACS integration source of truth
- keep generated panel assets out of the monorepo; release automation assembles them into exports

## Release-Managed Files

- `package.json`
- `CHANGELOG.md`
- `platform/home-assistant/custom_components/navet/manifest.json`
- `platform/home-assistant/addons/navet/config.yaml`
- `platform/home-assistant/addons/navet/CHANGELOG.md`
- `docs/VERSIONING.md`

## Stable Release Flow

1. Decide whether the change is `patch`, `minor`, or `prerelease`.
2. Bump `package.json`.
3. Run `pnpm release:version-sync`.
4. Fetch Linear issues in the `Ready for Release` workflow state.
5. Draft the `CHANGELOG.md` section from those issues. If there are no matching issues, fall back
   to commit history.
6. Update `platform/home-assistant/addons/navet/CHANGELOG.md`.
7. Update [../VERSIONING.md](../VERSIONING.md) if release meaning changed.
8. Run `pnpm release:check`.
9. Tag the monorepo commit with a version tag such as `v0.3.1`, `v0.3.1-beta.1`, or `v0.3.1-rc.1`.
10. Push the tag to GitHub to trigger
    [../../.github/workflows/release.yml](../../.github/workflows/release.yml).

Important note:

- do not ask maintainers to run `pnpm build:ha-panel` during normal release prep
- the automated release and HACS workflows build the custom panel assets

## Immutable Navet Dev Flow

1. Commit and validate the changes you want to publish.
2. Check out the named branch that owns those commits and make sure its worktree is clean.
3. Run `pnpm release:dev-publish -- --push` locally from that branch.
4. Let the script create and push the matching
   `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` tag with branch and commit provenance.
5. Let [../../.github/workflows/dev-tag-release.yml](../../.github/workflows/dev-tag-release.yml)
   publish the prerelease artifacts from the pushed `navet-dev-*` tag.

Channel behavior depends on the source branch:

- a publish from `main` creates immutable exact-version and `sha-*` images, refreshes the moving
  `edge` and `dev` aliases, and commits the matching Navet Dev add-on metadata on `main` so Home
  Assistant supervised installs can discover the update
- a publish from any other named branch creates immutable exact-version and `sha-*` images plus a
  GitHub prerelease only; it does not change `main`, `edge`, `dev`, or Home Assistant Add-on Store
  metadata
- a branch publish becomes visible to existing `Navet Dev` add-on installations only after its
  metadata lands on `main` through a later main publish

Fallback:

- dispatch [../../.github/workflows/dev-tag-publish.yml](../../.github/workflows/dev-tag-publish.yml)
  from `main` if you cannot run the local script; manual dispatch remains main-only
- the dispatch workflow only creates and pushes the metadata commit plus `navet-dev-*` tag
- the tag-triggered publish workflow performs the actual artifact publication

Important note:

- immutable dev-tag versioning comes from the publish workflow and tag name
- every dev tag retains its source branch and commit provenance
- only a main publish updates `platform/home-assistant/addons/navet-dev/config.yaml` on `main`,
  refreshes Docker `edge` and `dev`, and advances the supervised `Navet Dev` add-on surface
- install a non-main publish by its exact immutable Docker version; do not expect the moving aliases
  or Add-on Store to select it
- dev publishes do not sync `awesomestvi/navet-hacs` and do not create HACS updates

## Release Notes

Preferred source:

1. Fetch Linear issues in the `Ready for Release` workflow state.
2. Treat them as the release scope.
3. Group them into user-facing outcomes.
4. Do not include Linear issue IDs in `CHANGELOG.md`.

Writing style:

- Use plain, direct language. Write for people using Navet, not contributors reading the diff.
- Use only headings that have entries: `New features`, `Improvements and bug fixes`, and
  `Security`.
- Keep each bullet to one outcome, one short sentence, and aim for 20 words or fewer.
- Prefer three to five bullets. Add more only when combining them would hide distinct user changes.
- Start with a clear verb such as `Added`, `Improved`, or `Fixed`, or state what Navet now does.
- Say what changed and why it matters. Omit implementation details, internal architecture, file
  names, test coverage, and commit-by-commit narration.
- Combine related work into one bullet. Do not create a bullet for every issue or commit.
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

Helper command:

```bash
pnpm release:linear
```

Optional filters:

```bash
pnpm release:linear -- --team NAV
pnpm release:linear -- --label "public beta"
pnpm release:linear -- --project "0.2 release"
```

Fallback source:

- if there are no issues in `Ready for Release`, build concise notes from commits since the previous
  release tag

## Automated Workflow Expectations

- Tier 1 release-critical validation is the release gate
- Tier 2 remains blocking for main CI
- Tier 3 remains visible but non-release-blocking
- tagged releases build the custom-panel artifact in workflow
- tagged releases sync the exported HACS payload into `awesomestvi/navet-hacs/main`
- tagged releases also create or refresh the matching Git tag in `awesomestvi/navet-hacs`
- local `pnpm sync:hacs` is still useful for previewing export output before release work

## Publishing Rules

- Cloudflare Pages deploys the marketing website, demo, Storybook, and docs as independent projects
- GitHub Pages is retired for this surface
- all dev tags publish immutable exact-version and `sha-*` app and add-on images
- only dev tags sourced from `main` refresh the moving `edge` and `dev` aliases and supervised
  add-on metadata
- prerelease tags do not move `latest`
- stable tags publish the exact tag, moving stable aliases, and `sha-*`
- stable tags continue to move Docker `latest`; Navet does not publish a separate Docker `stable`
  alias

## Related Guidance

- command restrictions and commit rules: [commands.md](commands.md)
- versioning and release-note policy: [../VERSIONING.md](../VERSIONING.md)
