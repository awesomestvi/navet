# Provider Contract

This document describes the shared contract that all providers plug into.

## The Goal

Navet's shared UI should not care whether the active backend is Home Assistant, Homey, or openHAB.
Providers normalize their state into Navet types and translate Navet commands back into native
requests.

## Shared Shape

At a high level, a provider package provides two related layers:

- A contract surface used by app/runtime wiring.
- A command adapter (`SmartHomeProviderAdapter`) used by UI interactions to execute commands.

The contract API is currently:

```ts
type NavetProviderContract = {
  providerId: IntegrationProviderId;
  bootstrapSession?: (sessions: NavetProviderSessionMap) => NavetProviderSession | null;
  initializeSession?: (session: NavetProviderSessionInput) => Promise<void>;
  attachRuntimeBridge?: (bridge: unknown) => void;
  teardownSession?: () => void;
  getState(): NavetProviderState;
  subscribeState?: (listener: () => void) => () => void;
  resolveResource?: (
    request: NavetResourceResolveRequest
  ) => Promise<ResolvedPlatformResource> | ResolvedPlatformResource;
  normalizeResourceUrl?: (resourceUrl: string) => string | null;
};
```

`createSnapshotBackedProviderAdapter` in `@navet/core` currently turns contract state into a
`SmartHomeProviderAdapter` with `connect/disconnect/listEntities/getEntity/execute/subscribeToEvents`.

## What The Shared Contract Carries

- normalized entities
- room and room-descriptor data
- provider availability and hydration status
- entity lookup
- generic command execution
- live updates through subscriptions

## What It Does Not Carry

- Home Assistant `domain/service/entity_id` payloads
- provider SDK clients
- deployment-specific auth details
- compatibility snapshots used only inside the app shell

## Package Responsibilities

### `@navet/core`

Owns:

- `NavetEntity`
- `NavetCommand`
- `CommandResult`
- provider IDs and identifier helpers
- shared provider contract types
- contract test helpers

### Provider packages

Own:

- session bootstrap appropriate to that provider
- raw payload mapping
- command translation
- event and subscription translation
- provider-local runtime helpers

### `@navet/app`

Owns:

- provider registration
- runtime selection
- settings and persistence
- session bootstrap wiring
- any remaining compatibility-only derived state

## Current Providers

- Home Assistant: implemented (first stable provider)
- Homey: implemented
- openHAB: implemented
- Hubitat: planned (contract + registration entry only)
- SmartThings: planned (contract + registration entry only)

## Testing Expectations

Every implemented provider should cover:

- state retrieval
- bootstrap/initialize session and disconnect lifecycle
- entity lookup and entity diffing through state subscriptions
- add, update, remove, and unsubscribe behavior in state updates
- resource resolution and fallback behavior where supported
- provider unavailable and malformed payload behavior

Every adapter-layer command surface should cover:

- supported command execution
- unsupported command rejection

The contract should stay small. Do not widen it just to mirror one backend.
