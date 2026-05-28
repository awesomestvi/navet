# Commands

This file defines repo command rules, command references, and commit requirements for agents working in Navet.

## Command Reference

```bash
pnpm typecheck       # type-check without emitting
pnpm check           # Biome lint + format check
pnpm format          # Biome format (auto-fix)
pnpm check:stories   # validate Storybook title, coverage, and ownership rules
pnpm check:ui-kit    # validate UI-kit import and boundary rules
pnpm check:docker    # build the standalone image and validate nginx/njs config
pnpm test            # unit tests
pnpm build:ha-panel  # build bundled Home Assistant custom panel assets
pnpm storybook:build # static Storybook build for GitHub Pages
```

## Execution Rules

- Do not run `pnpm build` unless explicitly asked.
- Do not run `pnpm typecheck` or `pnpm check` yourself. Ask the user to run them and report back.
- For release work, do not run any `pnpm` command yourself. List the required commands for the user, wait for the reported results, and continue from there.
- For HACS or Home Assistant custom panel releases, include `pnpm build:ha-panel` in the user-run release commands before the release commit or tag.
- If a commit or hook is blocked by TypeScript errors, fix the type errors instead of updating or relying on a typecheck baseline.

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
