# Provider Contract

This document describes the shared contract that all providers plug into.

## The Goal

Navet's shared UI should not care whether the active backend is Home Assistant, Homey, or openHAB.
Providers normalize their state into Navet types and translate Navet commands back into native
requests.

## Shared Shape

At a high level, a provider package provides two related layers:

- A small state/resource contract used by app/runtime wiring.
- A command adapter (`SmartHomeProviderAdapter`) used by UI interactions to execute commands.
- A runtime registration that declares capability flags, a feature matrix, and optional richer
  feature services.

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

## What The Small Contract Carries

- normalized entities
- room and room-descriptor data
- provider availability and hydration status
- entity lookup
- generic command execution
- live updates through subscriptions

## What Runtime Registration Adds

`IntegrationProviderRuntimeRegistration` sits beside the small contract. It declares whether a
provider is implemented or planned, publishes the dashboard feature matrix, and may register
provider-owned services for media, lights, native actions, cameras, security, climate, rooms and
entities, history, energy, calendars, weather, notifications, tasks, and entity runtime access.

Keeping these services out of `NavetProviderContract` prevents the base contract from growing into
a mirror of Home Assistant. Shared feature UI asks the app/runtime seam for an optional service and
must handle its absence.

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
- provider feature-service implementations, including native automation inspection and creation
  where the provider supports those operations

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

Current runtime feature scope:

| Capability group | Home Assistant | Homey | openHAB |
|---|---:|---:|---:|
| rooms, realtime entities, lighting, switches, sensors | Yes | Yes | Yes |
| climate, media, cameras, energy, calendar, weather | Yes | No | No |
| notifications, tasks, history, security, administration | Yes | No | No |

The app may keep multiple implemented sessions connected at once. Provider-scoped IDs and
provider-owned state remain separate; selected provider collections are merged for dashboard use,
while an active provider resolves operations that require a single feature-service owner.

## Testing Expectations

Every implemented provider should cover:

- state retrieval
- bootstrap/initialize session and disconnect lifecycle
- entity lookup and entity diffing through state subscriptions
- add, update, remove, and unsubscribe behavior in state updates
- resource resolution and fallback behavior where supported
- feature-service behavior exposed by that provider, such as task automation details, automation
  triggering, and optional habit-rule automation creation
- provider unavailable and malformed payload behavior

Every adapter-layer command surface should cover:

- supported command execution
- unsupported command rejection

The contract should stay small. Do not widen it just to mirror one backend.
