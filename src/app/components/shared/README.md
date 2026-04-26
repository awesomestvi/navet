# Shared Components

`shared/` now has one primary job:

- Intentional shared app UI
  Reused cross-feature pieces that are still too app-specific, stateful, or composition-heavy to
  be honest primitives or patterns.

## Compatibility Shims

There are currently no active compatibility-shim files in this folder.

If we ever need a temporary migration shim again, keep it thin, document it here, and remove it
once production imports have been updated.

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

- `device-editor/`
  Shared app composition layer for settings and editor flows. Reuses primitives internally, but
  the module as a whole is still an app-level toolkit rather than a primitive or pattern family.

## Rule of Thumb

- If a temporary compatibility shim is introduced, prefer updating imports instead of extending the shim.
- If a file depends on app stores, service calls, release metadata, dashboard edit semantics, or
  Home Assistant-specific workflows, it can stay in `shared/`.
- If a file becomes a stable source of reusable structure with a clear single responsibility, move
  it to `primitives/` or `patterns/` and leave a compatibility shim behind only when there is a real migration need.
