# Components

This folder owns the shared UI authoring layers under `src/app/components/`. It also works
alongside the separate `src/app/ui-kit/` discovery/import surface.

- `primitives/`
  Low-level reusable UI building blocks with one clear responsibility.
  Examples: `Input`, `Button`, `ColorInputSwatch`, `LoadingSpinner`, `BaseCard`, `BodyText`.
  New shared UI should start here when it is generic, behavior-light, and reusable across features.

- `patterns/`
  Small composed UI structures built from primitives.
  Examples: `FieldBlock`, `DashboardEmptyState`.
  Put shared structure here when reuse comes from intent, not just matching visuals.

- `system/`
  Curated public surface for Storybook and cross-app discovery.
  This is the stable export layer for primitives, patterns, and theme tokens.
  Do not treat `system/` as the source of truth for where new shared components are authored.
  `system/tokens` is the shared home for first-layer foundations such as spacing, radii, icon sizing, and focus behavior.

- `../ui-kit/`
  Sibling discovery and import surface for Navet developers.
  Prefer `@/app/ui-kit/primitives`, `@/app/ui-kit/patterns`, and `@/app/ui-kit/tokens`
  in new docs, examples, and shared UI consumption. `system/` remains the curated export layer.

- `shared/`
  Existing app-specific shared components that do not belong in the primitive/pattern system.
  Temporary compatibility shims may appear here during migrations, but they should not be long-lived.
  See `src/app/components/shared/README.md` before extending anything here.

- `layout/` and `ui/`
  App-shell and library-wrapper code.
  These are not the default home for new cross-feature primitives.

Guidelines:

- Create new shared UI in `primitives/` or `patterns/` first.
- Re-export stable shared pieces through `system/` once they are ready for broader use.
- Prefer exposing and consuming stable shared UI through `ui-kit/`.
- Before adding or widening primitives, align them to the existing foundation tokens in `src/app/components/system/tokens/`.
- Treat any temporary compatibility shim in `shared/` as a migration path, not as the preferred import target.
- Keep business logic and feature-specific state out of primitives.
- Reject abstractions that need large prop APIs or mix multiple responsibilities.
- If a shared component still depends on feature UI or unresolved composition decisions, leave it in `shared/` until its role is clearer.
- Card-editing helpers, app-state banners, and release-specific badges can stay in `shared/` even when reused. Reuse alone is not enough to make something a primitive or pattern.
