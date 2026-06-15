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

## Read Next

- [../architecture/package-boundaries.md](../architecture/package-boundaries.md)
- [../architecture/provider-contract.md](../architecture/provider-contract.md)
- [../architecture/provider-neutral-ui.md](../architecture/provider-neutral-ui.md)
- [../testing/provider-testing-strategy.md](../testing/provider-testing-strategy.md)
