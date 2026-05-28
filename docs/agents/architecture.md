# Architecture

This file defines Navet's architecture constraints, state rules, feature boundaries, and dashboard-specific structure.

## Canonical Direction

- [`../technical/multi-backend-migration-guide.md`](../technical/multi-backend-migration-guide.md) is the canonical architecture reference for major refactors and new integration work.
- Navet uses a backend-agnostic core where UI, dashboard state, and interactions depend on Navet-owned contracts rather than backend raw payloads.
- Home Assistant remains a first-class backend, but it is one adapter inside the broader architecture.
- Do not add new UI dependencies on `HassEntity` or other backend raw types unless the code is adapter-internal.
- Prefer `IntegrationProviderId`, `NavetDevice`, `NavetRoom`, `NavetProviderSnapshot`, `NavetProviderContract`, and provider-scoped IDs when describing or extending architecture.

## State Management Model

- All shared app state is Zustand. Do not introduce React Context for general reactive app state.
- Runtime auth and session handling lives in `src/auth/AuthProvider.tsx` because it owns OAuth, ingress, and provider session bootstrapping.
- Context is otherwise only for infrastructure without general shared app state, such as `I18nProvider` in `src/app/i18n/`.
- Use selectors from `src/app/stores/selectors.ts` to subscribe to the minimum slice needed.
- Persisted stores use `persist` middleware with `createJSONStorage(() => localStorage)` and a `merge` function that validates before rehydrating.
- Never use raw `window.localStorage` in stores.
- See [../technical/REACT_ZUSTAND.md](../technical/REACT_ZUSTAND.md) for the full state management guide.

## Runtime Surfaces

- `src/app/stores/integration-store.ts` is the main cross-provider runtime/store surface.
- `src/app/hooks/use-provider-runtime.ts` is the preferred read interface for provider runtime state.
- `src/app/stores/home-assistant-store.ts` is a provider-specific runtime slice that feeds the broader integration runtime.
- `src/app/infrastructure/home-assistant/` contains Home Assistant adapter-specific auth, runtime, transport, media, and resource infrastructure.
- `src/app/core/` contains Navet-owned domain contracts and mapping layers.
- `src/app/platform/` contains provider feature abstractions and capability-oriented interfaces.

## Zustand Stores

| Store | Responsibility |
|---|---|
| `integration-store` | Cross-provider runtime state, provider sessions, provider health, and normalized provider snapshots |
| `home-assistant-store` | WebSocket connection state, entities, registries |
| `settings-store` | User preferences |
| `theme-store` | Theme mode, accent color, wallpaper |
| `navigation-store` | Active section and current room |
| `edit-mode-store` | Dashboard edit mode toggle |
| `search-store` | Search query and filtered device ids |
| `error-store` | Global app error overlay state |

## Selector Usage

```ts
const connected = useProviderRuntime(providerRuntimeSelectors.connected);

const { disableAnimations, effectsQuality, weatherForecastMode } = useSettingsStore(
  settingsSelectors.displaySettings
);

// Avoid
const store = useProviderRuntime();
```

Use minimal subscriptions. Avoid broad store reads that re-render on unrelated changes.

## Service To Store Event Flow

- `HomeAssistantService` emits typed events: `'entities' | 'config' | 'registries' | 'connection'`.
- `home-assistant-store` subscribes and updates only the affected Home Assistant slice.
- `integration-store` aggregates provider-specific runtime and Navet-owned snapshots into the broader runtime contract.
- Do not add catch-all listeners that copy all service state on every event.
- Do not treat provider-specific service events as the long-term public app architecture.

## Imports And Feature Boundaries

- Import from a feature's root `index.ts` when crossing feature boundaries.
- Never reach into another feature's `components/`, `hooks/`, or `stores/` subdirectories from outside that feature.
- Use `@/app/...` for shared app modules and cross-feature imports.
- Keep short relative imports for files inside the same small feature or module subtree.
- Prefer Navet-owned and provider/runtime abstraction modules before importing backend-specific types into shared UI or dashboard code.

## Component And File Structure

- Split large feature files into entry components, controller hooks, presentational views, and local types, data, or constants.
- Card-style features use folder modules with `index.tsx` entries.
- A controller hook should not exceed about 150 lines. Split coherent groups of state and handlers into named hooks.
- Never call `storeInstance.setState()` from a component. Use the store's own action methods.
- Cards and shared UI should render capabilities and normalized state, not backend-specific payload assumptions.

## Dashboard-Specific Rules

- `src/app/features/dashboard/utils/card-renderer.tsx` is the dashboard card registry. Do not move card rendering registration logic back into generic `src/app/utils/`.
- Dashboard entity visibility, custom card state, card ordering, and room ordering must stay colocated with the dashboard feature in `src/app/features/dashboard/stores/`.

## Related Guidance

- Feature and card entry points live in [project-map.md](project-map.md).
- Shared UI and theming rules live in [ui-and-theming.md](ui-and-theming.md).
