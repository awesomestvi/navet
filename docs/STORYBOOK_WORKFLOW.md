# Storybook Workflow

Storybook is Navet's visual review surface for UI primitives, patterns, cards, widgets, and page
states. It should help contributors review UI in isolation. It should not become a second live app
runtime.

The Storybook host workspace lives in `apps/storybook/`. Story files remain colocated with package
code.

Architecture note:

- Storybook documents the current shared UI implementation surface.
- That current surface is mostly app-owned under `packages/app/src/components/*`,
  `packages/app/src/features/*`, and `packages/app/src/ui-kit/*`.
- `@navet/ui` remains the target provider-neutral shared UI package boundary even where Storybook
  is still reviewing app-owned migration seams.

## Where Stories Go

Use colocated stories by default.

| Area | Location | Title root |
|---|---|---|
| UI kit overview stories | `packages/app/src/ui-kit/*.stories.tsx` | `Concepts/` |
| primitives | `packages/app/src/components/primitives/*.stories.tsx` | `Components/Primitives/` |
| patterns | `packages/app/src/components/patterns/*.stories.tsx` | `Components/Patterns/` |
| shared app UI | `packages/app/src/components/shared/**/*.stories.tsx` | `Components/Shared/` or `Theme/` |
| layout and app shell | `packages/app/src/components/layout/*.stories.tsx` | `App Shell/` |
| system tokens and reference views | `packages/app/src/components/system/**/*.stories.tsx` | `System/` or `Theme/` |
| feature cards, dialogs, and pages | `packages/app/src/features/**/**/*.stories.tsx` | `Cards/`, `Pages/`, or feature-specific roots |
| aggregate catalogs | `packages/app/src/features/dashboard/stories/*.stories.tsx` | `Cards/Overview/` |

## Story Rules

- use deterministic local fixtures
- reuse helpers from `packages/app/src/storybook/`
- do not connect stories to live provider sessions
- initialize only the minimum store state a story needs
- keep aggregate stories useful, but do not hide normal component stories behind them
- when adding or renaming a public card story, register its shared docs copy in `packages/app/src/storybook/story-docs.ts`
- keep primary entity-card families covered with standalone stories before relying on aggregate matrix or catalog stories
- when documenting story placement, distinguish current implementation locations from target
  package ownership
- if a provider-neutral shared UI surface is extracted into `@navet/ui`, colocate its stories with
  that package instead of forcing them to remain app-owned

## Commands

```bash
pnpm storybook
pnpm storybook:build
pnpm website:build
pnpm check:stories
pnpm test:storybook
```

## Related Docs

- [design-system/README.md](design-system/README.md)
- [design-system/UI-GUIDELINES.md](design-system/UI-GUIDELINES.md)
