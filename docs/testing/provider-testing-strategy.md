# Provider Testing Strategy

This is the testing map for Navet's package and provider architecture.

## Tier Model

Navet's automated test surface is split into four tiers:

- `Tier 1: Release-critical`
  Small blocking gate for provider/runtime/auth/resource correctness and release validation.
- `Tier 2: Blocking app contracts`
  Blocking app-layer contracts around stores, services, and adapter wiring.
- `Tier 3: Broad regression`
  Wide feature, UI, hook, and component coverage that remains useful but is not a release gate.
- `Tier 4: Rewrite/Delete candidates`
  Existing suites that should be rewritten against stronger fixtures or removed.

Executable Tier 1 and Tier 2 membership lives in
[`../../scripts/test-tier-manifest.mjs`](../../scripts/test-tier-manifest.mjs). Tier 3 is the broad
regression remainder. Tier 4 is a review classification, not a runnable gate or a place for new
tests.

## Working Rules

- classify an existing test as keep, rewrite, or delete before changing it
- ground assertions in product requirements, Navet contracts, realistic provider payloads,
  official provider documentation, or a known regression
- do not weaken a valid test to match implementation drift
- reuse shared fixtures instead of repeating hand-shaped objects
- require a release, runtime, security, or provider justification for new Tier 1 membership
- require a stable store, service, or platform contract justification for new Tier 2 membership
- rewrite or remove a weak test instead of adding it to Tier 4

## Test Layers

### `@navet/core`

Test:

- shared contract behavior
- IDs and identifier helpers
- contract test harnesses

Do not test:

- React rendering
- provider SDK integration
- backend payload details

### `@navet/ui`

Target shared-UI package boundary.

Test:

- rendering from fake normalized entities
- command emission from UI interactions
- layout, filtering, and room behavior
- unavailable and malformed normalized state handling

Do not test:

- backend-native payload fields
- provider-native service calls

Current-state note:

- `packages/ui/src` is still a small export surface today
- most current UI regression coverage still lives in app-owned tests under
  `packages/app/src/components/**`, `packages/app/src/features/**`, `packages/app/src/hooks/**`,
  and Storybook coverage
- that is the current implementation reality, not a reason to collapse the `@navet/ui` boundary

### Provider packages

Test:

- raw payload mapping
- command translation
- state update and subscription behavior
- provider-local runtime behavior
- provider feature services such as media, energy, notification, task, and admin bridges
- shared contract conformance

Implemented providers today:

- `@navet/provider-homeassistant`
- `@navet/provider-homey`
- `@navet/provider-openhab`

Their expected matrices differ: Home Assistant covers the advanced feature-service set, while
Homey and openHAB currently cover rooms, realtime entities, lighting, switches, and sensors. Tests
must assert each provider's declared runtime registration rather than treating `implemented` as
feature parity.

These suites are Tier 1 by default.

### Provider onboarding

A provider package exposes stable package-root surfaces for its contract or adapter, runtime
registration, package registration, and—when it accepts native snapshots—its state builder.

Implemented providers must pass `runProviderContractTests`,
`runProviderPackageRegistrationTests`, and provider-specific payload/runtime tests. Planned
providers must assert `implementationStatus: 'planned'` and explicitly reject unsupported feature
behavior.

Before an implementation is considered ready, verify that:

- the package does not import `@navet/app`
- its package root exports the registration used by `@navet/app`
- its contract returns normalized `NavetProviderState`
- runtime registration declares capabilities and its feature matrix explicitly
- contract, adapter, and runtime-registration references stay aligned
- implemented providers cover connect, disconnect, lookup, updates, malformed payloads, and
  unsupported commands
- planned providers remain scaffold-only and do not claim unsupported features

### `@navet/app`

Test:

- provider registration and wiring
- runtime selection and session bootstrap
- simultaneous session bootstrap, selected-provider aggregation, and provider-scoped identity
- integration store behavior
- app service fallbacks when a provider feature service is missing or optional
- deployment entrypoints such as standalone, ingress, and panel wiring
- compatibility-only derived state that still matters internally

Typical tier split inside `@navet/app`:

- Tier 1 for runtime, auth, resource, and security edges
- Tier 2 for shared stores and service contracts
- Tier 3 for broad feature and UI regression coverage
- Tier 4 for weak fixture-driven or implementation-shaped tests

## Fixture Rules

- use provider-neutral fixtures in shared-layer tests
- use realistic provider fixtures in provider package tests
- include `unknown`, `unavailable`, missing fields, malformed payloads, and resource differences
  when relevant

## Boundary Checks

Validation should keep failing if:

- shared code imports provider-specific code
- provider packages use app-internal compatibility seams as a primary input model
- shared UI starts depending on raw backend payload models again

## Release Validation

The focused release-oriented workflow lives in
[../release-workflow.md](../release-workflow.md).
