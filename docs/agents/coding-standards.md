# Coding Standards

These rules apply to all code written for Navet.

## Architecture And Maintainability

- Prefer reusable, composable, detachable components over large monolithic ones.
- Keep components focused on a single responsibility.
- Extract repeated UI, logic, and utility patterns instead of duplicating them.
- Keep code scalable and easy to extend without rewriting existing functionality.
- Use clear separation of concerns: UI, state, business logic, and utilities belong in separate layers.
- New shared cross-feature UI belongs in `packages/app/src/components/primitives/` or `packages/app/src/components/patterns/`. Feature-specific logic stays in the feature module.
- `packages/app/src/components/system/` is the curated public export surface, not the authoring location for new components.
- `packages/app/src/components/shared/` is for app-specific shared UI and compatibility shims; do not default new primitives there.
- Do not add new feature-specific hooks, stores, or utilities to global folders unless they are genuinely shared across multiple features.

## React Standards

- Use modern React best practices throughout.
- Avoid unnecessary prop drilling; prefer better composition or lifting state only when needed.
- Keep state as local as possible and only lift it when multiple components need it.
- Avoid over-engineering, but do not allow quick hacks that reduce maintainability.
- Prefer predictable and consistent patterns across the codebase over one-off solutions.

## Performance

- Optimize for both high-end devices and low-power devices such as tablets, Raspberry Pi dashboards, and wall displays.
- Avoid unnecessary re-renders. Use minimal Zustand selectors and memoize only where it provides real value.
- Avoid heavy computations during render. Move them to `useMemo` or outside the component if they are expensive.
- Lazy load expensive features where appropriate, following the existing dashboard `lazy()` patterns.
- Keep DOM structure lean and avoid deep nesting.
- Be careful with animations, shadows, blur, and heavy CSS effects. They must remain smooth on weaker hardware.
- Flag any tradeoff where visual richness may hurt performance on low-power devices.

## Code Quality

- Follow DRY, but do not abstract prematurely. Three similar lines are better than a premature abstraction.
- Prefer readability over cleverness.
- Reuse existing components, hooks, and utilities before creating new ones.
- Do not introduce duplicate utilities, hooks, or component variants unless clearly justified.
- Keep naming consistent and descriptive.

## Before Writing Code

1. Check whether an existing component, hook, utility, or pattern should be reused.
2. Before building any new UI element, scan `packages/app/src/components/primitives/` first. If a primitive already covers the use case, use it instead of re-implementing it inline or in a feature folder.
3. Before adding a new Storybook story file, check whether a story for that component already exists. Add to the existing story file rather than creating a duplicate.
4. Before writing new UI logic, check whether unit tests already exist. Extend existing tests before adding duplicate coverage.
5. If creating something new, make it reusable when that is realistically beneficial.
6. Explain any architectural decision that affects maintainability or performance.
7. Flag any tradeoff where visual richness may hurt performance on low-power devices.
8. Do not produce shortcut code that solves the immediate task but worsens the codebase.

## Before Finalizing Code

- Is this reusable?
- Is this consistent with existing patterns?
- Is this the simplest maintainable solution?
- Will this perform well on weaker devices?
- Does this avoid duplication?

## Documentation Rules

- When moving or renaming files referenced by docs, update the active docs in the same change.
- Keep these current when affected: `README.md`, `docs/README.md`, `design-system/README.md`, `design-system/FEATURES.md`, `design-system/UI-GUIDELINES.md`.
- Treat `docs/archive/*` as historical snapshots. Do not rewrite them.

## Related Guidance

- UI and theming specifics live in [../../design-system/UI-GUIDELINES.md](../../design-system/UI-GUIDELINES.md).
- Storybook-specific authoring rules live in [../STORYBOOK_WORKFLOW.md](../STORYBOOK_WORKFLOW.md).
- Repo structure and active architecture direction live in [architecture.md](architecture.md).
