# Navet AI Agent Guide

Use this file to avoid generic or implementation-driven changes.

## Core Framing

Navet is a smart-home dashboard frontend with a package architecture direction built around
provider-neutral core and UI layers, provider packages, and an official app-composition layer.

Shared UI and shared state should depend on Navet-owned contracts and provider/runtime seams, not
on Home Assistant raw payloads.

## Mandatory Rules

- read the relevant skill file before changing code, tests, fixtures, or docs in that area
- for architecture, state, integration, provider, auth/runtime, or larger refactor work, read
  [`/docs/agents/architecture.md`](../docs/agents/architecture.md)
- Home Assistant official documentation is the source of truth for Home Assistant adapter behavior
- use `/homeassistant/core` as the local implementation reference for Home Assistant edge cases,
  payload shapes, service behavior, and undocumented runtime details
- Home Assistant documentation does not define Navet's overall architecture
- treat Home Assistant as one provider adapter inside Navet
- do not let shared UI import provider-specific code
- do not move provider-specific details into provider-neutral core contracts
- do not expose Home Assistant service payloads as the public UI command surface
- do not update tests only to make them pass
- never use or suggest `git commit --no-verify`, `git push --no-verify`, or similar hook bypasses

## Shared UI Reality

- `@navet/ui` is the target provider-neutral shared UI boundary
- much of the current shared UI implementation still lives in
  `packages/app/src/components/*` and `packages/app/src/ui-kit/*`
- those app-owned paths are current implementation and stable import surfaces
- treat them as migration seams, not as final ownership

## Home Assistant Verification

- check official Home Assistant docs first
- then inspect `/homeassistant/core/homeassistant/` for implementation behavior
- inspect `/homeassistant/core/tests/` for realistic examples and regression coverage
- do not use Navet's current implementation as the Home Assistant source of truth

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
- tests and test cleanup: [`/ai/skills/testing-architecture.md`](skills/testing-architecture.md)
- fixtures and mock entities: [`/ai/skills/entity-fixtures.md`](skills/entity-fixtures.md)
- auth and deployment: [`/ai/skills/auth-deployment.md`](skills/auth-deployment.md)
- cameras, artwork, RSS, and URLs: [`/ai/skills/external-resources.md`](skills/external-resources.md)
- dashboard UX and layout: [`/ai/skills/navet-ux.md`](skills/navet-ux.md)
- performance and kiosk constraints: [`/ai/skills/performance.md`](skills/performance.md)

## Repo Layout

Do not assume a repo-root `src/` directory. Search `packages/` and `apps/` first.

- `packages/app/src`: app composition, dashboard behavior, services, tests, and stories
- `packages/core/src`: provider-neutral contracts, IDs, runtime types, and feature models
- `packages/ui/src`: target provider-neutral shared UI package boundary
- `packages/provider-homeassistant/src`: Home Assistant adapter code
- `packages/provider-homey/src`: Homey adapter code
- `packages/provider-openhab/src`: openHAB adapter code
- `apps/standalone/src`: standalone runtime entrypoint
- `apps/demo/src`: demo runtime entrypoint
- `apps/website/src`: marketing website code
- `apps/ha-panel`: Home Assistant panel wrapper and build config
- `apps/storybook`: Storybook app and config

Path rules:

- search `packages/` and `apps/` first
- pick the search root from the package or app implied by the task before broad text searches
- default to `packages/app/src` for shared dashboard app work unless the task is clearly core,
  shared UI extraction, or provider-specific

## Read Next

- [../docs/agents/architecture.md](../docs/agents/architecture.md)
- [../docs/architecture/package-boundaries.md](../docs/architecture/package-boundaries.md)
- [../docs/architecture/provider-neutral-ui.md](../docs/architecture/provider-neutral-ui.md)
- [../docs/architecture/provider-contract.md](../docs/architecture/provider-contract.md)
- [../docs/testing/provider-testing-strategy.md](../docs/testing/provider-testing-strategy.md)
- [../docs/design-system/UI-GUIDELINES.md](../docs/design-system/UI-GUIDELINES.md)

## Test Cleanup Policy

When auditing or touching tests, classify them first:

- `Keep`
- `Rewrite`
- `Delete`

Use [`/ai/testing-review.md`](testing-review.md) for the audit baseline.
