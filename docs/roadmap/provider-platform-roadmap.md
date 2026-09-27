# Provider Platform Roadmap

This is the internal engineering roadmap for provider work.

## Current State

Navet uses:

- `@navet/core` for shared contracts and IDs
- `@navet/ui` as the target provider-neutral shared UI package boundary
- `@navet/provider-homeassistant` as the reference adapter
- `@navet/provider-homey` as a working standalone provider
- `@navet/provider-openhab` as a working standalone provider
- `@navet/app` for product wiring, runtime selection, settings, and persistence
- multi-provider session retention and selected-provider aggregation in shared dashboard collections
- a provider-neutral conversation feature service with a Home Assistant Assist implementation

Current implementation note:

- much of the active shared UI authoring surface still lives under
  `packages/app/src/components/*` and `packages/app/src/ui-kit/*`
- those app-owned surfaces provide stable imports while shared UI is extracted into `@navet/ui`

Hubitat and SmartThings have planned catalog metadata, but no runtime adapters or authentication
flows.

The existing implemented providers are not feature-identical. Home Assistant owns the broadest
advanced feature-service set. Homey also contributes climate, speaker, lock, cover, scene,
presence, notification, Insights, favorite, and hub-resource behavior. openHAB also contributes
fans, climate setpoints, speaker controls, locks, covers, security sensors, batteries, and utility
measurements.

## Near-Term Work

### 1. Harden Existing Providers

- keep Home Assistant solid across standalone, Ingress, and panel modes
- continue improving Homey runtime behavior and tests where gaps show up
- continue improving openHAB runtime behavior and tests where gaps show up

### 2. Keep The Boundary Clean

- keep provider-specific payloads inside provider packages
- keep compatibility-only models contained inside `@navet/app`
- prefer package imports over deep implementation imports when package entries exist

### 3. Strengthen Release Validation

- keep provider-focused tests visible as a separate signal
- keep Docker validation in the release path
- keep explicit manual checks for Home Assistant host-integrated modes

## Optional Future Work

- implement Hubitat when there is product demand
- implement SmartThings when there is product demand
- add stronger end-to-end automation only if the maintenance cost is justified

## Default Posture

1. Keep the shared contract small.
2. Keep shared UI provider-agnostic.
3. Improve existing providers before adding new ones.
4. Keep runtime ownership aligned with the package contracts.
