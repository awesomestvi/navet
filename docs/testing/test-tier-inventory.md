# Test Tier Inventory

This file is the human-readable map of which Navet test suites matter, why they exist, and whether
they are keep, rewrite, or delete candidates.

## Tier 1: Release-Critical

These suites block release-oriented workflows and should stay intentionally small.

| Group | Why it exists | Status |
|---|---|---|
| `packages/provider-*/src/*.test.*` | Provider contract conformance for Home Assistant, Homey, openHAB, and planned-provider boundaries | Keep |
| `packages/app/src/auth/__tests__/adapters.test.ts`, `runtime.test.ts`, `homeAssistantDiscovery.test.ts`, `homey-oauth-auth.test.ts` | Auth/runtime bootstrap and provider login flows | Keep |
| `packages/app/src/infrastructure/home-assistant/resources/__tests__/resource-resolver.test.ts` | Signed URLs, proxy rewriting, unsafe URL rejection | Keep |
| `packages/app/src/utils/__tests__/home-assistant-url.test.ts`, `rss-proxy-security.test.ts` | URL safety, ingress/panel URL normalization, RSS proxy hardening | Keep |
| `packages/app/src/features/auth/__tests__/login-page.test.tsx` | User-facing OAuth login flow | Keep |
| `packages/app/src/features/media/components/media-card/__tests__/use-media-artwork-resolution.test.tsx` | Authenticated artwork resolution and runtime-specific fallbacks | Keep |
| `packages/app/src/features/security/components/camera-card/__tests__/camera-stream-player.test.tsx` | Camera stream runtime behavior across supported modes | Keep |
| `packages/app/src/features/rss/components/rss-feed-card/__tests__/use-rss-feed-items.test.tsx` | Ingress-aware RSS proxy behavior and feed ordering | Keep |
| `packages/app/src/stores/__tests__/integration-store.test.ts` | Core provider-to-app state wiring | Keep |
| `packages/app/src/services/__tests__/integration-runtime.service.test.ts`, `integration-registry.service.test.ts`, `integration-action.service.test.ts` | Runtime wiring, provider registration, and shared command dispatch | Keep |

Tier 1 companion checks:

- `pnpm check:provider-boundaries`
- `pnpm check:docker`

## Tier 2: Blocking App Contracts

These suites block main CI because they protect stable app behavior, but they are not release-only.

| Group | Why it exists | Status |
|---|---|---|
| `packages/app/src/services/__tests__/dashboard-endpoints.test.ts` | Dashboard persistence and endpoint contract behavior | Keep |
| `packages/app/src/services/__tests__/ha-connection.service.test.ts`, `ha-entity-service.test.ts`, `ha-registry.service.test.ts`, `home-assistant-panel-adapter.test.ts` | Home Assistant app-layer service contracts | Keep |
| `packages/app/src/services/__tests__/home-assistant-energy-feature.service.test.ts`, `homey.service.test.ts` | Provider-specific app-owned feature/runtime seams | Keep |
| `packages/app/src/services/__tests__/integration-*.test.ts` except Tier 1 runtime/registry/action | Shared feature-service contracts for calendar, camera, history, light, media, notification, resource, security, task, weather, admin, and bootstrap flows | Keep |
| `packages/app/src/platform/__tests__/provider-room-management.test.ts` | Shared provider room normalization and room management contract | Keep |
| `packages/app/src/stores/__tests__/home-assistant-store.test.ts`, `settings-store.test.ts` | Stable store contracts with meaningful downstream impact | Keep |

Default rule:

- service/store/platform tests are Tier 2 when they protect normalized app contracts or provider
  wiring that many features depend on

## Tier 3: Broad Regression

These suites remain valuable for drift detection, but they should not block release or publish
workflows by default.

| Group | Why it exists | Status |
|---|---|---|
| `packages/app/src/features/dashboard/**` | Largest user-facing regression surface for layout, editing, widgets, and navigation | Keep |
| `packages/app/src/features/media/**`, `lighting/**`, `security/**`, `energy/**`, `climate/**`, `rss/**`, `tasks/**`, `settings/**`, `sensors/**`, `vacuum/**`, `calendar/**`, `notifications/**` | User-visible feature regressions and UI behavior | Keep |
| `packages/app/src/components/**` | Shared UI and interaction regressions | Keep |
| most `packages/app/src/hooks/**` | Hook-level regression coverage for app behavior and feature composition | Keep |
| most `packages/app/src/utils/**`, `packages/app/src/runtime/**`, `packages/app/src/navigation/**`, `packages/app/src/api/**` | Utility and runtime drift detection that is useful but not release-critical | Keep |
| `pnpm test:storybook` | Separate visual/story regression surface | Keep |

Default rule:

- if a suite is mainly protecting UI composition, interaction details, or feature behavior rather
  than a stable contract, it belongs in Tier 3 unless promoted explicitly

## Tier 4: Rewrite/Delete Candidates

These suites are not trusted as-is. They stay visible so they can be rewritten or removed
deliberately rather than silently decaying.

| Group | Why it is Tier 4 | Status |
|---|---|---|
| `packages/app/src/hooks/device-mappers/__tests__/map-sensor-device.test.ts` | Weak fixture assumptions for a high-risk domain | Rewrite |
| `packages/app/src/hooks/device-mappers/__tests__/map-weather-device.test.ts` | Needs real forecast/documented weather fixtures | Rewrite |
| `packages/app/src/hooks/device-mappers/__tests__/map-fan-device.test.ts` | Needs real percentage/preset/unavailable behavior | Rewrite |
| `packages/app/src/features/vacuum/components/vacuum/__tests__/use-vacuum-control.test.tsx` | Vendor-sensitive behavior without strong fixtures | Rewrite |
| `packages/app/src/features/security/components/__tests__/lock-card.test.tsx` | Missing contract-backed lock states | Rewrite |
| `packages/app/src/features/security/components/cover-card/__tests__/cover-card.test.tsx` | Needs documented cover/tilt/partial-position behavior | Rewrite |
| `packages/app/src/features/lighting/components/light-card/__tests__/light-card.test.tsx` | Needs stronger grouped-light and malformed-attribute fixtures | Rewrite |
| `packages/app/src/features/climate/components/hvac-card/__tests__/use-hvac-card-controller.test.tsx` | Needs documented HVAC mode/range coverage | Rewrite |
| `packages/app/src/features/tasks/components/__tests__/tasks-section.test.tsx` | Needs realistic automation/script/todo fixtures | Rewrite |
| `packages/app/src/features/calendar/components/calendar/__tests__/calendar-event-visibility.test.ts` | Needs real all-day and timed event payloads | Rewrite |
| `packages/app/src/hooks/__tests__/use-ha-devices.test.tsx` | Uses synthetic mixed-domain collections instead of realistic fixtures | Rewrite |
| `packages/app/src/hooks/__tests__/ha-entity-utils.test.ts` | Needs malformed and unavailable fixture coverage | Rewrite |

Default rule:

- tests already identified as rewrite candidates in `ai/testing-review.md` start here unless they
  are intentionally promoted with stronger fixtures and a clear contract target

## Admission Rules

- New Tier 1 tests need a release/runtime/security/provider justification.
- New Tier 2 tests need a stable store/service/platform contract justification.
- New Tier 3 tests are acceptable for useful regression coverage.
- New Tier 4 tests are not acceptable; rewrite the fixture model or do not add the test.
