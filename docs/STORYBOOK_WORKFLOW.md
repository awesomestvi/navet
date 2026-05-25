# Storybook Workflow

Storybook is Navet's visual review surface for shared UI, entity cards, dashboard widgets, layout
composition, theme behavior, and UI-kit discovery. Treat it as the place where a contributor can
understand what a component is for, which layer owns it, and how it behaves across themes and
viewports before opening the app.

## What Storybook Owns

Storybook should cover four kinds of work:

- UI-kit discovery: stable primitives, patterns, and token helpers exported through `src/app/ui-kit/`
- component review: colocated stories for primitives, patterns, shared controls, layout pieces, and feature UI
- product scenarios: entity-card catalogs, state matrices, dashboard widgets, settings sections, and energy visuals
- theme and viewport checks: global toolbar coverage for `glass`, `dark`, `light`, `black`, accent colors, card sizes, and wall-display viewports

Storybook should not become a second app runtime. Keep feature data loaders, live Home Assistant
connections, and app-only side effects out of stories. Use deterministic fixtures and shared story
frames instead.

## Story Placement

Use the existing colocated story before adding a new file.

| Area | Story location | Title root |
|---|---|---|
| UI-kit overview pages | `src/app/ui-kit/*.stories.tsx` | `Concepts/` |
| Primitives | `src/app/components/primitives/*.stories.tsx` | `Components/Primitives/` |
| Patterns | `src/app/components/patterns/*.stories.tsx` | `Components/Patterns/` |
| Shared app-specific controls | `src/app/components/shared/**/*.stories.tsx` | `Components/Shared/` or `Theme/` |
| App shell and section layout | `src/app/components/layout/*.stories.tsx` | `App Shell/` |
| Radix/UI wrappers | `src/app/components/ui/*.stories.tsx` | `Components/Primitives/` |
| Entity cards | `src/app/features/<feature>/components/**/*.stories.tsx` | `Cards/Entity/` |
| Custom dashboard cards | `src/app/features/dashboard/components/**/*.stories.tsx` and feature widget folders | `Cards/Custom/` |
| Feature pages and flows | `src/app/features/**/**/*.stories.tsx` | `Pages/` |
| Aggregate card catalogs | `src/app/features/dashboard/stories/*.stories.tsx` | `Cards/Overview/` |

The approved top-level roots are enforced by `pnpm check:stories`:

- `Concepts`
- `Theme`
- `Components`
- `App Shell`
- `Cards`
- `Pages`

Do not create ad hoc top-level groups for temporary work. If a story does not fit, update the
taxonomy intentionally in `.storybook/preview.tsx`, `scripts/check-storybook-standards.mjs`, and
`design-system/README.md` together.

## UI-Kit Discovery Stories

The three UI-kit stories are the starting point for shared UI work:

- `Concepts/UI Kit Start Here`: ownership rules, contribution flow, and review checklist
- `Concepts/UI Kit Inventory`: stable exports grouped by primitives, patterns, and tokens
- `Concepts/UI Kit Recipes`: common compositions for cards, dialogs, sheets, filters, and empty states

When an export becomes stable enough for cross-feature use, make it discoverable from the relevant
UI-kit story. This does not replace the colocated component story; it points contributors to the
stable import surface.

## Fixture Rules

Stories should use deterministic, local fixtures:

- prefer realistic Navet copy over lorem ipsum
- keep Home Assistant entity examples small and readable
- include empty, loading, disabled, selected, error, and long-content states when those states exist
- use shared story frames from `@/app/storybook/story-frames` for entity cards and settings dialogs
- keep mocked callback handlers local to the story or use shared no-op helpers
- do not subscribe directly to live stores unless the preview decorator intentionally provides the state

If a story needs store state, initialize only the minimum state that the component needs. Reset or
scope state through the existing Storybook decorator and shared test/story helpers rather than
leaking state between stories.

## Review Checklist

Before landing Storybook work, check:

- title is hierarchical and under an approved top-level root
- story is colocated with its component unless it is a deliberate aggregate or UI-kit concept story
- primitive and pattern stories import local source files directly
- docs examples use `@/app/ui-kit/*` when a stable shared export exists
- component has coverage for all relevant themes, sizes, and interaction states
- mobile and wall-display viewports do not introduce text overflow or overlapping controls
- visual effects remain reasonable for tablet and dashboard-class hardware
- feature stories do not import across another feature's internal folders

## Commands

Use these commands for Storybook work:

```bash
pnpm storybook
pnpm storybook:build
pnpm check:stories
pnpm test:storybook
```

`pnpm check:stories` is the required fast validation for story title conventions, primitive/pattern
story coverage, and colocated story ownership. Run it after adding stories, moving stories, or
changing Storybook taxonomy.

## Maintenance

Keep this page aligned with:

- `design-system/README.md`
- `.storybook/preview.tsx`
- `scripts/check-storybook-standards.mjs`
- `src/app/ui-kit/*.stories.tsx`

Last updated: May 25, 2026
