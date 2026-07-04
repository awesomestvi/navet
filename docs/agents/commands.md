# Commands

Use this file as the command policy for active repo work.

## Do First

- prefer the smallest validation surface that answers the task
- use targeted tests before broader suites
- treat release and packaging commands as maintainer workflows unless the task explicitly calls for them

## Do Not Run By Default

- `pnpm build`
- `pnpm typecheck`
- `pnpm check`
- `pnpm release:*`
- `pnpm sync:hacs`
- `pnpm build:ha-panel`

Notes:

- ask the user to run `pnpm typecheck` or `pnpm check` and report back
- for small UI-only tweaks, do not run tests by default; tell the user which targeted validation
  command to run and report back
- for release work, list the required commands for the user instead of running them yourself
- do not ask the user to run `pnpm build:ha-panel` as part of standard release prep

## Common Commands

```bash
pnpm dev
pnpm preview
pnpm storybook
pnpm website:dev
pnpm website:preview
pnpm check:stories
pnpm check:ui-kit
pnpm check:provider-boundaries
pnpm check:bundle-budget
pnpm check:docker
pnpm check:lockfile
pnpm validate
pnpm report:bundle
pnpm report:ui-kit
pnpm test
pnpm test:tier1
pnpm test:tier2
pnpm test:tier3
pnpm test:coverage
pnpm test:storybook
pnpm build:demo
pnpm storybook:build
pnpm website:build
pnpm release:check
pnpm release:linear
pnpm release:notes
pnpm release:version-sync
pnpm release:dev-publish
pnpm wallpapers:audit
pnpm wallpapers:optimize
pnpm wallpapers:check
```

## Quick Picks

- app behavior change: `pnpm test:tier2`
- provider contract or auth/runtime change: `pnpm test:tier1`
- Storybook or UI-kit work: `pnpm check:stories` and `pnpm test:storybook`
- website or marketing work: `pnpm website:build`
- bundle investigation: `pnpm check:bundle-budget` and `pnpm report:bundle`
- release file validation: `pnpm release:check`

Routeable validation:

- use `pnpm validate -- --scope ui` for shared UI, token, and Storybook structure changes
- use `pnpm validate -- --scope dashboard` for dashboard layout, card, and dashboard hook changes
- use `pnpm validate -- --scope provider` for provider contract, runtime, state, and adapter changes
- use `pnpm validate -- --scope workflow` for scripts, test-tier, and agent-command changes
- use `pnpm validate -- --dry-run` to see which checks changed files would run

UI tweak policy:

- for small visual polish, spacing, layout, copy, or styling-only tweaks, do not run the validation
  commands above by default
- instead, prompt the user to run the most relevant targeted command, usually `pnpm test:storybook`,
  `pnpm check:stories`, or a focused `pnpm test <path>`

## Commit Rules

Use Conventional Commits:

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

Working rules:

- `feat` adds a feature
- `fix` fixes a bug
- other clear types such as `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `style`, and
  `test` are allowed
- scopes are optional but useful when they identify the affected area
- breaking changes must use `!` or a `BREAKING CHANGE:` footer

If a commit or hook is blocked by TypeScript errors, fix the type errors instead of relying on a
baseline workaround.

## Related Guidance

- Storybook-specific workflow: [../STORYBOOK_WORKFLOW.md](../STORYBOOK_WORKFLOW.md)
- release and publishing policy: [release-and-publishing.md](release-and-publishing.md)
