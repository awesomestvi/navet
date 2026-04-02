# Components

This folder has three distinct roles:

- `primitives/`
  Low-level reusable UI building blocks with one clear responsibility.
  Examples: `TextField`, `ColorInputSwatch`, `LoadingSpinner`, `ThemeDropdownContent`.
  New shared UI should start here when it is generic, behavior-light, and reusable across features.

- `patterns/`
  Small composed UI structures built from primitives.
  Examples: `FieldBlock`, `DashboardEmptyState`, `InlineEmptyState`.
  Put shared structure here when reuse comes from intent, not just matching visuals.

- `system/`
  Curated public surface for Storybook and cross-app discovery.
  This is the stable export layer for primitives, patterns, and theme tokens.
  Do not treat `system/` as the source of truth for where new shared components are authored.

- `shared/`
  Existing cross-feature components that predate the primitive/pattern split.
  This folder now contains both compatibility shims and intentional app-specific shared UI.
  See `src/app/components/shared/README.md` before extending anything here.

- `layout/` and `ui/`
  App-shell and library-wrapper code.
  These are not the default home for new cross-feature primitives.

Guidelines:

- Create new shared UI in `primitives/` or `patterns/` first.
- Re-export stable shared pieces through `system/` once they are ready for broader use.
- Treat compatibility shims in `shared/` as migration paths, not as the preferred import target.
- Keep business logic and feature-specific state out of primitives.
- Reject abstractions that need large prop APIs or mix multiple responsibilities.
- If a shared component still depends on feature UI or unresolved composition decisions, leave it in `shared/` until its role is clearer.
- Card-editing helpers, app-state banners, and release-specific badges can stay in `shared/` even when reused. Reuse alone is not enough to make something a primitive or pattern.
