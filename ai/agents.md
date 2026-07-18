# Navet AI Agent Guide

Use this file to avoid generic or implementation-driven changes.

## Core Framing

Navet is a smart-home dashboard frontend with a package architecture direction built around
provider-neutral core and UI layers, provider packages, and an official app-composition layer.

Shared UI and shared state should depend on Navet-owned contracts and provider/runtime seams, not
on Home Assistant raw payloads.

Current provider capability baseline:

- Home Assistant registers the full advanced feature-service set, including climate, media,
  camera, energy, calendar, weather, notification, task, history, security, and administration
  services.
- Homey and openHAB currently register rooms, realtime entity state, lighting, switches, and
  sensors, but not those advanced feature services.
- The app can retain multiple implemented provider sessions and aggregate selected providers into
  shared dashboard collections.
- Hubitat and SmartThings remain planned registrations, not supported runtimes.

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
- for small UI-only tweaks, do not run tests by default; prompt the user with the relevant test or
  Storybook validation command instead
- never use or suggest `git commit --no-verify`, `git push --no-verify`, or similar hook bypasses

## Evidence Before Implementation

Do not design from the request alone.

- For architecture work, name the owning package, the current implementation location, the target
  boundary, and the existing callers before changing a contract or moving code.
- Do not move code to an aspirational package merely because a document names it as the target.
  Incremental extraction must leave a real dependency boundary better than it found it.
- For dashboard UI work, read [`skills/navet-ux.md`](skills/navet-ux.md), inspect the exact product
  surface being changed, and inspect the nearest shared primitive, pattern, and relevant story.
- Treat Home as the canonical dashboard reference for outer spacing, section rhythm, summary-bar
  spacing, card-grid density, and responsive behavior. Match a more specific neighboring feature
  surface when it already establishes the component family being changed.
- Record the references used in the working update or final response. A visual proposal without a
  named Navet reference is not ready to implement.
- If code and guidance disagree, determine whether the code is an intentional current pattern, a
  compatibility seam, or stale implementation. Do not silently choose whichever is easier.

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

Prefer this vocabulary for target architecture and new boundaries:

- `IntegrationProviderId`
- `NavetProviderRuntimeState`
- `SmartHomeProviderAdapter`
- `NavetEntity`
- `NavetCommand`
- `CommandResult`
- provider-scoped IDs
- canonical IDs
- runtime
- contract
- capability
- feature service
- resource resolution

`NavetDevice`, `NavetRoom`, `NavetRoomDescriptor`, and `NavetProviderSnapshot` are still valid names
for current app-owned compatibility code. Do not rename them casually, but do not use them as the
preferred public model for a new provider-neutral boundary.

## Skill Routing

- Home Assistant entity behavior: [`/ai/skills/home-assistant-integration.md`](skills/home-assistant-integration.md)
- tests and test cleanup: [`/ai/skills/testing-architecture.md`](skills/testing-architecture.md)
- fixtures and mock entities: [`/ai/skills/entity-fixtures.md`](skills/entity-fixtures.md)
- auth and deployment: [`/ai/skills/auth-deployment.md`](skills/auth-deployment.md)
- cameras, artwork, RSS, and URLs: [`/ai/skills/external-resources.md`](skills/external-resources.md)
- dashboard UX and layout: [`/ai/skills/navet-ux.md`](skills/navet-ux.md)
- performance and kiosk constraints: [`/ai/skills/performance.md`](skills/performance.md)

For any dashboard UI task, the UX skill routes next to the compact
[AI design context](../docs/design-system/AI-DESIGN-CONTEXT.md) and the full
[UI guidelines](../docs/design-system/UI-GUIDELINES.md).

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
- `apps/docs`: public Astro Starlight documentation site
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
