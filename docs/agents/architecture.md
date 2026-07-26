# Contributor Architecture

Use this file for the short version of how the repo is supposed to be organized.

## The Main Model

Navet is organized around four layers:

```text
packages/
  core/
  ui/
  provider-*/
  app/
```

- `@navet/core`
  Shared contracts, IDs, types, and adapter semantics. No React. No provider SDKs.
- `@navet/ui`
  Target package boundary for provider-neutral shared React UI.
- provider packages
  Provider-specific runtime, auth, transport, mapping, and command translation.
- `@navet/app`
  Product shell, runtime selection, provider registration, settings, persistence, and boot wiring.

Home Assistant is the first implemented provider, not the application architecture.

The app runtime is multi-provider: it can retain multiple implemented provider sessions, maintain
provider-scoped state for each, and merge selected provider collections for shared dashboard use.
An active provider is still used for operations that require one provider-specific feature service.

## Current Reality

The package direction is established, but the shared UI extraction is still in flight.

- much of the active shared UI authoring surface still lives in
  `packages/app/src/components/*` and `packages/app/src/ui-kit/*`
- those app-owned paths are current implementation and stable import surfaces
- they should be treated as migration seams, not as final ownership

## Practical Rules

- shared UI should render normalized Navet data, not raw Home Assistant payloads
- provider packages should own provider auth, clients, live updates, and request translation
- the app layer should own deployment modes, session bootstrap, and product-level composition
- compatibility-only models that still exist in `@navet/app` are support code, not target public APIs

## Before An Architecture Change

Write down four facts before editing:

1. The current owner and import path.
2. The target owner, if it differs.
3. The callers and provider-specific knowledge that cross the proposed boundary.
4. The smallest extraction that improves the dependency direction without creating a second
   competing contract.

Use current code to verify implementation and these architecture docs to judge direction. Do not
move a component or type to an aspirational package solely to make the folder tree look complete.
An extraction is useful when its inputs become more provider-neutral, its forbidden dependencies
are removed, and existing composition remains explicit.

When a UI task also changes data or commands, define the normalized state or view-model boundary
before styling the component. A polished component that imports a raw provider payload is still an
architecture regression.

## Hard Boundaries

- do not let `@navet/ui` import provider-specific code
- do not move provider-specific details into `@navet/core`
- do not expose Home Assistant service payloads as the public UI command model
- do not add new shared dependencies on `HassEntity` or similar raw backend types unless the code
  is explicitly adapter-internal
- keep current Home Assistant users working while continuing to clean up boundaries

## Provider Status

- Home Assistant: implemented
- Homey: implemented
- openHAB: implemented
- Hubitat: planned (contract + registration entry only)
- SmartThings: planned (contract + registration entry only)

Implemented does not mean feature-identical. Home Assistant registers Navet's climate, media,
camera, energy, calendar, weather, notification, task, history, security, and administration
services. Homey and openHAB currently register rooms, realtime entities, lighting, switches, and
sensors. Keep that distinction visible in product and contributor documentation.

## Read Next

- [../architecture/package-boundaries.md](../architecture/package-boundaries.md)
- [../architecture/provider-contract.md](../architecture/provider-contract.md)
- [../architecture/provider-neutral-ui.md](../architecture/provider-neutral-ui.md)
- [../architecture/dashboard-profile-ownership.md](../architecture/dashboard-profile-ownership.md)
- [../testing/provider-testing-strategy.md](../testing/provider-testing-strategy.md)
