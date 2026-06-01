# Navet Test Review

This file is the audit baseline for test quality. It now follows Navet's tier model so the quality
review and the workflow reality stay aligned.

Use [../docs/testing/test-tier-inventory.md](../docs/testing/test-tier-inventory.md) for the full
grouped inventory. Use this file for high-signal exceptions and rewrite/delete guidance.

## Tier 1: Keep

These tests protect release-critical behavior and should stay blocking.

- `packages/app/src/infrastructure/home-assistant/resources/__tests__/resource-resolver.test.ts`
- `packages/app/src/utils/__tests__/home-assistant-url.test.ts`
- `packages/app/src/utils/__tests__/rss-proxy-security.test.ts`
- `packages/app/src/auth/__tests__/adapters.test.ts`
- `packages/app/src/auth/__tests__/runtime.test.ts`
- `packages/app/src/auth/__tests__/homeAssistantDiscovery.test.ts`
- `packages/app/src/auth/__tests__/homey-oauth-auth.test.ts`
- `packages/app/src/features/auth/__tests__/login-page.test.tsx`
- `packages/app/src/features/media/components/media-card/__tests__/use-media-artwork-resolution.test.tsx`
- `packages/app/src/features/security/components/camera-card/__tests__/camera-stream-player.test.tsx`
- `packages/app/src/features/rss/components/rss-feed-card/__tests__/use-rss-feed-items.test.tsx`
- `packages/provider-homeassistant/src/homeassistant-contract.test.ts`
- `packages/provider-homey/src/homey-contract.test.ts`
- `packages/provider-openhab/src/openhab-contract.test.ts`
- `packages/provider-hubitat/src/planned-provider-contract.test.ts`

## Tier 2: Keep

These tests protect important app contracts and should stay blocking in main CI.

- `packages/app/src/stores/__tests__/integration-store.test.ts`
- `packages/app/src/services/__tests__/integration-runtime.service.test.ts`
- `packages/app/src/services/__tests__/integration-registry.service.test.ts`
- `packages/app/src/services/__tests__/integration-action.service.test.ts`
- `packages/app/src/services/__tests__/ha-entity-service.test.ts`
- `packages/app/src/platform/__tests__/provider-room-management.test.ts`
- the rest of the curated Tier 2 service/store/platform suites in
  `docs/testing/test-tier-inventory.md`

## Tier 4: Rewrite

These tests have useful intent but should not be treated as trustworthy until they are rebuilt
against stronger fixtures or documentation-backed behavior.

- `packages/app/src/hooks/device-mappers/__tests__/map-sensor-device.test.ts`
- `packages/app/src/hooks/device-mappers/__tests__/map-weather-device.test.ts`
- `packages/app/src/hooks/device-mappers/__tests__/map-fan-device.test.ts`
- `packages/app/src/features/vacuum/components/vacuum/__tests__/use-vacuum-control.test.tsx`
- `packages/app/src/features/security/components/__tests__/lock-card.test.tsx`
- `packages/app/src/features/security/components/cover-card/__tests__/cover-card.test.tsx`
- `packages/app/src/features/lighting/components/light-card/__tests__/light-card.test.tsx`
- `packages/app/src/features/climate/components/hvac-card/__tests__/use-hvac-card-controller.test.tsx`
- `packages/app/src/features/tasks/components/__tests__/tasks-section.test.tsx`
- `packages/app/src/features/calendar/components/calendar/__tests__/calendar-event-visibility.test.ts`
- `packages/app/src/hooks/__tests__/use-ha-devices.test.tsx`
- `packages/app/src/hooks/__tests__/ha-entity-utils.test.ts`

## Tier 4: Delete Or Replace

Current baseline:

- no required deletes in this pass
- future implementation-shaped smoke tests should be deleted instead of grandfathered into Tier 3

## Ongoing Gaps

- fixture validation for shared and provider fixtures
- stronger invalid-token and expired-token flows
- more documented coverage for helper domains such as `number`, `select`, and `input_select`
- better vendor-backed fixtures for camera, media, climate, vacuum, and weather behavior

## Working Rule

If a test is broad, shallow, and easy to break for non-user-visible reasons, it belongs in Tier 3
at best and Tier 4 if the fixture model is weak. If it protects runtime, auth, security, resource
resolution, or shared provider/app contracts, it belongs in Tier 1 or Tier 2.
