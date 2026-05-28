# Navet AI Agent Guide

This directory exists to stop generic or implementation-driven changes.

Navet is a smart-home dashboard frontend with a provider-scoped architecture. Shared UI and shared
state should depend on Navet-owned contracts and provider/runtime seams, not on Home Assistant raw
payloads.

## Mandatory Rules

- Read the relevant skill file before changing code, tests, fixtures, or docs in that area.
- For architecture, state, integration, provider, auth/runtime, or large refactor work, read
  [`/docs/technical/multi-backend-migration-guide.md`](../docs/technical/multi-backend-migration-guide.md).
- Home Assistant official documentation is the source of truth for Home Assistant adapter behavior.
- Home Assistant documentation does not define Navet's overall architecture.
- Treat Home Assistant as one provider adapter inside Navet.
- Prefer Navet-owned contracts, provider/runtime abstractions, normalized state, and resource
  resolution seams for shared UI and shared feature code.
- Do not add new shared-UI dependencies on `HassEntity` or other backend raw types unless the code
  is explicitly adapter-internal.
- Navet's current implementation is not the behavioral source of truth for Home Assistant-facing
  work.
- Do not update tests only to make them pass.
- Prefer realistic payloads, realistic fixtures, and real regressions over invented happy-path
  mocks.

## Current Vocabulary

Use the current repo vocabulary in docs and code:

- `IntegrationProviderId`
- `NavetDevice`
- `NavetRoom`
- `NavetRoomDescriptor`
- `NavetProviderRuntimeState`
- `NavetProviderSnapshot`
- `NavetProviderContract`
- provider-scoped IDs
- canonical IDs
- runtime
- snapshot
- contract
- resource resolution

## Skill Routing

- Home Assistant entity behavior: [`/ai/skills/home-assistant-integration.md`](skills/home-assistant-integration.md)
- Tests and test cleanup: [`/ai/skills/testing-architecture.md`](skills/testing-architecture.md)
- Mock entities and fixtures: [`/ai/skills/entity-fixtures.md`](skills/entity-fixtures.md)
- Authentication and deployment modes: [`/ai/skills/auth-deployment.md`](skills/auth-deployment.md)
- Cameras, media, entity pictures, RSS, external URLs: [`/ai/skills/external-resources.md`](skills/external-resources.md)
- UI/UX and dashboard behavior: [`/ai/skills/navet-ux.md`](skills/navet-ux.md)
- Performance and kiosk constraints: [`/ai/skills/performance.md`](skills/performance.md)

## Existing Repo Guidance

Use the focused `/ai/skills/` docs first, then the deeper repo docs when needed:

- Multi-backend architecture: [`/docs/technical/multi-backend-migration-guide.md`](../docs/technical/multi-backend-migration-guide.md)
- State guidance: [`/docs/technical/REACT_ZUSTAND.md`](../docs/technical/REACT_ZUSTAND.md)
- Commands and command restrictions: [`/docs/agents/commands.md`](../docs/agents/commands.md)
- Implementation architecture: [`/docs/agents/architecture.md`](../docs/agents/architecture.md)
- Project map: [`/docs/agents/project-map.md`](../docs/agents/project-map.md)
- Test workflow: [`/docs/agents/testing.md`](../docs/agents/testing.md)
- Home Assistant contract policy: [`/docs/testing/home-assistant-contract-testing.md`](../docs/testing/home-assistant-contract-testing.md)
- UI and theming rules: [`/design-system/UI-GUIDELINES.md`](../design-system/UI-GUIDELINES.md)

## Test Cleanup Policy

When auditing or touching tests, classify them first:

- `Keep`: validates documented behavior, user-visible behavior, realistic fixture handling, or a
  real regression
- `Rewrite`: useful intent, but weak fixtures, wrong assumptions, or incomplete edge-case coverage
- `Delete`: only mirrors implementation, asserts internals, or creates false confidence

See [`/ai/testing-review.md`](testing-review.md) for the audit baseline.
