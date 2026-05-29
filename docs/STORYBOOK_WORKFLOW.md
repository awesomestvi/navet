# Storybook Workflow

Storybook is Navet's visual review surface for UI primitives, patterns, cards, widgets, and page
states. It should help contributors review UI in isolation. It should not become a second live app
runtime.

## Where Stories Go

Use colocated stories by default.

| Area | Location | Title root |
|---|---|---|
| UI kit overview stories | `src/app/ui-kit/*.stories.tsx` | `Concepts/` |
| primitives | `src/app/components/primitives/*.stories.tsx` | `Components/Primitives/` |
| patterns | `src/app/components/patterns/*.stories.tsx` | `Components/Patterns/` |
| shared app UI | `src/app/components/shared/**/*.stories.tsx` | `Components/Shared/` or `Theme/` |
| layout and app shell | `src/app/components/layout/*.stories.tsx` | `App Shell/` |
| system tokens and reference views | `src/app/components/system/**/*.stories.tsx` | `System/` or `Theme/` |
| feature cards, dialogs, and pages | `src/app/features/**/**/*.stories.tsx` | `Cards/`, `Pages/`, or feature-specific roots |
| aggregate catalogs | `src/app/features/dashboard/stories/*.stories.tsx` | `Cards/Overview/` |

## Story Rules

- use deterministic local fixtures
- reuse helpers from `src/app/storybook/`
- do not connect stories to live provider sessions
- initialize only the minimum store state a story needs
- keep aggregate stories useful, but do not hide normal component stories behind them

## Commands

```bash
pnpm storybook
pnpm storybook:build
pnpm check:stories
pnpm test:storybook
```

## Related Docs

- [../design-system/README.md](../design-system/README.md)
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)
