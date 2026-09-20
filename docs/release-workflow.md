# Release Workflow

Navet has two independent delivery paths: continuous public sites and versioned installable
releases. A product release does not redeploy or smoke-test the public sites.

## Pull Requests And Public Sites

Every pull request adds a validated `.changes/*.yaml` fragment. Use `internal` and an empty
audience list when there is no user-facing change.

CI always runs quality checks, type checking, release-fragment validation, and script tests
(through the product test lanes for runtime changes, or a focused script lane otherwise).
A conservative changed-input policy selects product tests, builds, and public-site previews.
Unknown inputs, shared code, dependency changes, and build-tool changes take the broad path.
The Product review gate fails if an applicable lane fails, is cancelled, or is unexpectedly
skipped. An unaffected lane is deliberately skipped.

Runtime changes run Tier 1, Tier 2, Tier 3, Docker checks, and responsive visual review. CI's Tier 3
lane excludes only the files already covered by its required Tier 1 and Tier 2 lanes; the local
`pnpm test:tier3` command still runs the complete suite. Visual
review downloads the demo built by the quality job rather than building it again. Storybook's
complete browser interaction suite remains a local diagnostic until its baseline assertions
are repaired; the production Storybook build remains required when affected.

Cloudflare Pages owns site deployment:

| Project | Build command | Output |
| --- | --- | --- |
| `navet` | `pnpm website:build` | `apps/website/dist` |
| `navet-demo` | `pnpm build:demo` | `apps/demo/dist` |
| `navet-storybook` | `pnpm storybook:build` | `apps/storybook/dist` |
| `navet-docs` | `pnpm docs:build` | `apps/docs/dist` |

Affected branch pushes produce previews. Affected pushes to `main` update production.
CI build checks and Cloudflare builds are separate: CI verifies the change; Cloudflare owns
the deployed artifact. The initial optimization scopes these builds rather than transferring
production deployment credentials into PR jobs.

`scripts/pages-policy.mjs` defines the shared conservative path policy. The merge gate checks
successful Cloudflare check runs from the Cloudflare app for affected projects. It uses the exact
PR head, or an ancestor only after proving every watched input is unchanged. This handles a
fragment-only follow-up commit for which Cloudflare correctly skips a new preview. A current
pending or failed check cannot be bypassed by an older success. Keep live build-watch configuration
synchronized using the rollout procedure
below. Public-site availability monitoring is separate from release publication.

## Dev Builds

`Prepare Navet Dev Publish` runs after a PR merges into protected `main`. It classifies the merged
diff and creates an annotated `navet-dev-0.x.y-dev.YYYYMMDDHHMMSS` tag only for runtime-impacting
changes. Version-only add-on metadata, changelog fragments, website, docs, and automation-only
changes do not create another product image.

A maintainer can dispatch that workflow from `main` to request a Dev build explicitly.
Named-branch builds remain available through `pnpm release:dev-publish -- --push` from a clean,
validated branch. Publishing requires explicit maintainer authorization.

`Publish Navet Dev` validates tag provenance and runs the release-critical source checks once.
It builds exact-version standalone and add-on images, pulls the resulting digests, and runs the
runtime suite against those images on AMD64 and ARM64. This checks the installed product,
including Ingress and persisted restart, without building another pair of test images.

After verification, main-backed builds can advance `dev` and `edge`. An older queued build
cannot roll those aliases back to an ancestor commit. Named-branch builds publish exact versions
without moving shared aliases. Dev builds do not publish HACS or update supervised App metadata.

## Beta, Release Candidates, And Stable

1. Choose an immutable Dev tag whose publication workflow completed successfully.
2. Run **Promote Navet Release** from `main`, providing `source_tag` and a new
   `release_tag`, for example `v0.18.0-beta.1`.
3. Wait for **Publish Release** to complete. It builds correctly versioned artifacts, validates
   their actual registry digests, publishes HACS and the panel archive, and completes the
   protected Home Assistant metadata PR.
4. Install that exact beta in your Docker/Home Assistant setup and test the relevant behavior.
5. To publish stable, run **Promote Navet Release** from `main` with the tested beta/RC as
   `source_tag`, the stable target tag, and `installation_tested` enabled.

Beta must start from Dev. An RC can start from Dev, beta, or another RC. Stable must start from a
successfully published beta/RC of the same base version. Source and target tags resolve to the
same commit already contained in protected `main`. The source release's evidence records the
tested image digests and publication run; missing, incomplete, or changed evidence blocks promotion.

The maintainer dispatch is the publication decision. There are no repeated per-job approval
prompts. The `beta` and `production` environments hold release credentials and allow only trusted
`main` workflows. Public-site checks do not gate this process.

### Artifact Identity

Each release version is built with its own version and channel metadata. Stable is a new,
verified package of the tested source commit, not a byte-identical retag of a beta image.
That distinction is intentional: Docker retagging cannot change embedded application metadata.
Both stable and candidate artifacts must pass the actual-image runtime checks.

Exact-version image tags are never overwritten by this process. A retry reuses the existing
digest, checks its version, channel and source commit, and runs its runtime validation again.
Registry authentication or connectivity errors fail the workflow; they are not interpreted as
permission to rebuild an existing version.

The Home Assistant panel is built once per version and reused in both the downloadable archive
and HACS export. Existing published panel archives are reused. Existing HACS tags are checked
against the expected payload, never force-moved.

The workflow creates a `navet-release-evidence.json` asset recording the source commit, version,
image digests and publication run. It is verification metadata, not an application package;
a recovery run can refresh this record after rechecking the same immutable artifacts. A source
release is promotable only after the recorded run finishes successfully.

### Channels And Completion

Standalone image tags:

- Dev: exact `0.x.y-dev.YYYYMMDDHHMMSS`; main-backed builds also advance `dev` and `edge`.
- Prerelease: exact `vX.Y.Z-beta.N` or `vX.Y.Z-rc.N`, plus `beta` after verification.
- Stable: exact `vX.Y.Z`, plus `X.Y` and `latest` after verification.

Add-on images use `{arch}-navet-addon` repositories and exact versions without the leading `v`.
Commit-only `sha-*` aliases are not updated: one commit can have different Dev, beta and stable
packages. Use a version plus the recorded `sha256:` digest to identify an artifact.

Release publication is serialized because HACS and moving aliases are shared resources.
Moving channels are updated by verified digest only after artifacts and the metadata PR complete.
Older/equal-version retries cannot replace a channel with different bytes. Distribution across
GitHub, GHCR and Home Assistant is not atomic: an interrupted run may expose exact-version
artifacts before it completes. Treat the final successful run and evidence as completion, not
the presence of an individual tag.

### Recovery

Release orchestration runs from trusted `main`; `release_tag` is an input, not the workflow ref.
Build jobs explicitly check out the release commit. This allows a corrected orchestrator to
recover an older release without moving its Git tag.

To recover, dispatch **Publish Release** from `main` with the existing `release_tag`, its
annotated `source_tag`, and installation confirmation for stable. Rerunning an old Actions run
still uses its original workflow revision; it does not pick up newly merged fixes.

If an existing artifact has incorrect identity or conflicting contents, create a new candidate
version. Never delete or overwrite a published version to make a retry succeed. Releases created
without verified source evidence must be rebuilt as a new candidate before stable promotion.

## Changelog And Home Assistant Distribution

The release tag is the published version; GitHub Releases are the published changelog.
`package.json` describes the source line, not the latest published release.

Website and documentation clients read stable GitHub Releases directly. The root `CHANGELOG.md`
is their historical fallback. Neither requires a release-specific source update or redeploy.
Dev notes describe the merged change; beta/RC/stable notes include all user-facing fragments
since the previous stable tag, filtered by audience where appropriate.

The monorepo owns Home Assistant integration and add-on sources under `platform/home-assistant`.
HACS receives the integration export in `awesomestvi/navet-home-assistant`. The Home Assistant App
repository stays `awesomestvi/navet`, with root `repository.yaml`; subscribers do not need to
change repository URLs.

After artifact verification, automation opens the small App metadata PR and merges it through
normal branch protection without bypass privileges. This PR gets quality/script checks and
metadata-aware classification, not another full product release. Changes to config fields other
than the version take the product-validation path.

## Activating Scoped Deployments

The repository change and hosted settings must be rolled out in this order:

1. Merge the workflow, tests and policy through the existing protected PR process. Keep all four
   Cloudflare checks required until the new aggregate gate is installed.
2. Configure local `CLOUDFLARE_ACCOUNT_ID` and a `CLOUDFLARE_API_TOKEN` scoped to edit these Pages
   projects. Authenticate `gh` with repository administration access. Never commit these values.
3. Run `node scripts/pipeline-rollout.mjs` to inspect the dry-run policy.
4. With no release in progress, run `node scripts/pipeline-rollout.mjs --apply`.

The command checks that the reviewed gate files match `main`, saves a recovery snapshot, preserves
unrelated branch rules, and replaces unconditional Pages requirements with the affected-site
gate. It then configures the Pages filters and restricts beta/production environments to `main`.
It refuses unexpected existing protections rather than silently replacing them.

Validate the rollout with an automation-only PR (no site deployments), a docs-only PR (docs),
and a shared-runtime change (broad checks and dependent sites). Inspect the exact-head gate and
deployment results before declaring the hosted rollout complete.

## Manual Responsibilities

Maintainers choose versions, review release fragments, install and test candidates, authorize
stable publication, and decide whether a rollback or new fix release is appropriate.
Use **Draft Release Communication** for grounded announcement drafts; publication to community
channels requires separate approval.
