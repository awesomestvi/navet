# Provider-Neutral UI

This document defines what shared UI is supposed to depend on, and what it must not depend on.

## Boundary

Shared UI renders normalized Navet data and emits generic Navet commands. Provider-specific
translation happens outside the shared components.

`@navet/ui` is the target provider-neutral shared UI boundary.

Current implementation note:

- much of today’s shared UI still lives in `packages/app/src/components/*` and
  `packages/app/src/ui-kit/*`
- those paths are current implementation and stable import surfaces
- the same boundary rules still apply there

## Shared UI Inputs

Shared UI should work from:

- normalized entities
- room descriptors
- dashboard layout data
- normalized runtime status
- generic command callbacks

Mental model:

```tsx
<NavetDashboard
  entities={entities}
  rooms={rooms}
  layout={layout}
  status={status}
  onCommand={handleCommand}
/>
```

The exact props may differ. The boundary is the important part.

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

Some features still need provider-aware services, for example:

- media
- camera resources
- history
- energy
- notifications

That is acceptable. Provider-aware work should stay in provider packages, or temporarily in
app-owned compatibility seams while extraction is in flight. Shared cards should still consume a
stable view model.

## Compatibility Note

The repo still contains compatibility hooks and derived device snapshots inside `@navet/app`. They
exist to support the current product shell during ongoing cleanup. They are not the preferred API
for new shared UI work.
