# Navet Documentation

This directory is the index for active Navet documentation.

## Start Here

- [../README.md](../README.md): project overview, setup, commands, and architecture summary
- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): state-management rules and store/service contracts
- [../design-system/README.md](../design-system/README.md): design-system scope, shared UI layers, and Storybook workflow

## Documentation Map

### Product and deployment

- [WIDGETS.md](WIDGETS.md): widget types, widget behavior, and extension notes
- [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md): Docker and Home Assistant add-on deployment
- [VERSIONING.md](VERSIONING.md): release numbering and bump policy
- [ROADMAP.md](ROADMAP.md): planned work and shipped history
- [card-properties.md](card-properties.md): card behavior and property reference

### Architecture and implementation

- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): Zustand-only shared state guidance
- [../design-system/FEATURES.md](../design-system/FEATURES.md): implementation map of current product areas
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md): visual rules, component patterns, and performance-sensitive UI guidance
- [../design-system/STORYBOOK_FOUNDATION.md](../design-system/STORYBOOK_FOUNDATION.md): Storybook structure and workshop rules

### Branding and legal

- [branding/BRANDING.md](branding/BRANDING.md): brand identity and usage
- [branding/BRANDING_ASSETS.md](branding/BRANDING_ASSETS.md): brand assets and references
- [branding/TRADEMARK_POLICY.md](branding/TRADEMARK_POLICY.md): trademark usage policy
- [TERMS_OF_USE.md](TERMS_OF_USE.md): code-license and branding summary
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md): third-party attributions

### Historical references

- [archive/CHANGES.md](archive/CHANGES.md): archived migration and change history

## Recommended Reading Paths

### New contributor

1. [../README.md](../README.md)
2. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
3. [../design-system/README.md](../design-system/README.md)
4. [../design-system/STORYBOOK_FOUNDATION.md](../design-system/STORYBOOK_FOUNDATION.md)

### Working on shared UI

1. [../design-system/README.md](../design-system/README.md)
2. [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)
3. [../design-system/STORYBOOK_FOUNDATION.md](../design-system/STORYBOOK_FOUNDATION.md)

### Working on dashboard or state flows

1. [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
2. [../design-system/FEATURES.md](../design-system/FEATURES.md)
3. [WIDGETS.md](WIDGETS.md)

### Working on deployment

1. [../README.md](../README.md)
2. [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md)
3. [VERSIONING.md](VERSIONING.md)

## Maintenance Rules

- Keep active docs aligned with the codebase when architecture, setup, or behavior changes
- Prefer updating active docs over adding duplicate one-off notes
- Treat `docs/archive/` as historical material, not the current source of truth
- When Storybook ownership, card sizing, or feature boundaries change, update the design-system docs

Last updated: April 26, 2026
