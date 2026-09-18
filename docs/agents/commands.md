# Commands

Use this file as the command policy for active repo work.

## Do First

- prefer the smallest validation surface that answers the task
- use targeted tests before broader suites
- treat release and packaging commands as maintainer workflows unless the task explicitly calls for them
- agents run the checks needed to prove their own work; do not hand routine validation back to the user

## Broad Commands

Do not run broad commands merely because they exist. Run them when the affected scope or a required
gate calls for them:

- `pnpm build`
- `pnpm typecheck`
- `pnpm check`
- `pnpm test:tier3`
- `pnpm test:visual-review`

Notes:

- start with targeted checks, then run the applicable broad gate before declaring the change ready
- for UI changes, render the affected state and run the narrowest Storybook or visual-review check
- `pnpm release:*`, `pnpm sync:hacs`, and publication commands remain maintainer workflows unless
  the task explicitly authorizes release execution
- `pnpm build:ha-panel` is built by release automation and is not a standard local release-prep step

## Common Commands

```bash
pnpm dev
pnpm preview
pnpm storybook
pnpm website:dev
pnpm website:preview
pnpm marketing:wip:clean -- --area <community|tutorials|videos> --id <task-id>
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm brand:generate
pnpm check:stories
pnpm check:ui-kit
pnpm check:provider-boundaries
pnpm check:bundle-budget
pnpm check:docker
pnpm check:lockfile
pnpm check:brand
pnpm validate
pnpm report:bundle
pnpm report:ui-kit
pnpm test
pnpm test:tier1
pnpm test:tier2
pnpm test:tier3
pnpm test:coverage
pnpm test:storybook
pnpm test:visual-review
pnpm build:demo
pnpm storybook:build
pnpm website:build
pnpm release:check
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
- public documentation work: `pnpm docs:build`
- brand guidance or asset work: `pnpm check:brand`
- bundle investigation: `pnpm check:bundle-budget` and `pnpm report:bundle`
- release file validation: `pnpm release:check`

Routeable validation:

- use `pnpm validate -- --scope brand` for brand guidance, master artwork, and generated assets
- use `pnpm validate -- --scope ui` for shared UI, token, and Storybook structure changes
- use `pnpm validate -- --scope dashboard` for dashboard layout, card, and dashboard hook changes
- use `pnpm validate -- --scope provider` for provider contract, runtime, state, and adapter changes
- use `pnpm validate -- --scope workflow` for scripts, test-tier, and agent-command changes
- use `pnpm validate -- --dry-run` to see which checks changed files would run

UI tweak policy:

- for small visual polish, spacing, layout, copy, or styling-only tweaks, run the closest focused
  story or test and inspect the rendered state
- use `pnpm test:visual-review` when the change can affect responsive layout, overflow, or shared
  dashboard composition

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
