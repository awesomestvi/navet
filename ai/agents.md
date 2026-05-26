# Navet AI Agent Guide

This directory exists to stop generic or implementation-driven changes.

Navet is a Home Assistant dashboard, not a generic smart-home demo app. Future agents must make decisions from Home Assistant contracts, Navet product requirements, realistic fixtures, and supported deployment modes.

## Mandatory Rules

- Read the relevant skill file before changing code, tests, fixtures, or docs in that area.
- Home Assistant official documentation is the source of truth for integration behavior.
- Navet's current implementation is not the behavioral reference for Home Assistant-facing work.
- Do not update tests only to make them pass.
- Delete or rewrite implementation-mirroring tests unless they protect a real regression, a documented contract, or a user-visible behavior.
- Prefer realistic Home Assistant payloads and captured regressions over invented happy-path mocks.
- If a task touches both Home Assistant behavior and tests, read `home-assistant-integration.md` and `testing-architecture.md` together.
- If a task touches media, cameras, RSS, `entity_picture`, or auth-proxied URLs, read `external-resources.md` before editing.

## Skill Routing

- Home Assistant entity behavior: [`/ai/skills/home-assistant-integration.md`](skills/home-assistant-integration.md)
- Tests and test cleanup: [`/ai/skills/testing-architecture.md`](skills/testing-architecture.md)
- Mock entities and fixtures: [`/ai/skills/entity-fixtures.md`](skills/entity-fixtures.md)
- Authentication and deployment modes: [`/ai/skills/auth-deployment.md`](skills/auth-deployment.md)
- Cameras, media, entity pictures, RSS, external URLs: [`/ai/skills/external-resources.md`](skills/external-resources.md)
- UI/UX and dashboard behavior: [`/ai/skills/navet-ux.md`](skills/navet-ux.md)
- Performance and Raspberry Pi or kiosk constraints: [`/ai/skills/performance.md`](skills/performance.md)

## Existing Repo Guidance

Use the focused `/ai/skills/` files first, then the deeper repo docs when needed:

- Commands and command restrictions: [`/docs/agents/commands.md`](../docs/agents/commands.md)
- General coding standards: [`/docs/agents/coding-standards.md`](../docs/agents/coding-standards.md)
- State and architecture: [`/docs/agents/architecture.md`](../docs/agents/architecture.md)
- Existing test workflow: [`/docs/agents/testing.md`](../docs/agents/testing.md)
- Existing Home Assistant contract policy: [`/docs/agents/home-assistant-contract-testing.md`](../docs/agents/home-assistant-contract-testing.md)
- UI and theming details: [`/docs/agents/ui-and-theming.md`](../docs/agents/ui-and-theming.md)
- Project map: [`/docs/agents/project-map.md`](../docs/agents/project-map.md)

## Test Cleanup Policy

When auditing or touching tests, classify them first:

- `Keep`: validates Home Assistant contracts, user-facing behavior, realistic fixture handling, or a real regression
- `Rewrite`: useful intent, but uses weak mocks, wrong assumptions, or incomplete Home Assistant coverage
- `Delete`: only mirrors implementation, asserts internals, or creates false confidence

See [`/ai/testing-review.md`](testing-review.md) for the current audit baseline.
