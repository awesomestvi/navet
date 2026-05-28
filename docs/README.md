# Navet Documentation

This directory is the index for active Navet documentation. The goal of this index is to point to
the docs that are meant to describe the current codebase rather than historical snapshots.

## Start Here

- [technical/multi-backend-migration-guide.md](technical/multi-backend-migration-guide.md): canonical architecture direction for provider boundaries, backend-agnostic state, and incremental migration work
- [../README.md](../README.md): project overview, setup, commands, testing workflow, and architecture summary
- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): shared-state rules, auth-provider boundaries, store boundaries, and service-to-store flow
- [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md): Storybook taxonomy, story placement, fixture rules, and review checklist
- [../design-system/README.md](../design-system/README.md): shared UI layers, Storybook workflow, and theme/token guidance
- [../design-system/FEATURES.md](../design-system/FEATURES.md): current feature inventory, section ownership, and test/story coverage map

## Documentation Map

### Product, deployment, and operations

- [WIDGETS.md](WIDGETS.md): widget behavior and extension notes
- [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md): Home Assistant custom panel, Docker, and add-on deployment
- [VERSIONING.md](VERSIONING.md): release numbering and bump policy
- [ROADMAP.md](ROADMAP.md): planned work and shipped history

### Architecture and implementation

- [technical/multi-backend-migration-guide.md](technical/multi-backend-migration-guide.md): canonical architecture direction for multi-backend migration and provider boundaries
- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): Zustand shared-state guidance and runtime auth-provider boundaries
- [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md): Storybook workflow and story authoring guide
- [PUBLIC_LAUNCH_SECURITY.md](PUBLIC_LAUNCH_SECURITY.md): security gates and deployment hardening for public releases
- [../design-system/README.md](../design-system/README.md): UI-layer boundaries and Storybook-first workflow
- [../design-system/FEATURES.md](../design-system/FEATURES.md): current product surface, section routing, and ownership map
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md): visual rules, theme constraints, and performance-sensitive UI guidance

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
- [`src/app/core/`](../src/app/core/): Navet-owned domain contracts, provider snapshots, and mapping layers
- [`src/app/platform/`](../src/app/platform/): provider feature abstractions and cross-provider interfaces
- [`src/app/components/`](../src/app/components/): shared UI layers and app-shell composition
- [`src/app/ui-kit/`](../src/app/ui-kit/): canonical shared UI import surface for docs, examples, and stable consumers
- [`src/app/stores/`](../src/app/stores/): Zustand stores, selectors, and cross-provider runtime aggregation
- [`src/app/services/`](../src/app/services/): provider-facing services, adapter registries, and backend-specific integrations
- [`src/app/storybook/`](../src/app/storybook/): shared Storybook frames and docs helpers
- [`src/app/infrastructure/home-assistant/`](../src/app/infrastructure/home-assistant/): Home Assistant adapter-specific runtime, auth, transport, media, and resources
- [`src/auth/`](../src/auth/): runtime-specific OAuth, Ingress, panel, and provider auth adapters
- [`src/test/`](../src/test/): shared Vitest helpers, stubs, and browser mocks

## Recommended Reading Paths

### New contributor

1. [../README.md](../README.md)
2. [technical/multi-backend-migration-guide.md](technical/multi-backend-migration-guide.md)
3. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
4. [../design-system/README.md](../design-system/README.md)

### Working on shared UI

1. [../design-system/README.md](../design-system/README.md)
2. [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)
3. [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md)
4. [../README.md](../README.md) for current command and review workflow

### Working on dashboard, state, or section flows

1. [technical/multi-backend-migration-guide.md](technical/multi-backend-migration-guide.md)
2. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
3. [../design-system/FEATURES.md](../design-system/FEATURES.md)
4. [WIDGETS.md](WIDGETS.md)

### Writing or updating tests

1. [../README.md](../README.md) for current test commands
2. [../design-system/FEATURES.md](../design-system/FEATURES.md) for active `__tests__/` directories
3. [`../src/test/`](../src/test/) for shared test utilities
4. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md) for store/service behavior expectations

### Working on deployment

1. [../README.md](../README.md)
2. [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md)
3. [VERSIONING.md](VERSIONING.md)

## Maintenance Rules

- Keep active docs aligned with the codebase when architecture, setup, commands, or product surface changes
- Prefer updating existing active docs over adding duplicate scratch notes
- Treat `docs/archive/` as historical material, not the current source of truth
- When provider boundaries, adapter ownership, or backend-agnostic contracts change, update `technical/multi-backend-migration-guide.md`, `technical/REACT_ZUSTAND.md`, and the relevant agent docs together
- When top-level sections, shared stores, widget types, dashboard edit behavior, or test locations change, update `README.md`, `docs/WIDGETS.md`, and `design-system/FEATURES.md`
- When Storybook ownership, UI-layer boundaries, token helpers, or `ui-kit/` exports change, update `design-system/README.md` and `STORYBOOK_WORKFLOW.md`
- When provider runtime aggregation, Home Assistant service flow, or typed event flow changes, update `README.md` and `technical/REACT_ZUSTAND.md`
- When auth runtimes, OAuth behavior, or deployment defaults change, update `README.md`, `DOCKER_HOME_ASSISTANT_ADDON.md`, and `VERSIONING.md`
- When setup scripts or test commands change, update `README.md`

Last updated: May 28, 2026
