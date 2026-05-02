# Storybook Foundation

Navet should grow an internal component workshop before it grows a package workspace.

## Recommendation

- Keep Navet in a single repo for now.
- Build on an internal design-system layer under `src/app/components/system/`.
- Treat Storybook as the official developer-facing UI-kit surface.
- Run Storybook in this repo instead of splitting into a package workspace.
- Delay a monorepo or package split until there is more than one real consumer.

## Why This Direction

- Navet already has reusable UI primitives, but they are spread across shared and feature folders.
- Storybook will help us design onboarding, settings, empty states, heroes, cards, and pills in isolation.
- A monorepo would add package, build, and versioning overhead before there is a concrete multi-app need.

## Current Setup

- Start Storybook with `pnpm storybook`
- Build the static Storybook bundle with `pnpm storybook:build`
- Validate title conventions, primitive/pattern story coverage, and colocated story ownership with `pnpm check:stories`
- Storybook preview wiring reuses Navet's existing theme and settings stores so components render inside real theme context
- Storybook manager UI, docs pages, and canvas default to dark mode
- Token stories should document all four Navet themes: glass, dark, light, and black

## Story File Placement

Stories are co-located next to the component they document:

- `src/app/components/primitives/*.stories.tsx` — low-level reusable UI primitives
- `src/app/components/patterns/*.stories.tsx` — composed shared UI patterns
- `src/app/components/shared/*.stories.tsx` — app-specific shared UI and remaining compatibility-era stories
- `src/app/components/shared/theme/*.stories.tsx` — token documentation
- `src/app/components/layout/*.stories.tsx` — app shell components
- `src/app/components/ui/*.stories.tsx` — base Radix UI wrappers
- `src/app/features/<feature>/components/**/*.stories.tsx` — feature cards and dialogs

Aggregate stories with no single component owner (catalog, all-sizes, state matrices) live in `src/app/features/dashboard/stories/`.

### Shared Story Utilities

Cross-feature story helper components (frame wrappers, noop callbacks, demo containers) live in `src/app/storybook/`:

- **`src/app/storybook/story-frames.tsx`** — `EntityCardStoryFrame`, `SettingsDialogStoryFrame`, `noopCardSizeChange`, `getEntityCardStoryFrameStyle`
- **`src/app/storybook/story-docs.ts`** — story-specific documentation strings for all Storybook pages

Import story utilities from `@/app/storybook/story-frames` in entity-card and settings-dialog stories. Do not place these helpers inside feature or dashboard subdirectories — that breaks the feature boundary rule (consumers outside the feature importing through an internal path).

## Internal System Structure

The code foundation now groups stable exports into three buckets:

- `src/app/components/primitives/`
  - low-level reusable UI pieces such as pills, shell dialogs, swatches, inputs, and shared card header parts
- `src/app/components/patterns/`
  - composed UI sections such as field wrappers, empty-state layouts, message bars, and preview cards
- `src/app/components/system/`
  - curated public export surface for Storybook navigation and cross-app discovery
- `src/app/ui-kit/`
  - canonical developer import surface for Navet UI
- `src/app/components/system/tokens/`
  - theme surface helpers, accent shell treatments, color helpers, and style calculators

Author shared UI in `primitives/` or `patterns/` first. Re-export stable pieces through `system/`.
For new usage and Storybook docs, prefer `@/app/ui-kit/*`.

## Story Hierarchy

Stories are organised into a stable top-level hierarchy that keeps the sidebar predictable as coverage grows:

- `Concepts/` — workshop entrypoints and overview stories
- `Theme/` — token, surface, typography, and theme-appearance documentation
- `Components/`
  - `Components/Primitives/` — reusable low-level building blocks, including wrapper UI (dialogs, dropdown, avatar, label, toast), grouped card primitives under `Components/Primitives/Cards/`, and nested button variants
  - `Components/Patterns/` — shared composed layouts and repeatable UI structures
  - `Components/Shared/` — cross-feature app-specific controls such as card sizing, room selection, icon picking, and status banners
- `App Shell/` — header, sidebar, notifications, room navigation, search, and section customization controls
- `Cards/`
  - `Cards/Overview/` — catalog, all-sizes matrix, and state matrices
  - `Cards/Entity/` — one story per HA entity domain
  - `Cards/Custom/` — custom/widget cards such as action, photo frame, RSS feed, quick note, and battery overview
- `Pages/`
  - `Pages/Dashboard/` — add-card dialog, edit actions, hero, and onboarding dialog
  - `Pages/Energy/Charts/` — charts and gauges
  - `Pages/Energy/Primitives/` — shells and workshop helpers
  - `Pages/Energy/Widgets/` — feature widgets
  - `Pages/Settings/` — settings sections and section-level previews

Storybook sorting is controlled centrally in `.storybook/preview.tsx`. Avoid inventing new top-level roots unless the workshop genuinely has a new product area.

## Token Story Notes

### Accent Card Shell

- Story file: `src/app/components/shared/theme/accent-card-shell-tokens.stories.tsx`
- Story title: `Theme/Cards/Accent Card Shell`
- Covers all four themes: glass, dark, light, and black
- Demonstrates the output of `getAccentCardShellTokens(theme, accent)`
- Uses `getCardReadableTextTokens(...)` for tinted dark, glass, and black rows so text contrast follows the same readable-text system used by production cards
- Light-theme rows intentionally keep stronger visible accent separation so accent families do not collapse into near-white cards

## Story Rules

- Every story should render in all four themes where possible.
- Every interactive component should show idle, hover, active, disabled, and selected states.
- Every pattern should have mobile and desktop variants.
- Every Storybook docs example should use `@/app/ui-kit/*` imports when a stable shared export exists.
- Prefer real Navet copy and spacing tokens over synthetic examples.
- Keep feature-specific data loaders and Home Assistant wiring out of stories.
- Co-locate the story with the component or feature it documents.
- Use hierarchical titles and keep them inside the approved top-level taxonomy.
- Use `pnpm check:stories` before landing reorganizations or new Storybook areas. It should catch title drift, missing primitive/pattern stories, and colocated stories that incorrectly import through the `system/` facade.

## When To Split Into Packages

Only move to a package workspace if one of these becomes true:

- Navet has multiple apps consuming the same UI system
- The UI system needs independent release/versioning
- Build and ownership boundaries become painful in one package

Until then, Storybook plus `src/app/ui-kit/` is the simpler path.
