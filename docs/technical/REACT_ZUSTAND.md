# React + Zustand Guide

Current state-management guidance for Navet.

## Summary

Navet uses Zustand for shared reactive app state.

Runtime authentication and session bootstrap live in `src/auth/AuthProvider.tsx`, not in a general
purpose auth store. That is the main architectural exception because auth spans runtime detection,
provider selection, session refresh, and logout behavior across multiple deployment modes.

Read [`multi-backend-migration-guide.md`](multi-backend-migration-guide.md) together with this
document when state work touches provider boundaries or runtime ownership.

## State Ownership

### Shared Zustand stores

Current shared store surfaces live under `src/app/stores/`:

| Store | Responsibility |
|---|---|
| `integration-store.ts` | Cross-provider runtime state, provider sessions, provider health, normalized provider snapshots, canonical device map, room map, room descriptors, current integration user |
| `home-assistant-store.ts` | Home Assistant provider connection state, entities, config, registries |
| `settings-store.ts` | Persisted user preferences |
| `theme-store.ts` | Theme mode, accent color, wallpapers, and appearance state |
| `navigation-store.ts` | Active section and room navigation state |
| `edit-mode-store.ts` | Dashboard edit-mode state |
| `search-store.ts` | Search state and filtered IDs |
| `error-store.ts` | Global app error state |

Feature-owned persisted stores also exist under feature directories, for example dashboard layout
and custom-card state under `src/app/features/dashboard/stores/`.

### Runtime auth context

`src/auth/AuthProvider.tsx` owns:

- runtime detection
- active provider session
- session map
- login
- logout
- refresh
- provider switching
- session replacement for recovery flows

Use `useAuthSession()` or the smaller exported auth hooks when the work is truly auth- or
session-specific.

### Other React Context

React Context is reserved for infrastructure providers that are not the general shared app-state
system, such as i18n.

Do not introduce new React Context for shared dashboard, feature, or provider runtime state.

## Store Access Rules

- Prefer selectors from `src/app/stores/selectors.ts`.
- Prefer app-facing hooks such as `useProviderRuntime`, `useIntegrationStore`, `useSettingsStore`,
  and `useHomeAssistant` instead of broad direct subscriptions.
- Keep subscriptions narrow.
- Do not subscribe to a full store object when a selector already exists.

```ts
const currentRuntime = useIntegrationStore(
  providerRuntimeSelectors.currentProviderRuntime
);

const { disableAnimations, effectsQuality } = useSettingsStore(
  settingsSelectors.displaySettings
);
```

Avoid:

```ts
const store = useIntegrationStore();
```

## Current Runtime Flow

The current runtime model is layered:

1. `AuthProvider` resolves runtime and active session state.
2. Provider-specific services and infrastructure manage transport and provider data.
3. `home-assistant-store.ts` tracks Home Assistant provider state.
4. `integration-store.ts` aggregates provider runtime state and normalized snapshots.
5. Shared hooks and feature controllers read normalized state for UI behavior.

This means Home Assistant services and stores are real implementation details, but not the public
shared architecture for all features.

## Service To Store Flow

Current Home Assistant service flow:

- `src/app/services/home-assistant.service.ts` is the main Home Assistant facade.
- It emits typed updates such as `entities`, `config`, `registries`, and `connection`.
- `src/app/stores/home-assistant-store.ts` updates only the affected slice.
- `src/app/stores/integration-store.ts` derives provider runtime state and normalized provider
  snapshots from provider-specific data.

Do not add catch-all "sync everything" listeners that copy every field on every event.

## Persistence Rules

- Use Zustand `persist` middleware for persisted store state.
- Use `createJSONStorage(() => localStorage)` for browser-backed persistence.
- Validate or normalize persisted values before rehydrating.
- Keep store-owned storage keys and migration logic inside the store layer.
- Do not use raw `window.localStorage` directly in components or arbitrary utilities.

## Mutation Rules

- Mutate store-owned state through store actions.
- Do not call `storeInstance.setState(...)` from components or feature utilities.
- Keep imperative data-loading logic in services, adapters, or controller hooks rather than inside
  generic primitives.

## Feature Controller Rules

Feature controllers should orchestrate state instead of owning every detail inline.

- keep synchronization logic in dedicated hooks
- keep action logic in dedicated hooks or service facades
- keep derived display data in display hooks or pure helpers
- keep provider-specific assumptions out of shared controllers where a provider seam already exists

## Anti-Patterns

Do not:

- introduce React Context for general shared state
- mirror the same state in both local component state and a store without a clear reason
- register provider service listeners that resync all fields on every update
- use Home Assistant stores as the app-wide long-term public contract
- bypass normalized provider state when shared UI already has a provider-agnostic path

## Related Docs

- `docs/technical/multi-backend-migration-guide.md`
- `docs/agents/architecture.md`
- `docs/agents/testing.md`
- `ai/skills/testing-architecture.md`
