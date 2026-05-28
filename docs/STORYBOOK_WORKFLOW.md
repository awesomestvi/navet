# Storybook Workflow

Storybook is Navet's visual review surface for shared UI, entity cards, widgets, section
composition, and token behavior.

## What Storybook Owns

- shared primitive and pattern review
- UI-kit discovery stories
- card and widget visual behavior
- theme and token inspection
- layout and section composition scenarios

Storybook should not become a second live app runtime.

## Story Placement

Use colocated stories unless the story is intentionally aggregate or conceptual.

Current placement rules:

| Area | Location | Title root |
|---|---|---|
| UI-kit concept stories | `src/app/ui-kit/*.stories.tsx` | `Concepts/` |
| primitives | `src/app/components/primitives/*.stories.tsx` | `Components/Primitives/` |
| patterns | `src/app/components/patterns/*.stories.tsx` | `Components/Patterns/` |
| shared app-specific UI | `src/app/components/shared/**/*.stories.tsx` | `Components/Shared/` or `Theme/` |
| app shell and layout | `src/app/components/layout/*.stories.tsx` | `App Shell/` |
| feature cards and dialogs | `src/app/features/**/**/*.stories.tsx` | `Cards/` or `Pages/` |
| aggregate card catalogs | `src/app/features/dashboard/stories/*.stories.tsx` | `Cards/Overview/` |

## Fixture Rules

- use deterministic local fixtures
- prefer shared story frames and helpers from `src/app/storybook/`
- do not connect stories to live provider sessions
- initialize only the minimum store state a story needs

## Commands

```bash
pnpm storybook
pnpm storybook:build
pnpm check:stories
pnpm test:storybook
```

## Related Docs

- `design-system/README.md`
- `design-system/UI-GUIDELINES.md`
