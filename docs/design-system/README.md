# Navet Design System

This folder documents Navet's shared UI layers, stable export surfaces, and Storybook review model.

The design system consists of repository authoring layers and curated export surfaces.

## Guidance Ownership

- [`UI-GUIDELINES.md`](UI-GUIDELINES.md) is the canonical visual and interaction standard.
- [`AI-DESIGN-CONTEXT.md`](AI-DESIGN-CONTEXT.md) is the compact pre-implementation packet; it must
  stay consistent with the full guidelines.
- [`../../ai/skills/navet-ux.md`](../../ai/skills/navet-ux.md) is the operational workflow an agent
  follows for a UI task.
- Storybook and the current product are implementation evidence. A target screen's immediate
  component family is the first visual reference; Home is the fallback reference for dashboard
  spacing, section rhythm, density, and responsive behavior.

If these disagree, investigate whether the code is an intentional current pattern, a compatibility
seam, or stale implementation. Do not create a fourth interpretation in feature-local code.

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

## Component Maturity

The [component maturity inventory](component-maturity.json) records inspected canonical components,
their coupling and supporting source/story references. Run `pnpm agent:components <name>` to see
this guidance beside the actual API. The current inventory classifies nine app-coupled components;
other exports remain unclassified. Importability and passing isolated examples do not establish
complete visual or accessibility coverage. Review the affected runtime states before accepting UI.

## Card Dialog Navigation

Card settings use `BaseCardDialog`, whose card variant defaults to overflow navigation. The first entry in `tabs`
contains the everyday controls; remaining entries are destinations in **More actions**. Each
secondary section includes **Back to controls**. Closing and reopening returns to the first section.

The shared `CardDialogOverflowMenu` pattern owns the menu placement and actions. The dialog adds
**Edit room** when an entity or editable widget room is available, **Edit card name** when the
name can be saved, and the provider's native entity ID for device dialogs. A supplied
`onRemoveCard` callback exposes a destructive action with an optional `removeCardLabel`.

`BaseCardDialogWithState` uses this navigation for controls, customization, and additional
sections. Feature dialogs provide their content and callbacks without building a second menu.
Keep live state and common device actions in the first section; use secondary sections for
configuration, optional details, and card management.

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
