# Provider-Neutral UI

This document defines what shared UI is supposed to depend on, and what it must not depend on.

## Boundary

Shared UI renders normalized Navet data and emits generic Navet commands. Provider-specific
translation happens outside the shared components.

`@navet/ui` is the target provider-neutral shared UI boundary.

Current implementation note:

- shared UI is authored in `packages/app/src/components/*` and
  `packages/app/src/ui-kit/*`
- those paths are current implementation and stable import surfaces
- these paths follow the same boundary rules

## Shared UI Inputs

Shared UI should work from:

- normalized entities
- room descriptors
- dashboard layout data
- normalized runtime status
- generic command callbacks

Those inputs may contain entities from multiple selected providers. Shared UI must preserve
provider-scoped/canonical identity and route commands to the entity's owning provider.

## Do

- render from normalized entity types, state, capabilities, attributes, and resources
- keep shared cards reusable across providers
- use provider-neutral view models for advanced cards when raw entities are not enough
- treat app-owned shared UI as `@navet/ui`-shaped work, even when the extraction is not complete

## Do Not

- import provider packages into shared UI
- import raw Home Assistant payload types
- emit service-style payloads from UI components
- branch on backend-specific naming conventions as the main behavior model

## Provider-Aware Work

Features use provider-owned services for:

- media
- camera resources
- history
- energy
- notifications

Provider packages own these services. App-owned compatibility seams are documented in the
[package boundaries](package-boundaries.md); shared cards consume a stable view model.

See [media-dashboard-provider-limitations.md](media-dashboard-provider-limitations.md) for the
current media dashboard boundary, provider behavior, resource handling, and known limits.

## Compatibility Note

Compatibility hooks and derived device snapshots inside `@navet/app` support the product shell.
New shared UI uses the normalized inputs and command boundary described above.
