# Navet Test Review

This document is the current audit baseline for future agents. It classifies existing tests by confidence and explains which areas should not be trusted without rewrite.

## What Was Kept

These tests are worth keeping because they validate documented Home Assistant-adjacent behavior, user-visible behavior, deployment/runtime contracts, or realistic fixture handling.

- `src/app/infrastructure/home-assistant/resources/__tests__/resource-resolver.test.ts`
  - Keep. Validates proxy rewriting, panel behavior, signed paths, and unsafe URL rejection at the resource boundary.
- `src/app/utils/__tests__/home-assistant-url.test.ts`
  - Keep. Covers ingress, panel, stale proxy stripping, camera and media proxy paths, and unsafe URL rejection.
- `src/auth/__tests__/adapters.test.ts`
  - Keep. Covers panel, ingress, standalone OAuth, malformed callback handling, refresh, and logout cleanup with realistic auth-session flows.
- `src/auth/__tests__/runtime.test.ts`
  - Keep. Small but useful runtime-mode contract coverage for panel, ingress, and standalone modes.
- `src/app/features/media/components/media-card/__tests__/use-media-artwork-resolution.test.tsx`
  - Keep. High-value external resource coverage for thumbnail fallback, signed artwork, proxy behavior, panel mode, Docker proxying, and ingress paths.
- `src/app/features/security/components/camera-card/__tests__/camera-stream-player.test.tsx`
  - Keep. High-value live media coverage for HLS, ingress-aware proxying, vendor stream URLs, and runtime-specific camera playback behavior.
- `src/app/services/__tests__/ha-entity-service.test.ts`
  - Keep. Validates Home Assistant service names and payload shapes for climate, media, and camera actions.
- `src/app/features/auth/__tests__/login-page.test.tsx`
  - Keep. Validates the user-facing OAuth-only login flow without reintroducing token-based UX.
- `src/app/features/rss/components/rss-feed-card/__tests__/use-rss-feed-items.test.tsx`
  - Keep. Validates ingress-aware RSS proxying, dedupe behavior, and user-facing feed ordering.
- `src/app/hooks/device-mappers/__tests__/map-climate-device.test.ts`
  - Keep. Uses shared fixtures and checks realistic climate and water-heater contract behavior.
- `src/app/hooks/device-mappers/__tests__/map-cover-device.test.ts`
  - Keep. Uses shared fixtures and covers malformed-but-plausible cover attributes.
- `src/app/features/tasks/utils/__tests__/map-automation-tasks.test.ts`
  - Keep. Useful user-facing task mapping coverage with realistic automation shapes and optional metadata handling.
- `src/app/features/dashboard/components/widgets/__tests__/map-image-url.test.ts`
  - Keep. Small but valid coverage for Home Assistant image-serve URL rewriting and signed query preservation.

## Tests That Need Rewriting

These tests have useful intent, but they should not be treated as fully trustworthy until they are tied more directly to Home Assistant docs, runtime contracts, or stronger fixtures.

- `src/app/hooks/device-mappers/__tests__/map-sensor-device.test.ts`
  - Rewrite. Sensor handling is high-risk and should be backed by documented `device_class`, `state_class`, unit, and malformed attribute fixtures instead of mapper-shaped assumptions.
- `src/app/hooks/device-mappers/__tests__/map-weather-device.test.ts`
  - Rewrite. Weather coverage needs documented forecast and optional-field fixtures from real integrations.
- `src/app/hooks/device-mappers/__tests__/map-fan-device.test.ts`
  - Rewrite. Fan contracts should be checked against documented percentage, preset, and unavailable-state behavior.
- `src/app/features/vacuum/components/vacuum/__tests__/use-vacuum-control.test.tsx`
  - Rewrite. Vacuum behavior varies materially by vendor; coverage should be fixture-backed with real Roborock and Dreame payloads.
- `src/app/features/security/components/__tests__/lock-card.test.tsx`
  - Rewrite. Keep the UX intent, but add contract-backed states such as `jammed`, `unknown`, and `unavailable`.
- `src/app/features/security/components/cover-card/__tests__/cover-card.test.tsx`
  - Rewrite. Card behavior should be aligned with documented cover states, tilt support, and partial position data.
- `src/app/features/lighting/components/light-card/__tests__/light-card.test.tsx`
  - Rewrite. Light tests are valuable, but they need stronger grouped-light, color-mode, and malformed-attribute coverage from Home Assistant fixtures.
- `src/app/features/climate/components/hvac-card/__tests__/use-hvac-card-controller.test.tsx`
  - Rewrite. HVAC control assumptions should be checked against documented `hvac_modes`, target ranges, and missing-attribute cases.
- `src/app/features/tasks/components/__tests__/tasks-section.test.tsx`
  - Rewrite. Good product coverage, but task behavior should be anchored to realistic `script`, `automation`, and `todo` fixtures.
- `src/app/features/calendar/components/calendar/__tests__/calendar-event-visibility.test.ts`
  - Rewrite. Needs documented all-day and timed event fixtures from real Home Assistant calendar payloads.
- `src/app/hooks/__tests__/use-ha-devices.test.tsx`
  - Rewrite. Device aggregation is important, but it should rely on realistic mixed-domain fixtures instead of UI-shaped synthetic entity collections.
- `src/app/hooks/__tests__/ha-entity-utils.test.ts`
  - Rewrite. Utilities touching Home Assistant states need stronger fixture-backed malformed and unavailable cases.

## Tests That Should Be Deleted Or Replaced

These tests are low-value because they mostly mirror file contents or implementation text, not runtime behavior or product contracts.

- `src/app/utils/__tests__/vite-dev-proxy.test.ts`
  - Delete or replace. It asserts string fragments inside `vite.config.ts`, so refactors can break it without changing behavior and bugs can survive if the same strings still exist.
  - Replace with behavioral coverage around the actual proxy middleware or extracted proxy helpers.
- `src/app/utils/__tests__/docker-discovery.test.ts`
  - Delete or replace. It mostly checks that Docker, nginx, and njs files contain exact text snippets.
  - Replace with a smaller number of behavioral tests against parsed config outputs or runtime script helpers.
- `src/app/utils/__tests__/addon-run-script.test.ts`
  - Delete or replace. It is implementation-mirroring shell-script text inspection, not a runtime ingress/auth contract test.
  - Replace with focused tests for the generated proxy/auth behavior or extracted config-generation logic.
- `src/app/utils/__tests__/addon-config.test.ts`
  - Delete or replace. It depends on literal YAML text content instead of validating the add-on contract in a resilient way.
  - Replace with structured config parsing assertions if this contract must stay tested.

## Home Assistant Docs And Assumptions To Check Next

- WebSocket auth flow and camera stream messages
- REST auth failure handling
- camera proxy and stream URL behavior
- media player artwork and signed resource handling
- ingress and custom-panel same-origin behavior
- calendar event payload shape
- climate, fan, vacuum, and weather platform docs

## Gaps In Current Coverage

- fixture validation tests that guarantee shared fixtures remain realistic
- explicit invalid-token and expired-token UX flows across all supported modes
- contract-backed helper-domain coverage for `input_boolean`, `input_select`, `number`, and `select`
- fallback behavior for unsupported or malformed entity domains
- broader coverage for `person`, `device_tracker`, `image`, and `alarm_control_panel`
- stronger vendor-backed fixtures for camera, media, vacuum, and climate domains

## Current High-Risk Areas

- camera streams and snapshot fallback across panel, ingress, and standalone runtimes
- album artwork and authenticated media URLs
- ingress-aware proxying and stale URL rewriting
- auth/session recovery and logout cleanup
- mapper logic for climate, sensor, weather, fan, and vacuum entities
