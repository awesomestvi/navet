# Shared Components

`shared/` now has two distinct jobs:

- Compatibility shims
  Thin re-export files that preserve old import paths while the codebase migrates to
  `src/app/components/primitives/` and `src/app/components/patterns/`.

- Intentional shared app UI
  Reused cross-feature pieces that are still too app-specific, stateful, or composition-heavy to
  be honest primitives or patterns.

## Compatibility Shims

These files are not the source of truth anymore. New imports should point at `primitives/` or
`patterns/` directly.

- `interactive-pill.tsx` -> `primitives/interactive-pill.tsx`
- `round-control-button.tsx` -> `primitives/round-control-button.tsx`
- `dialog-shell.tsx` -> `primitives/dialog-shell.tsx`
- `entity-card-title-block.tsx` -> `primitives/entity-card-title-block.tsx`
- `entity-card-header.tsx` -> `primitives/entity-card-header.tsx`
- `entity-card-header-icon.tsx` -> `primitives/entity-card-header-icon.tsx`
- `color-input-swatch.tsx` -> `primitives/color-input-swatch.tsx`
- `loading-spinner.tsx` -> `primitives/loading-spinner.tsx`
- `theme-dropdown-content.tsx` -> `primitives/theme-dropdown-content.tsx`
- `interaction-preview-card.tsx` -> `patterns/interaction-preview-card.tsx`
- `settings-live-preview-frame.tsx` -> `patterns/settings-live-preview-frame.tsx`
- `tiny-action-card.tsx` -> `patterns/tiny-action-card.tsx`
- `card-action-row.tsx` -> `patterns/card-action-row.tsx`
- `empty-state.tsx` -> `patterns/empty-state.tsx`
- `inline-empty-state.tsx` -> `patterns/inline-empty-state.tsx`

## Intentional Shared Residents

These still belong in `shared/` for now because their reuse comes with app-specific structure or
behavior.

- `card-settings-action-button.tsx`
  Card-specific wrapper around `RoundControlButton` with dashboard/card-edit semantics.

- `card-edit-action-button.tsx`
  Positioning and sizing helper for editable dashboard cards.

- `card-size-selector.tsx`
  Dashboard card editing control, not a generic primitive.

- `entity-room-selector.tsx`
  Shared UI, but directly coupled to Home Assistant area/entity registries and update flows.

- `error-display.tsx`
  Bound to app error context and global recovery behavior.

- `network-status-banner.tsx`
  Bound to app connectivity state and app-shell placement.

- `app-release-badge.tsx`
  Tied to release/version logic, not generic UI.

- `pwa-update-prompt.tsx`
  App-specific install/update behavior.

- `render-profiler.tsx`
  Development/performance utility, not shared product UI.

- `tiny-card-watermark.tsx`
  Card-specific visual helper that is still intentionally narrow.

- `device-editor/`
  Shared app composition layer for settings and editor flows. Reuses primitives internally, but
  the module as a whole is still an app-level toolkit rather than a primitive or pattern family.

## Rule of Thumb

- If a file is a compatibility shim, prefer updating imports instead of extending the shim.
- If a file depends on app stores, service calls, release metadata, dashboard edit semantics, or
  Home Assistant-specific workflows, it can stay in `shared/`.
- If a file becomes a stable source of reusable structure with a clear single responsibility, move
  it to `primitives/` or `patterns/` and leave a compatibility shim behind only when needed.
