# Commands

Internal maintainer and agent reference. This file defines repo command rules for contributors who
are actively changing the codebase.

This file defines repo command rules, command references, and commit requirements for agents working in Navet.

## Command Reference

```bash
pnpm dev                   # run the standalone app workspace in dev mode
pnpm preview               # preview the standalone production build with generated preview config
pnpm storybook             # run Storybook locally
pnpm website:dev           # run the website workspace locally
pnpm website:preview       # preview the built website workspace
pnpm typecheck             # type-check without emitting
pnpm check                 # Biome lint + format check
pnpm format                # Biome format (auto-fix)
pnpm check:stories         # validate Storybook title, coverage, and ownership rules
pnpm check:ui-kit          # validate UI-kit import and boundary rules
pnpm check:provider-boundaries  # enforce provider boundary import rules
pnpm check:bundle-budget   # enforce bundle-size budget checks
pnpm check:docker          # build the standalone image and validate nginx/njs config
pnpm check:lockfile        # verify lockfile/package manifest consistency
pnpm check:commitmsg       # validate a Conventional Commit message
pnpm report:bundle         # inspect bundle composition for regressions
pnpm report:ui-kit         # inspect UI-kit usage and boundary adherence
pnpm test                  # broad local regression suite (Tier 3)
pnpm test:tier1            # release-critical provider/runtime gate
pnpm test:tier2            # blocking app-contract suite
pnpm test:tier3            # broad regression suite
pnpm test:coverage         # unit coverage run
pnpm test:storybook        # Storybook-focused test project
pnpm build                 # build the standalone app workspace
pnpm build:demo            # build the demo app for website bundling
pnpm build:ha-panel        # build bundled Home Assistant custom panel assets
pnpm storybook:build       # static Storybook build for the website bundle
pnpm website:build         # build website + demo + Storybook into one Cloudflare Pages output
pnpm sync:hacs             # export to ../navet-hacs and show that repo's pending changes
pnpm release:check         # validate release-managed files and release surfaces
pnpm release:linear        # fetch release-scope Linear issues
pnpm release:notes         # extract release-note candidates
pnpm release:version-sync  # align stable release-managed versions from package.json
pnpm release:dev-publish   # create the Navet Dev tag locally from the current HEAD, optionally push with -- --push
pnpm wallpapers:audit      # audit wallpaper source/output inventory
pnpm wallpapers:optimize   # optimize wallpaper assets
pnpm wallpapers:check      # verify optimized wallpaper outputs
```

## Execution Rules

- Do not run `pnpm build` unless explicitly asked.
- Do not run `pnpm typecheck` or `pnpm check` yourself. Ask the user to run them and report back.
- Treat `pnpm release:*`, `pnpm sync:hacs`, and `pnpm build:ha-panel` as maintainer workflows unless the user explicitly asks for release or packaging work.
- Prefer the smallest validation surface that answers the task: targeted tests first, then tiered suites, then broader builds only when required.
- For release work, do not run any `pnpm` command yourself. List the required commands for the user, wait for the reported results, and continue from there.
- For release work, do not ask the user to run `pnpm build:ha-panel` as part of standard prep. The
  automated release/HACS workflow builds the custom panel assets.
- If a commit or hook is blocked by TypeScript errors, fix the type errors instead of updating or relying on a typecheck baseline.

## Quick Command Picks

- App behavior change: `pnpm test:tier2`
- Provider contract or auth/runtime change: `pnpm test:tier1`
- Story or UI-kit work: `pnpm check:stories` and `pnpm test:storybook`
- Website or marketing surface work: `pnpm website:build`
- Bundle-size investigation: `pnpm check:bundle-budget` and `pnpm report:bundle`
- Release file validation: `pnpm release:check`

## Commit Rules

- Follow the [Conventional Commits 1.0.0 specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).
- Use this structure:

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

- `feat` means the commit adds a new feature.
- `fix` means the commit fixes a bug.
- Other types are allowed when they describe the change clearly, such as `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `style`, or `test`.
- A scope may be added after the type to identify the affected area, for example `feat(dashboard): add room filters`.
- The description must immediately follow the colon and space, and should be a concise summary of the change.
- A body may be added after one blank line when the change needs extra context. The body is free-form and may contain multiple paragraphs.
- Footers may be added after one blank line following the body. Use git-trailer style tokens such as `Refs: #123` or `Reviewed-by: Name`.
- Breaking changes must be marked either with `!` before the colon, such as `feat(api)!: remove legacy auth`, or with a footer that starts with `BREAKING CHANGE:`.

## Related Guidance

- Storybook-specific command and base-path rules live in [../STORYBOOK_WORKFLOW.md](../STORYBOOK_WORKFLOW.md).
- Release and publishing policy lives in [release-and-publishing.md](release-and-publishing.md).
