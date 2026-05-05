# Navet Design System

This folder documents the shared UI rules that govern Navet's dashboard, cards, settings surfaces,
theme behavior, and Storybook workshop.

Navet does not ship the design system as a separate package. The current model is an in-repo shared
UI layer backed by:

- authoring in `src/app/components/primitives/` and `src/app/components/patterns/`
- curated exports and token stories in `src/app/components/system/`
- canonical discovery stories in `src/app/ui-kit/`
- shared theme/surface decisions in `src/app/components/shared/theme/`
- Storybook as the main visual review and docs surface

## When To Use These Docs

Use this folder when you are:

- building or revising shared UI
- changing card shells, compact card behavior, or card sizing rules
- reorganizing Storybook taxonomy or shared exports
- touching theme tokens, surface logic, readable-text helpers, or appearance controls
- deciding whether a component belongs in `primitives`, `patterns`, `shared`, `layout`, or a feature module

## Core Principles

1. Shared primitives first. Reuse or extend a shared primitive before building feature-local UI.
2. Patterns over duplication. If the same structure appears across cards or dialogs, extract it.
3. `system/` is a curated export layer, not the default authoring location for new components.
4. Feature logic stays in the feature. Shared UI should stay portable and minimally coupled.
5. Performance matters. Visual richness cannot make the app unusable on tablets or wall panels.
6. Storybook is the workshop. Stable UI changes should be reviewable there, not only in app pages.
7. Vitest covers logic seams. Shared utilities, controller logic, and stateful helpers need unit tests when visual review is not enough.

## Documentation Set

- [UI-GUIDELINES.md](UI-GUIDELINES.md): visual rules, accessibility, motion, and performance constraints
- [FEATURES.md](FEATURES.md): current feature inventory, ownership map, and test/story coverage
- [STORYBOOK_FOUNDATION.md](STORYBOOK_FOUNDATION.md): Storybook structure and review workflow
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
- card-header building blocks
- compact body text
- loading and status elements

Use `primitives/` when:

- the UI can be reused across multiple features
- the API can stay small and stable
- the component is not tightly coupled to app stores or Home Assistant state

### `src/app/components/patterns/`

Composed shared structures built from primitives.

Examples:

- empty states
- section cards
- action rows
- preview cards
- grouped settings content
- reusable field and row structures

Use `patterns/` when the reusable value is the composition or intent, not only the visual shape.

### `src/app/components/shared/`

App-specific shared UI that is still too coupled, stateful, or migration-heavy to be a true
primitive or pattern.

This is also the landing zone for compatibility shims and shared theme helpers that are not meant
to become first-class design-system exports.

### `src/app/components/system/`

Curated public exports and token-story surfaces for mature shared pieces.

Use `system/` to expose or document stable shared UI. Do not author new components there by default.

### `src/app/components/layout/`

App-shell and section-level layout composition for navigation, room controls, headers, and
domain-focused entity sections.

Current layout ownership includes:

- header and sidebar shell pieces
- room navigation and room-order editing
- mobile command/search/section sheets
- device-section shells such as locks, media, and security
- section customization controls

Use `layout/` when the component owns app structure or cross-feature section composition rather than
portable primitive behavior.

### `src/app/ui-kit/`

This is the curated Storybook-facing discovery layer for stable primitives, patterns, and tokens.

Current entrypoints include:

- `primitives.ts`
- `patterns.ts`
- `tokens.ts`
- `start-here.stories.tsx`
- `inventory.stories.tsx`
- `recipes.stories.tsx`

Use this layer for discovery and workshop organization, not as a replacement for the underlying
authoring directories.

## Foundations and Tokens

The first-layer shared foundations live in
[`src/app/components/system/tokens/foundations.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/system/tokens/foundations.ts).

This file is the common source for:

- spacing scales
- typography roles
- radius choices
- icon sizing
- stroke widths
- focus treatments
- semantic tone values

When a primitive needs one of these decisions, prefer foundation tokens instead of introducing
one-off Tailwind values.

Current policy:

- `4px` is the base rhythm for shared spacing and sizing
- semantic tokens are the authoring layer for components
- primitive token values should mainly exist to define higher-level semantic tokens

## Themes and Surface Rules

Navet supports four themes:

- `glass`
- `dark`
- `light`
- `black`

Shared surface decisions should resolve through helpers in
[`src/app/components/shared/theme/`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/theme), especially:

- `theme-surface-tokens`
- `card-shell-surface-tokens`
- `card-state-surface-tokens`
- `light-card-surface-tokens`
- `card-readable-text-tokens`
- `entity-icon-pill-styles`

Avoid adding inline `theme === ...` branches when an existing token helper already covers the case.

## Card System

The canonical size registry lives in
[`src/app/components/shared/card-size-selector.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size-selector.tsx).

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
- use shared card-state styling instead of per-feature opacity hacks
- keep compact layouts lean and avoid duplicate controls across rows
- do not map card behavior to external platform widget systems

## Dialog and Settings Patterns

Entity settings dialogs should compose from shared building blocks before inventing feature-local
shells.

Current shared dialog primitives and patterns include:

- `CardDialogHeader`
- `CardDialogSection`
- `CardDialogTabList`
- `CardDialogTabTrigger`
- `DialogShell`
- `DialogDoneFooter`
- `DialogFooter`
- `SettingsDialogDoneButton`
- `EntityCardHeader`
- `SelectableCheckboxRow`

The exact composition may vary by feature, but room assignment, tabbed content, section spacing,
and close/done affordances should stay aligned across cards and settings sections.

## Storybook Workflow

Storybook is the main design-system review surface.

Use:

```bash
pnpm storybook
pnpm storybook:build
pnpm check:stories
```

Storybook currently covers:

- foundation tokens
- shared primitives and patterns
- app-shell components
- layout-level shells and navigation surfaces
- entity cards
- dashboard widgets
- energy visuals
- settings sections

Cross-feature story helpers live in
[`src/app/storybook/`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook). Import frame
helpers from `@/app/storybook/story-frames`.

## Testing Shared UI Logic

Storybook remains the primary review surface for visual behavior, but shared UI logic should use
the Vitest harness when it includes non-trivial state, timing, browser integration, or selector-heavy
behavior.

Shared test support lives in:

- [`src/setupTests.ts`](/Users/vishal/Development/Github/Navet/Navet/src/setupTests.ts)
- [`src/test/render.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/test/render.tsx)
- [`src/test/store-reset.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/store-reset.ts)
- [`src/test/browser-mocks.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/browser-mocks.ts)
- [`src/test/factories/home-assistant-service-stub.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/factories/home-assistant-service-stub.ts)

Use unit tests for:

- shared utility logic
- persisted store behavior
- controller hooks
- browser-dependent hooks
- token and mapping helpers with meaningful branching

## Maintenance Expectations

- Update these docs when shared UI ownership, token helpers, or Storybook structure changes
- Update [FEATURES.md](FEATURES.md) when the product surface, section ownership, or test coverage map changes
- Prefer documenting current layers and rules over preserving historical phrasing
