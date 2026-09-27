# Shared Components

`shared/` contains cross-feature app UI with app-specific state, behavior, or composition.

## Intentional Shared Residents

These components share app-specific structure or behavior across features.

- `card-settings-action-button.tsx`
  Card-specific wrapper around `RoundControlButton` with dashboard/card-edit semantics.

- `card-action-control-sizes.ts`
  Shared card action sizing constants for dashboard edit controls.

- `card-edit-action-button.tsx`
  Positioning and sizing helper for editable dashboard cards.

- `card-content-layout.tsx`
  App-specific metric/action layout shared by several entity cards.

- `card-error-boundary.tsx`
  Dashboard card failure containment for app-owned card surfaces.

- `card-size-selector.tsx`
  Dashboard card editing control, not a generic primitive.

- `card-size.ts`
  Dashboard card size registry, rendered footprint helpers, and shared card grid metrics.

- `dnd-transform-style.ts`
  Drag-and-drop transform helper for dashboard card ordering.

- `edit-card-controls.ts`
  Shared edit-control placement and styling helpers for dashboard cards.

- `entity-card-interaction-controller.ts`
  App-level entity-card interaction policy for toggle-first, controls-first, and settings flows.

- `entity-room-selector.tsx`
  Shared UI, but directly coupled to app-level room/layout state and compatibility seams.

- `error-display.tsx`
  Bound to the global error store and app-level recovery behavior.

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

- `theme/`
  Shared app surface-token and theme helper layer. These helpers are reused broadly but remain
  coupled to Navet's app theme model rather than being generic primitives.

- `device-editor/`
  Shared app composition layer for settings and editor flows. Reuses primitives internally, but
  the module as a whole is still an app-level toolkit rather than a primitive or pattern family.

## Rule of Thumb

- If a file depends on app stores, service calls, release metadata, dashboard edit semantics, or
  app-owned compatibility seams, it can stay in `shared/`.
- If a file becomes a stable source of reusable structure with a clear single responsibility, move
  it to `primitives/` or `patterns/` and update its imports.
