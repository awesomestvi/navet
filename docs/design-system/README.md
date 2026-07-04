# Navet Design System

This folder documents Navet's shared UI layers, stable export surfaces, and Storybook review model.

Navet does not publish a separate design-system package. The design system is an in-repo set of
authoring layers and curated export surfaces.

Architecture note:

- `@navet/ui` is the target provider-neutral shared UI package boundary.
- The current shared UI authoring surface is still mostly app-owned under
  `packages/app/src/components/*` and `packages/app/src/ui-kit/*`.
- Treat those app-owned paths as current implementation locations and migration seams while the
  extraction to `@navet/ui` remains in progress.

## Current Shared UI Layers

### `packages/app/src/components/primitives/`

Current low-level reusable UI building blocks with small APIs and narrow responsibilities.

### `packages/app/src/components/patterns/`

Current composed shared UI structures built from primitives.

### `packages/app/src/components/shared/`

App-specific shared UI and dashboard-specific helpers that are still too coupled or stateful to be
honest primitives or generic patterns.

### `packages/app/src/components/system/`

Curated internal export surface for stable primitives, patterns, and token helpers.

This is not the default authoring location for new shared UI.

### `packages/app/src/ui-kit/`

Stable docs and Storybook import surface for shared primitives, patterns, and tokens.

When docs or stories need a stable shared import path, prefer `@navet/app/ui-kit/*`.

### `packages/ui/src/`

Target package boundary for provider-neutral shared UI exports.

Today this package remains intentionally small, so many shared UI authoring decisions still happen
in the app-owned layers above.

## Storybook Role

Storybook is the main review surface for:

- shared primitives and patterns
- stable feature card behavior
- theme and token review
- UI-kit discovery stories
- layout and section composition examples

## Rules

- distinguish current implementation from target package ownership in docs and reviews
- author current generic shared UI in `primitives/` or `patterns/` unless the work is explicitly
  extracting shared UI into `@navet/ui`
- use `shared/` only when the component is still app-specific, dashboard-specific, or
  runtime-coupled
- expose mature shared pieces through `components/system/` and `ui-kit/`
- prefer `@navet/ui` as the long-term destination for provider-neutral shared UI
- keep feature logic and provider-specific behavior out of generic shared UI
- keep docs aligned with the current repo structure, not historical paths

## Related Docs

- [AI-DESIGN-CONTEXT.md](AI-DESIGN-CONTEXT.md)
- [FEATURES.md](FEATURES.md)
- [UI-GUIDELINES.md](UI-GUIDELINES.md)
- [../STORYBOOK_WORKFLOW.md](../STORYBOOK_WORKFLOW.md)
