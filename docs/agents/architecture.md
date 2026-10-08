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

Home Assistant is the reference adapter for Navet’s provider contracts.

The app runtime is multi-provider: it can retain multiple implemented provider sessions, maintain
provider-scoped state for each, and merge selected provider collections for shared dashboard use.
Product features use selected entities and their owning providers, with availability drawn from
connected providers. Sources are selected per feature and actions reach the owning adapter.

## Current Reality

Shared UI authoring and stable imports currently live in
`packages/app/src/components/*` and `packages/app/src/ui-kit/*`. Provider-neutral extractions
target `@navet/ui` when the selected task calls for them.

## Contract vocabulary

- Use `IntegrationProviderId`, `SmartHomeProviderAdapter`, `NavetEntity`, `NavetCommand`,
  `CommandResult`, scoped/canonical IDs, runtime, contracts, capabilities, feature services and resource resolution.
  `NavetDevice`, `NavetRoom`, `NavetRoomDescriptor`, `NavetProviderSnapshot` are app compatibility models.

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

## Provider capabilities

Home Assistant is the reference adapter; Homey and openHAB expose their supported subsets.
Hubitat and SmartThings are catalog-only. Use the [capability matrix](../integrations.md#capability-matrix)
and each provider's runtime registration for specific coverage; implemented does not mean parity.

## Read Deeper Only When Needed

This overview is sufficient for ordinary architecture work. Open one deeper document only when
the change touches its interface:

- package imports or ownership: [package boundaries](../architecture/package-boundaries.md)
- adapter or command shape: [provider contract](../architecture/provider-contract.md)
- shared rendering inputs: [provider-neutral UI](../architecture/provider-neutral-ui.md)
- dashboard persistence and sync: [dashboard profile ownership](../architecture/dashboard-profile-ownership.md)
- compatibility reads: [persisted-data migrations](../architecture/persisted-data-migrations.md)
- provider test layers: [provider testing strategy](../testing/provider-testing-strategy.md)
