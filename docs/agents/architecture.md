# Contributor Architecture

This is the short architecture guide for contributors.

## The Important Split

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
  Shared React UI that renders normalized entities and emits generic commands.
- provider packages
  Provider-specific runtime, auth, transport, mapping, and command translation.
- `@navet/app`
  The product shell: provider registration, runtime selection, settings, persistence, and boot
  wiring.

Home Assistant is the reference provider, not the application architecture.

## What That Means In Practice

- Shared UI should render from normalized Navet data, not raw Home Assistant payloads.
- Provider packages should own provider auth, clients, live updates, and request translation.
- The app layer should own deployment modes, session bootstrap, and product-level composition.
- Compatibility models that still exist are app-internal support code, not the target shared API.

## Rules

- do not let `@navet/ui` import provider-specific code
- do not move provider-specific details into `@navet/core`
- do not expose Home Assistant service payloads as the public UI command model
- do not add new shared dependencies on `HassEntity` or similar raw backend types unless the code
  is explicitly adapter-internal
- keep current Home Assistant users working while continuing to clean up boundaries

## Current Provider Status

- Home Assistant: implemented
- Homey: implemented
- openHAB: implemented
- Hubitat: package entry point only, not a runtime provider yet
- SmartThings: package entry point only, not a runtime provider yet

## Read Next

- [../architecture/package-boundaries.md](../architecture/package-boundaries.md)
- [../architecture/provider-contract.md](../architecture/provider-contract.md)
- [../architecture/provider-neutral-ui.md](../architecture/provider-neutral-ui.md)
- [../testing/provider-testing-strategy.md](../testing/provider-testing-strategy.md)
