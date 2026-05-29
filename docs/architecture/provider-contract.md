# Provider Contract

This document describes the shared contract that all providers plug into.

## The Goal

Navet's shared UI should not care whether the active backend is Home Assistant, Homey, or openHAB.
Providers normalize their state into Navet types and translate Navet commands back into native
requests.

## Shared Shape

At a high level, a provider needs to do six things:

```ts
type NavetProviderContract = {
  connect(session: ProviderSession): Promise<void>;
  disconnect(): Promise<void>;
  getState(): NavetProviderState;
  subscribeState(listener: () => void): () => void;
  getEntity(id: string): Promise<NavetEntity | null>;
  execute(command: NavetCommand): Promise<CommandResult>;
};
```

The exact helper names in the repo vary a little, but this is the model contributors should have
in mind.

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

- Home Assistant: implemented reference provider
- Homey: implemented
- openHAB: implemented
- Hubitat: not available yet
- SmartThings: not available yet

## Testing Expectations

Every implemented provider should cover:

- connect and disconnect
- state retrieval
- entity lookup
- supported command execution
- unsupported command rejection
- add, update, remove, and unsubscribe behavior
- provider unavailable and malformed payload behavior

The contract should stay small. Do not widen it just to mirror one backend.
