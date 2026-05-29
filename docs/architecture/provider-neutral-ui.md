# Provider-Neutral UI

This document covers the rules for shared UI.

## Core Idea

Shared UI renders normalized Navet data and emits generic Navet commands. Provider-specific
translation happens outside the shared components.

## Shared UI Inputs

Shared UI should work from:

- normalized entities
- room descriptors
- dashboard layout data
- normalized runtime status
- generic command callbacks

A simplified mental model looks like this:

```tsx
<NavetDashboard
  entities={entities}
  rooms={rooms}
  layout={layout}
  status={status}
  onCommand={handleCommand}
/>
```

The exact props may differ. The important part is the boundary.

## Do

- render from normalized entity types, state, capabilities, attributes, and resources
- keep shared cards reusable across providers
- use provider-neutral view models for advanced cards when raw entities are not enough

## Do Not

- import provider packages into shared UI
- import raw Home Assistant payload types
- emit service-style payloads from UI components
- branch on backend-specific naming conventions as the main behavior model

## Advanced Features

Some features still need provider-aware services, for example:

- media
- camera resources
- history
- energy
- notifications

That is fine. The provider-aware work should stay in provider packages or app-owned services. The
shared card should still consume a stable view model.

## Compatibility Note

The repo still contains compatibility hooks and derived device snapshots. They exist to support the
current app shell and migration leftovers. They are not the preferred API for new shared UI work.
