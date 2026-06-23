# Release And Publishing

Use this file for maintainer and agent release work.

## Hard Rules

- do not run release `pnpm` commands yourself during assisted release work
- list the required commands for the user and wait for the reported results
- use `pnpm release:linear` or the Linear app as the preferred release-note source
- keep release-managed files aligned for versioned releases
- keep root `repository.yaml` in the monorepo
- treat `platform/home-assistant/custom_components/navet/` as the HACS source of truth for export

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

1. Push your tested changes to `main`.
2. Run `pnpm release:dev-publish -- --push` locally from `main`.
3. Let the script add the dev add-on metadata updates to your current staged set, create the
   matching `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` release commit and tag, then push both to GitHub.
4. Let [../../.github/workflows/dev-tag-release.yml](../../.github/workflows/dev-tag-release.yml)
   publish the prerelease artifacts from the pushed `navet-dev-*` tag.

Fallback:

- dispatch [../../.github/workflows/dev-tag-publish.yml](../../.github/workflows/dev-tag-publish.yml)
  from `main` if you cannot run the local script
- the dispatch workflow only creates and pushes the metadata commit plus `navet-dev-*` tag
- the tag-triggered publish workflow performs the actual artifact publication

Important note:

- immutable dev-tag versioning comes from the publish workflow and tag name
- the local dev-publish script or manual fallback helper updates
  `platform/home-assistant/addons/navet-dev/config.yaml` on `main` so Home Assistant supervised
  installs can detect the new version
- dev publishes refresh Docker `edge` and `dev` plus the supervised `Navet Dev` add-on surface
- dev publishes do not sync `awesomestvi/navet-hacs` and do not create HACS updates

## Release Notes

Preferred source:

1. Fetch Linear issues in the `Ready for Release` workflow state.
2. Treat them as the release scope.
3. Group them into user-facing outcomes.
4. Do not include Linear issue IDs in `CHANGELOG.md`.

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

- Cloudflare Pages deploys the website bundle, demo, and Storybook
- GitHub Pages is retired for this surface
- dev tags publish immutable app and add-on images and refresh the moving `edge` and `dev` aliases
- prerelease tags do not move `latest`
- stable tags publish the exact tag, moving stable aliases, and `sha-*`
- stable tags continue to move Docker `latest`; Navet does not publish a separate Docker `stable`
  alias

## Related Guidance

- command restrictions and commit rules: [commands.md](commands.md)
- versioning and release-note policy: [../VERSIONING.md](../VERSIONING.md)
