# Navet Design System

This folder documents the shared UI rules that govern Navet's dashboard, cards, settings surfaces,
and Storybook workshop.

Navet does not treat the design system as a separate package. The current model is an in-repo
shared UI layer backed by:

- authoring in `src/app/components/primitives/` and `src/app/components/patterns/`
- curated exports in `src/app/components/system/`
- shared visual decisions in theme/token helpers
- Storybook as the review and documentation surface
- component layers: `primitives/`, `patterns/`, `system/`, `shared/`, `layout/`, `ui/`, `figma/`

## Scope

Use these docs when you are:

- building or revising shared UI
- changing card sizing or card-shell behavior
- changing section-level layouts for locks, lights, media, security, or home overview
- touching theme tokens, surface logic, or appearance controls
- reorganizing Storybook taxonomy or stable exports
- evaluating whether UI belongs in `primitives`, `patterns`, `shared`, or a feature module

## Core Principles

1. Shared primitives first. Reuse or extend a shared primitive before building feature-specific UI.
2. Patterns over duplication. If the same structure appears across cards or dialogs, extract it.
3. `system/` is a curated export layer, not the authoring location for new components.
4. Performance matters. Visual richness cannot make the app unusable on wall panels or tablets.
5. Storybook is the workshop. Stable shared UI should be reviewed there, not only in app pages.
6. Unit tests cover logic seams. Shared utilities, store behavior, and controller logic should be
   verified in Vitest rather than only through visual review.

## Documentation Set

- [UI-GUIDELINES.md](UI-GUIDELINES.md): visual rules, tokens, interaction behavior, accessibility
- [FEATURES.md](FEATURES.md): implementation map of the current product surface
- [STORYBOOK_FOUNDATION.md](STORYBOOK_FOUNDATION.md): workshop structure and Storybook rules
- [LAYOUT-STRUCTURE.md](LAYOUT-STRUCTURE.md): app-shell and layout architecture
- [MOODBOARD.md](MOODBOARD.md): visual direction and references

## Shared UI Layers

### `src/app/components/primitives/`

Low-level reusable pieces with a narrow responsibility.

Examples:

- buttons
- inputs
- selectors
- card shells
- dialog shells
- pills
- card header parts
- compact body text
- loading and status elements

Use `primitives/` when:

- the UI can be reused across multiple features
- the API can stay small and stable
- the component is not tightly coupled to app stores or Home Assistant state

### `src/app/components/patterns/`

Composed shared structures built from primitives.

Examples:

- dialog sections
- field/group wrappers
- empty states
- preview cards
- action rows
- selectable checkbox rows

Use `patterns/` when reuse comes from intent and structure, not just visual similarity.

### `src/app/components/shared/`

App-specific shared UI that is still too coupled, stateful, or composition-heavy to be a real
primitive or pattern.

This is also the temporary home for compatibility shims when a migration is in progress.

### `src/app/components/system/`

Curated public exports for Storybook and stable discovery.

Use `system/` to re-export mature shared pieces. Do not author new components there by default.

### `src/app/components/layout/`

App-shell and section-level layout composition for navigation, room controls, and domain-focused
entity sections.

This layer now includes reusable section shells such as:

- `DeviceSectionLayout` for consistent empty-state and edit-mode handling
- `EntityGrid` for grouped section content
- specialized section modules for locks, media, and security

Use `layout/` when the component owns app-level structure or cross-feature section composition,
not when it is a portable primitive or feature-local card.

## Foundations and Tokens

The shared first-layer foundations live in
[`src/app/components/system/tokens/foundations.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/system/tokens/foundations.ts).

Navet's design system is platform-neutral. Do not use iOS `pt`, Android `dp`, or desktop logical px
as the design-system foundation. Those are implementation units. Navet's foundation is the shared
token layer plus the current responsive helpers.

This file is the common source for:

- spacing scales
- typography roles
- radius choices
- icon sizing
- stroke widths
- focus treatments
- shared semantic tone values

When a primitive needs one of these decisions, prefer the foundation tokens instead of introducing
one-off Tailwind values.

Current policy:

- `4px` is the base rhythm for shared spacing and sizing
- semantic tokens are the authoring layer for components
- primitive tokens should mainly be used to define higher-level semantic tokens

## Density and Adaptation

Navet adapts across width and input capability rather than inheriting a single platform's sizing
system.

Default policy:

- `comfortable` is the default density for general product surfaces
- `touch` is for touch-first, coarse-pointer, kiosk-style, and wall-panel contexts
- `compact` is reserved for desktop or keyboard/mouse-heavy surfaces where denser UI materially
  improves scanning or editing

Do not default to `compact` on mixed-input devices. If a screen may be tapped regularly, prefer
`comfortable` unless there is a strong product reason to go larger.

Responsive policy:

- width determines layout structure, column count, and how much content can appear at once
- input capability determines control targets, spacing comfort, and hover assumptions
- hover may supplement discoverability on fine-pointer screens, but primary actions must remain
  visible and obvious without hover on coarse-pointer screens

## Themes and Surface Rules

Navet supports four themes:

- `glass`
- `dark`
- `light`
- `black`

Shared surface decisions should resolve through token helpers such as:

- `theme-surface-tokens`
- `card-state-surface-tokens`
- `card-shell-surface-tokens`
- `accent-card-shell-tokens`
- readable-text helpers for tinted surfaces

Avoid adding inline `theme === ...` branches when an existing surface/token helper already covers
the case.

## Card System

Card sizes are defined through a single registry in
[`src/app/components/shared/card-size-selector.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size-selector.tsx)
with the `CardSize` type in
[`src/app/components/shared/card-size.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size.ts).

Supported sizes:

| Size | Logical footprint |
|---|---|
| `tiny` | `0.5 x 0.5` |
| `extra-small` | `1 x 0.5` |
| `small` | `1 x 1` |
| `medium` | `2 x 1` |
| `medium-vertical` | `1 x 2` |
| `large` | `2 x 2` |
| `extra-large` | `3 x 2` |

Rules:

- derive preview and overlay behavior from the shared registry
- reuse shared title/header primitives for compact cards
- use shared off/inactive card-state styling instead of per-feature opacity tricks
- keep compact layouts lean and avoid duplicate controls across rows
- do not map card behavior to imported iOS widget dimensions or platform-specific shell sizes

## Dialog and Settings Patterns

Entity settings dialogs should compose from shared building blocks before inventing feature-local
shells:

- `DialogShell`
- `CardDialogHeader`
- `CardDialogSection`
- `CardDialogTabList`
- `CardDialogTabTrigger`
- `DialogSectionRow`
- `DialogDoneFooter`
- `SelectableCheckboxRow`

This keeps room assignment, controls tabs, helper text spacing, selection rows, and close/done
affordances aligned across light, HVAC, weather, calendar, vacuum, camera, and switch flows.

## Storybook Workflow

Storybook is the main design-system review surface.

Use:

```bash
pnpm storybook
pnpm storybook:build
pnpm check:stories
```

Storybook covers:

- foundation tokens
- shared primitives and patterns
- app shell components
- layout-level shells and navigation surfaces
- entity cards and custom widgets
- dashboard flows
- energy visuals
- settings surfaces

Cross-feature story utilities live in
[`src/app/storybook/`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook).
Import frame helpers from `@/app/storybook/story-frames`.

## Testing Shared UI Logic

Storybook remains the primary review surface for visual behavior, but shared UI logic should use
the Vitest harness when it includes non-trivial state, timing, store subscriptions, or browser
integration.

Shared unit-test support lives in:

- [`src/setupTests.ts`](/Users/vishal/Development/Github/Navet/Navet/src/setupTests.ts)
- [`src/test/render.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/test/render.tsx)
- [`src/test/browser-mocks.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/browser-mocks.ts)
- [`src/test/store-reset.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/store-reset.ts)

Use unit tests for:

- token and helper logic with meaningful branching
- shared hooks that depend on timers, viewport/media-query state, or persisted browser state
- controller logic that composes store selectors and action handlers
- setup helpers that score, infer, or merge feature configuration state

Do not default to broad snapshot coverage for thin visual wrappers that are already exercised in
Storybook.

## Current Storybook Taxonomy

- `Concepts/`
- `Theme/`
- `Components/Primitives/`
- `Components/Patterns/`
- `Components/Shared/`
- `App Shell/`
- `Cards/`
- `Pages/Dashboard/`
- `Pages/Energy/`
- `Pages/Settings/`

Avoid inventing new top-level groups unless the workshop genuinely has a new product area.

## Key Files

| File | Purpose |
|---|---|
| [`src/app/components/README.md`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/README.md) | Component layer boundaries |
| [`src/app/components/shared/README.md`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/README.md) | `shared/` ownership rules |
| [`src/app/components/system/tokens/foundations.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/system/tokens/foundations.ts) | Foundation tokens |
| [`src/app/components/shared/theme/theme-surface-tokens.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/theme/theme-surface-tokens.ts) | Shared surface decisions |
| [`src/app/components/shared/card-size-selector.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size-selector.tsx) | Card size registry |
| [`src/app/storybook/story-frames.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook/story-frames.tsx) | Shared Storybook frame helpers |
| [`src/app/storybook/story-docs.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook/story-docs.ts) | Story descriptions |

## Review Checklist

Before landing shared UI changes:

- Does this belong in `primitives/`, `patterns/`, `shared/`, or a feature module?
- Does an existing token or surface helper already solve the theme decision?
- Does the component stay performant on low-power devices?
- Does Storybook need to be updated to document the change?
- Does the change affect card sizing, dialog composition, or stable exports?

Last updated: April 29, 2026
