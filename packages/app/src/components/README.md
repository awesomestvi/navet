# Shared components

Current app-owned shared UI authoring and exports. The [design-system layer map](../../../../docs/design-system/README.md#current-shared-ui-layers)
owns layer responsibilities; root `AGENTS.md` owns package boundaries.

- Author generic controls in `primitives/` and shared compositions in `patterns/`.
- Export mature pieces through `system/`; docs/stories consume `@navet/app/ui-kit/*`.
- Foundation tokens live in `system/tokens/`.
- App-state, dashboard-editing and runtime-coupled UI lives in [shared/](shared/README.md).
- `layout/` owns app-shell composition; `ui/` wraps UI libraries.

Inspect current source and same-family stories before extending a component. Keep domain state
and provider translation in their owning layers. Provider-neutral extraction into `@navet/ui`
occurs within explicitly selected task scope.
