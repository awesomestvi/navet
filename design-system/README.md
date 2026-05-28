# Navet Design System

This folder documents Navet's shared UI layers, stable export surfaces, and Storybook review model.

Navet does not publish a separate design-system package. The design system is an in-repo set of
authoring layers and curated export surfaces.

## Current Shared UI Layers

### `src/app/components/primitives/`

Low-level reusable UI building blocks with small APIs and narrow responsibilities.

### `src/app/components/patterns/`

Composed shared UI structures built from primitives.

### `src/app/components/shared/`

App-specific shared UI and dashboard-specific helpers that are still too coupled or stateful to be
honest primitives or generic patterns.

### `src/app/components/system/`

Curated internal export surface for stable primitives, patterns, and token helpers.

This is not the default authoring location for new shared UI.

### `src/app/ui-kit/`

Stable docs and Storybook import surface for shared primitives, patterns, and tokens.

When docs or stories need a stable shared import path, prefer `@/app/ui-kit/*`.

## Storybook Role

Storybook is the main review surface for:

- shared primitives and patterns
- stable feature card behavior
- theme and token review
- UI-kit discovery stories
- layout and section composition examples

## Rules

- author new generic shared UI in `primitives/` or `patterns/`
- use `shared/` only when the component is still app-specific, dashboard-specific, or
  runtime-coupled
- expose mature shared pieces through `components/system/` and `ui-kit/`
- keep feature logic and provider-specific behavior out of generic shared UI
- keep docs aligned with the current repo structure, not historical paths

## Related Docs

- [FEATURES.md](FEATURES.md)
- [UI-GUIDELINES.md](UI-GUIDELINES.md)
- [../docs/STORYBOOK_WORKFLOW.md](../docs/STORYBOOK_WORKFLOW.md)
