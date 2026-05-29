# Navet AI Agent Guide

This directory exists to stop generic or implementation-driven changes.

Navet is a smart-home dashboard frontend with a package architecture direction built around
provider-neutral core and UI layers, provider packages, and an official app-composition layer.
Shared UI and shared state should depend on Navet-owned contracts and provider/runtime seams, not
on Home Assistant raw payloads.

## Mandatory Rules

- Read the relevant skill file before changing code, tests, fixtures, or docs in that area.
- For architecture, state, integration, provider, auth/runtime, or large refactor work, read
  [`/docs/agents/architecture.md`](../docs/agents/architecture.md).
- Also read:
  - [`/docs/architecture/package-boundaries.md`](../docs/architecture/package-boundaries.md)
  - [`/docs/architecture/provider-neutral-ui.md`](../docs/architecture/provider-neutral-ui.md)
  - [`/docs/architecture/provider-contract.md`](../docs/architecture/provider-contract.md)
  - [`/docs/architecture/home-assistant-decoupling-audit.md`](../docs/architecture/home-assistant-decoupling-audit.md)
  - [`/docs/testing/provider-testing-strategy.md`](../docs/testing/provider-testing-strategy.md)
  - [`/docs/roadmap/provider-platform-roadmap.md`](../docs/roadmap/provider-platform-roadmap.md)
- Home Assistant official documentation is the source of truth for Home Assistant adapter behavior.
- Home Assistant documentation does not define Navet's overall architecture.
- Treat Home Assistant as one provider adapter inside Navet.
- Navet uses a package architecture direction with provider-neutral `@navet/core` and `@navet/ui`,
  provider packages, and an app-composition package.
- Prefer Navet-owned contracts, provider/runtime abstractions, normalized state, and resource
  resolution seams for shared UI and shared feature code.
- Do not let shared UI import provider-specific code.
- Do not move provider-specific details into provider-neutral core contracts.
- Treat current `src/` boundaries as migration seams, not the final architecture.
- Do not add new shared-UI dependencies on `HassEntity` or other backend raw types unless the code
  is explicitly adapter-internal.
- Do not expose Home Assistant service payloads as the public UI command surface.
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
- `SmartHomeProviderAdapter`
- `NavetEntity`
- `NavetCommand`
- `CommandResult`
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

- Architecture direction: [`/docs/agents/architecture.md`](../docs/agents/architecture.md)
- Package boundaries: [`/docs/architecture/package-boundaries.md`](../docs/architecture/package-boundaries.md)
- Provider-neutral UI: [`/docs/architecture/provider-neutral-ui.md`](../docs/architecture/provider-neutral-ui.md)
- Provider contract: [`/docs/architecture/provider-contract.md`](../docs/architecture/provider-contract.md)
- Home Assistant decoupling audit: [`/docs/architecture/home-assistant-decoupling-audit.md`](../docs/architecture/home-assistant-decoupling-audit.md)
- Provider-platform roadmap: [`/docs/roadmap/provider-platform-roadmap.md`](../docs/roadmap/provider-platform-roadmap.md)
- Commands and command restrictions: [`/docs/agents/commands.md`](../docs/agents/commands.md)
- Implementation architecture: [`/docs/agents/architecture.md`](../docs/agents/architecture.md)
- Test workflow: [`/docs/agents/testing.md`](../docs/agents/testing.md)
- Provider testing strategy: [`/docs/testing/provider-testing-strategy.md`](../docs/testing/provider-testing-strategy.md)
- UI and theming rules: [`/design-system/UI-GUIDELINES.md`](../design-system/UI-GUIDELINES.md)

## Test Cleanup Policy

When auditing or touching tests, classify them first:

- `Keep`: validates documented behavior, user-visible behavior, realistic fixture handling, or a
  real regression
- `Rewrite`: useful intent, but weak fixtures, wrong assumptions, or incomplete edge-case coverage
- `Delete`: only mirrors implementation, asserts internals, or creates false confidence

See [`/ai/testing-review.md`](testing-review.md) for the audit baseline.
