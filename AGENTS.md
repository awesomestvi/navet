## Commit Rules

- Format: `type(scope): summary`
- Valid types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`, `style`
- Do not use generic or free-form commit messages.
- If a commit was already created with a non-conventional message, amend it before finishing the task.

## Verification

- Do not run `pnpm typecheck` after every code change by default. Ask the user to run it instead unless they explicitly request that you run it.
- After structural refactors, import cleanup, module moves, or shared-type changes, ask the user to run `pnpm typecheck`.
- For small visual or copy-only changes, do not ask to run `pnpm typecheck` unless the edit touches shared logic, types, or wiring.
- Preserve behavior during refactors — structural cleanup must not introduce feature changes unless explicitly requested.

## Branding

- Follow `docs/branding/BRANDING.md` for Navet brand asset usage.
- Use logo files from `public/` as-is. Do not restyle, recolor, add shadows, outlines, glows, or gradients to the logo.
- Maintain adequate clear space around the mark.
