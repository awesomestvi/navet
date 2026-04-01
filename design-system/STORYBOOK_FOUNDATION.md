# Storybook Foundation

Navet should grow an internal component workshop before it grows a package workspace.

## Recommendation

- Keep Navet in a single repo for now.
- Build on an internal design-system layer under `src/app/components/system/`.
- Run Storybook in this repo instead of splitting into a package workspace.
- Delay a monorepo or package split until there is more than one real consumer.

## Why This Direction

- Navet already has reusable UI primitives, but they are spread across shared and feature folders.
- Storybook will help us design onboarding, settings, empty states, heroes, cards, and pills in isolation.
- A monorepo would add package, build, and versioning overhead before there is a concrete multi-app need.

## Current Setup

- Start Storybook with `pnpm storybook`
- Build the static Storybook bundle with `pnpm storybook:build`
- Storybook preview wiring reuses Navet's existing theme and settings stores so components render inside real theme context

## Story File Placement

Stories are co-located next to the component they document:

- `src/app/components/shared/*.stories.tsx` — shared primitives and patterns
- `src/app/components/shared/theme/*.stories.tsx` — token documentation
- `src/app/components/layout/*.stories.tsx` — app shell components
- `src/app/components/ui/*.stories.tsx` — base Radix UI wrappers
- `src/app/features/<feature>/components/**/*.stories.tsx` — feature cards and dialogs

Aggregate stories with no single component owner (catalog, all-sizes, state matrices) live in `src/app/features/dashboard/stories/`.

## Internal System Structure

The code foundation now groups stable exports into three buckets:

- `src/app/components/system/primitives/`
  - low-level reusable UI pieces such as pills, empty states, shell dialogs, swatches, and shared card header parts
- `src/app/components/system/patterns/`
  - composed UI sections such as heroes, empty-state layouts, and preview frames
- `src/app/components/system/tokens/`
  - theme surface helpers, accent shell treatments, color helpers, and style calculators

These folders re-export existing stable components. They do not duplicate implementations.

## Story Hierarchy

Stories are organised into a consistent top-level hierarchy:

- `Foundation/` — design system layer: tokens, primitives, and composed patterns
  - `Foundation/Tokens/` — theme surface helpers, accent shell treatments, style calculators
  - `Foundation/Primitives/` — pills, buttons, swatches, headers, shells
  - `Foundation/Patterns/` — hero sections, empty-state layouts, preview frames
  - `Foundation/Overview` — cross-token/primitive overview
- `Components/` — app-level UI components
  - `Components/Base/` — Radix UI wrappers (buttons, dialogs, selects …)
  - `Components/Shared/` — cross-feature primitives (card sizing, action rows, icon picker …)
- `App Shell/` — header, sidebar, room nav, notifications
- `Cards/` — all dashboard card types
  - `Cards/Overview/` — catalog, all-sizes matrix, state matrix
  - `Cards/Entity/` — one story per HA entity domain (light, switch, climate …)
  - `Cards/Widget/` — custom cards (action, photo frame, RSS, quick note …)
- `Dashboard/` — add-card dialog, edit actions, onboarding dialog
- `Settings/` — settings UI
  - `Settings/Sections/` — full section panels
  - `Settings/Dialogs/` — per-entity settings dialogs (light, HVAC, weather …)
- `Energy/` — charts and widgets for the energy feature

## Story Rules

- Every story should render in all four themes where possible.
- Every interactive component should show idle, hover, active, disabled, and selected states.
- Every pattern should have mobile and desktop variants.
- Prefer real Navet copy and spacing tokens over synthetic examples.
- Keep feature-specific data loaders and Home Assistant wiring out of stories.

## When To Split Into Packages

Only move to a package workspace if one of these becomes true:

- Navet has multiple apps consuming the same UI system
- The UI system needs independent release/versioning
- Build and ownership boundaries become painful in one package

Until then, Storybook plus `src/app/components/system/` is the simpler path.
