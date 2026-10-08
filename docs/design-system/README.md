# Navet design system

Map of shared UI authoring, stable exports and review surfaces. Root `AGENTS.md` owns authority;
code and stories are implementation evidence.

## Guidance Ownership

| Need | Owner |
| --- | --- |
| UI task discovery and acceptance | [UX guide](../../ai/skills/navet-ux.md) |
| Visual/interaction implementation rules | [UI guidelines](UI-GUIDELINES.md) |
| Source exports, props and Storybook discovery | [AI design discovery](AI-DESIGN-CONTEXT.md) |
| Composition behavior and templates | [Composition recipes](AGENT-COMPOSITION-RECIPES.md) |
| Recipe metadata and publication | [Registry](REGISTRY.md) |
| Feature ownership | [Feature map](FEATURES.md) |
| Story authoring | [Storybook workflow](../STORYBOOK_WORKFLOW.md) |

Use the target screen's component family first; Home is the fallback for dashboard rhythm and
density. Resolve conflicting guidance through the root authority order, checking whether current
code is an intended pattern, a compatibility seam or drift.

## Current Shared UI Layers

Paths below `packages/app/src` remain current authoring seams; `@navet/ui` is the incremental
provider-neutral target. Move code only within an explicitly scoped extraction.

| Path | Responsibility |
| --- | --- |
| `packages/app/src/components/primitives/` | Generic low-level controls and surfaces |
| `packages/app/src/components/patterns/` | Generic compositions of primitives |
| `packages/app/src/components/shared/` | App/dashboard-specific or runtime-coupled shared UI |
| `packages/app/src/components/system/` | Curated exports of mature shared pieces; author in primitives/patterns |
| `packages/app/src/ui-kit/` | Stable docs/story imports: `@navet/app/ui-kit/*` |
| `packages/ui/src/` | Target shared provider-neutral package; currently small |

Keep feature state and provider behavior out of generic UI. Distinguish current paths, stable
imports and target ownership in changes and reviews.

## Card Dialog Navigation

`BaseCardDialog`'s card variant defaults to overflow navigation: first `tabs` entry holds daily
controls; remaining entries appear in **More actions**, with **Back to controls**. Reopening
returns to controls. `CardDialogOverflowMenu` owns menu placement and actions.

Available callbacks/context add **Edit room**, **Edit card name**, the native entity ID for device
dialogs and destructive removal through `onRemoveCard`/optional `removeCardLabel`.
`BaseCardDialogWithState` shares this navigation for controls, customization and added sections.
Features supply content/callbacks; use secondary sections for management and configuration.
Inspect the [controls-first recipe](AGENT-COMPOSITION-RECIPES.md#controls-first-dialog).

## Storybook Role

Review primitives, patterns, feature interactions, themes/tokens and section compositions in
Storybook. The registry manifest feeds UI-kit recipe discovery and executable template stories;
inspect source-derived APIs and review status before composing. Stories establish only their
rendered cases, not a connected workflow or maintainer design acceptance.
