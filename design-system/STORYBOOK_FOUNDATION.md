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
- Keep the first wave of stories focused on `src/app/components/system/`
- Storybook preview wiring reuses Navet's existing theme and settings stores so components render inside real theme context

## Internal System Structure

The code foundation now groups stable exports into three buckets:

- `src/app/components/system/primitives/`
  - low-level reusable UI pieces such as pills, empty states, shell dialogs, swatches, and shared card header parts
- `src/app/components/system/patterns/`
  - composed UI sections such as heroes, empty-state layouts, and preview frames
- `src/app/components/system/tokens/`
  - theme surface helpers, accent shell treatments, color helpers, and style calculators

These folders re-export existing stable components. They do not duplicate implementations.

## Storybook Scope

Start Storybook with only the system layer.

Recommended story groups:

- `Primitives/Pills`
- `Primitives/Buttons`
- `Primitives/Swatches`
- `Primitives/Headers`
- `Patterns/Hero`
- `Patterns/Empty State`
- `Patterns/Onboarding Step`
- `Patterns/Settings Preview`
- `Tokens/Theme Surfaces`

## First Components To Document

- `InteractivePill`
- `RoundControlButton`
- `ColorInputSwatch`
- `EntityCardTitleBlock`
- `DashboardHeroSection`
- `DashboardEmptyState`
- `InteractionPreviewCard`

## Current Stories

- `Primitives/Interactive Pill`
- `Primitives/Color Input Swatch`
- `Primitives/Round Control Button`
- `Patterns/Dashboard Hero Section`
- `Patterns/Interaction Preview Card`

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
