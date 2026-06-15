# Provider Platform Roadmap

This is an internal engineering roadmap for provider work. The package-direction split is already
established, so this file is about follow-up work, not about arguing for the architecture itself.

## Current State

Navet already has:

- `@navet/core` for shared contracts and IDs
- `@navet/ui` as the target provider-neutral shared UI package boundary
- `@navet/provider-homeassistant` as the first implemented provider
- `@navet/provider-homey` as a working standalone provider
- `@navet/provider-openhab` as a working standalone provider
- `@navet/app` for product wiring, runtime selection, settings, and persistence

Current implementation note:

- much of the active shared UI authoring surface still lives under
  `packages/app/src/components/*` and `packages/app/src/ui-kit/*`
- those app-owned surfaces are migration seams and stable import surfaces, not proof that the UI
  extraction is complete

Hubitat and SmartThings have planned provider contracts and registration entries, but full runtime
support is not implemented yet.

## Near-Term Work

### 1. Harden Existing Providers

- keep Home Assistant solid across standalone, Ingress, and panel modes
- continue improving Homey runtime behavior and tests where gaps show up
- continue improving openHAB runtime behavior and tests where gaps show up

### 2. Keep The Boundary Clean

- avoid pushing provider-specific payloads back into shared UI or core contracts
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
4. Do not let package boundaries drift back toward app-owned runtime internals.
