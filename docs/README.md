# Navet Documentation

This directory is the index for active Navet documentation. The goal of this index is to point to
the docs that are meant to describe the current codebase rather than historical snapshots.

## Start Here

- [../README.md](../README.md): project overview, setup, commands, testing workflow, and architecture summary
- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): shared-state rules, store boundaries, and service-to-store flow
- [../design-system/README.md](../design-system/README.md): shared UI layers, Storybook workflow, and theme/token guidance
- [../design-system/FEATURES.md](../design-system/FEATURES.md): current feature inventory, section ownership, and test/story coverage map

## Documentation Map

### Product, deployment, and operations

- [WIDGETS.md](WIDGETS.md): widget behavior and extension notes
- [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md): Docker and Home Assistant add-on deployment
- [VERSIONING.md](VERSIONING.md): release numbering and bump policy
- [ROADMAP.md](ROADMAP.md): planned work and shipped history
- [card-properties.md](card-properties.md): card behavior and property reference

### Architecture and implementation

- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): Zustand-only shared state guidance
- [../design-system/README.md](../design-system/README.md): UI-layer boundaries and Storybook-first workflow
- [../design-system/FEATURES.md](../design-system/FEATURES.md): current product surface, section routing, and ownership map
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md): visual rules, theme constraints, and performance-sensitive UI guidance
- [../design-system/STORYBOOK_FOUNDATION.md](../design-system/STORYBOOK_FOUNDATION.md): Storybook structure and workshop rules

### Branding and legal

- [branding/BRANDING.md](branding/BRANDING.md): brand identity and usage
- [branding/BRANDING_ASSETS.md](branding/BRANDING_ASSETS.md): brand assets and references
- [branding/TRADEMARK_POLICY.md](branding/TRADEMARK_POLICY.md): trademark usage policy
- [TERMS_OF_USE.md](TERMS_OF_USE.md): code-license and branding summary
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md): third-party attributions

### Historical references

- [archive/CHANGES.md](archive/CHANGES.md): archived migration and change history

## Current Codebase Reference Points

Use these directories when docs need to be checked against the live implementation:

- [`src/app/features/`](../src/app/features/): feature-owned modules
- [`src/app/components/`](../src/app/components/): shared UI layers and app-shell composition
- [`src/app/stores/`](../src/app/stores/): Zustand stores and selectors
- [`src/app/services/`](../src/app/services/): Home Assistant integration services
- [`src/app/storybook/`](../src/app/storybook/): shared Storybook frames and docs helpers
- [`src/test/`](../src/test/): shared Vitest helpers, stubs, and browser mocks

## Recommended Reading Paths

### New contributor

1. [../README.md](../README.md)
2. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
3. [../design-system/README.md](../design-system/README.md)
4. [../design-system/FEATURES.md](../design-system/FEATURES.md)

### Working on shared UI

1. [../design-system/README.md](../design-system/README.md)
2. [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)
3. [../design-system/STORYBOOK_FOUNDATION.md](../design-system/STORYBOOK_FOUNDATION.md)
4. [../README.md](../README.md) for current command and review workflow

### Working on dashboard, state, or section flows

1. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
2. [../design-system/FEATURES.md](../design-system/FEATURES.md)
3. [WIDGETS.md](WIDGETS.md)
4. [`../src/test/`](../src/test/) for test harness helpers

### Writing or updating tests

1. [../README.md](../README.md) for current test commands and active `__tests__/` directories
2. [`../src/test/`](../src/test/) for shared test utilities
3. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md) for store/service behavior expectations

### Working on deployment

1. [../README.md](../README.md)
2. [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md)
3. [VERSIONING.md](VERSIONING.md)

## Maintenance Rules

- Keep active docs aligned with the codebase when architecture, setup, commands, or product surface changes
- Prefer updating existing active docs over adding duplicate scratch notes
- Treat `docs/archive/` as historical material, not the current source of truth
- When top-level sections, shared stores, widget types, or test locations change, update `README.md` and `design-system/FEATURES.md`
- When Storybook ownership, UI-layer boundaries, or token helpers change, update `design-system/README.md`
- When setup scripts or test commands change, update `README.md`

## Known Scope

This index intentionally focuses on active docs. Some older topic documents may still need a deeper
staleness audit, especially if they describe features that have evolved faster than the docs.

Last updated: May 6, 2026
