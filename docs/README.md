# Navet Documentation

This directory indexes the active documentation for the current codebase.

## Start Here

- [../README.md](../README.md): product overview, install paths, commands, and architecture summary
- [technical/multi-backend-migration-guide.md](technical/multi-backend-migration-guide.md):
  canonical architecture reference
- [technical/multi-backend-migration-status.md](technical/multi-backend-migration-status.md):
  current migration audit against the architecture guide
- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md): state ownership and store/runtime flow
- [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md): deployment and runtime-mode guide
- [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md): Storybook workflow and story ownership rules

## Product And Setup

- [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md)
- [WIDGETS.md](WIDGETS.md)
- [VERSIONING.md](VERSIONING.md)
- [ROADMAP.md](ROADMAP.md)
- [PUBLIC_LAUNCH_SECURITY.md](PUBLIC_LAUNCH_SECURITY.md)

## Architecture And Contributor Docs

- [technical/multi-backend-migration-guide.md](technical/multi-backend-migration-guide.md)
- [technical/multi-backend-migration-status.md](technical/multi-backend-migration-status.md)
- [technical/REACT_ZUSTAND.md](technical/REACT_ZUSTAND.md)
- [agents/architecture.md](agents/architecture.md)
- [agents/project-map.md](agents/project-map.md)
- [agents/testing.md](agents/testing.md)
- [agents/commands.md](agents/commands.md)

## Design System

- [../design-system/README.md](../design-system/README.md)
- [../design-system/FEATURES.md](../design-system/FEATURES.md)
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)

## Testing Docs

- [testing/home-assistant-contract-testing.md](testing/home-assistant-contract-testing.md)
- [testing/home-assistant-integration-coverage.md](testing/home-assistant-integration-coverage.md)

## Branding And Legal

- [branding/BRANDING.md](branding/BRANDING.md)
- [branding/BRANDING_ASSETS.md](branding/BRANDING_ASSETS.md)
- [branding/TRADEMARK_POLICY.md](branding/TRADEMARK_POLICY.md)
- [TERMS_OF_USE.md](TERMS_OF_USE.md)
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md)

## Current Repo Reference Points

Use the live repo as the source of truth when updating docs:

- `src/app/core/`
- `src/app/platform/`
- `src/app/stores/`
- `src/app/services/`
- `src/app/infrastructure/home-assistant/`
- `src/auth/`
- `src/app/features/`
- `src/app/components/`
- `src/app/ui-kit/`
- `src/app/storybook/`
- `src/test/`

## Maintenance Rules

- Keep active docs aligned with the current repo structure and vocabulary.
- Distinguish implemented support from planned support.
- Update file and path references to real locations only.
- Leave `docs/archive/` as historical material unless an active doc points there incorrectly.
