# Release And Publishing

Use this guide for maintainer and agent release work. The complete operational procedure,
artifact model, recovery path and hosted rollout are in [Release Workflow](../release-workflow.md).

## Authority And Inputs

- Preparation may run non-publishing validation; tagging, pushing, and publication require explicit authority.
- Every PR adds a validated `.changes/*.yaml` fragment, including `internal` for non-user-facing work.
- Protected `main` is never advanced by a direct release commit or a bypass.
- Keep root `repository.yaml` in the monorepo and Home Assistant sources under `platform/home-assistant`.
- The annotated release tag identifies the source commit. GitHub Releases are the published changelog.
- Website and docs clients read stable GitHub Releases; do not create per-release website metadata commits.
- Generated panel files remain build outputs, not tracked source.

## Development And Publication

Merged runtime-impacting changes automatically create a main-backed Dev tag. Docs, marketing,
automation-only and strictly version-only add-on metadata changes do not publish new product images.
Manual Dev dispatch remains available. Dev publication runs source safety checks once and tests the
actual published standalone and add-on image digests on both architectures before moving aliases.

Run **Promote Navet Release** from `main` with an exact successful source tag and a new target tag.
Beta starts from Dev; stable starts from a successful beta/RC of the same base version. Install the
candidate first, then enable `installation_tested` when dispatching stable. This dispatch authorizes
publication; beta/production environment credentials are restricted to trusted `main` workflows
without repeated reviewer prompts.

Each version receives correctly versioned packages and actual-image verification. Stable is a new
package of the tested source, not a beta image with a different Docker tag. The panel is built once
and reused for the archive and HACS. Existing versioned images and HACS tags are never overwritten.
A generated metadata PR updates the existing Home Assistant App repository through normal protection.
Only after verification and that PR completes do moving Docker channels advance.

The successful run and its `navet-release-evidence.json` record establish publication completion.
Do not infer completion from a GitHub release or image tag existing. Registry failures are not
evidence that an image is absent.

For recovery, dispatch **Publish Release** from current `main` with the existing release and source
tags. An old run's retry uses its old workflow code. Conflicting published artifacts require a new
version, never tag rewrites. Public-site availability does not gate product publication.

## Validation And Deployments

CI always runs quality, type, fragment and script checks. The change-aware Product review gate
requires every applicable lane and Cloudflare preview bound to the current site inputs; unexpected skips fail.
Runtime changes retain all three test tiers and Docker checks. Shared and unknown inputs run broadly.

Cloudflare builds previews and production only for watched inputs. Keep hosted filters and merge
protection synchronized with `scripts/pipeline-rollout.mjs`; apply only after the new gate is on
`main`. Do not remove required checks independently. See the operational guide for setup and
verification. No release workflow rebuilds the public sites.

## Release Notes

Source:

1. Add one `.changes/<topic>.yaml` file in every pull request.
2. Use `new`, `improved`, `fixed`, `security`, or `internal` as its type.
3. Name affected audiences when the change is user-facing.
4. CI validates the fragment; Dev notes use the merged PR fragment and beta/stable notes use the
   complete range since the previous stable tag.
5. `internal` fragments prove the pull request was considered but are omitted from published notes.

Run `pnpm release:status` to list fragments pending since the last completed stable release.
Use `pnpm release:status --all` to list released fragments too. The command checks the published
release evidence and successful workflow run before choosing its baseline; a tag alone is not
proof of publication. `local` means the file has not been added to Git. If a released fragment is
shown as `revised`, create a new fragment for the new change instead of reusing its filename.

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


## Related Guidance

- Command and commit policy: [commands.md](commands.md).
- Version scheme: [../VERSIONING.md](../VERSIONING.md).
- Maintainer procedure and hosted activation: [../release-workflow.md](../release-workflow.md).
