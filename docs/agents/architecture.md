# Architecture

This file defines Navet's architecture constraints, state rules, feature boundaries, and dashboard-specific structure.

## State Management

- All shared app state is Zustand. Do not introduce React Context for general reactive app state.
- Runtime auth and session handling lives in `src/auth/AuthProvider.tsx` because it owns OAuth, ingress, and Home Assistant panel adapters.
- Context is otherwise only for infrastructure without general shared app state, such as `I18nProvider` in `src/app/i18n/`.
- Use selectors from `src/app/stores/selectors.ts` to subscribe to the minimum slice needed.
- Persisted stores use `persist` middleware with `createJSONStorage(() => localStorage)` and a `merge` function that validates before rehydrating.
- Never use raw `window.localStorage` in stores.
- See [../technical/REACT_ZUSTAND.md](../technical/REACT_ZUSTAND.md) for the full state management guide.

## Zustand Stores

| Store | Responsibility |
|---|---|
| `home-assistant-store` | WebSocket connection state, entities, registries |
| `settings-store` | User preferences |
| `theme-store` | Theme mode, accent color, wallpaper |
| `navigation-store` | Active section and current room |
| `edit-mode-store` | Dashboard edit mode toggle |
| `search-store` | Search query and filtered device ids |
| `error-store` | Global app error overlay state |

## Selector Usage

```ts
const connected = useHomeAssistant(homeAssistantSelectors.connected);

const { disableAnimations, effectsQuality, weatherForecastMode } = useSettingsStore(
  settingsSelectors.displaySettings
);

// Avoid
const store = useHomeAssistant();
```

Use minimal subscriptions. Avoid broad store reads that re-render on unrelated changes.

## Service To Store Event Flow

- `HomeAssistantService` emits typed events: `'entities' | 'config' | 'registries' | 'connection'`.
- The store subscribes and updates only the affected slice.
- Do not add catch-all listeners that copy all service state on every event.

## Imports And Feature Boundaries

- Import from a feature's root `index.ts` when crossing feature boundaries.
- Never reach into another feature's `components/`, `hooks/`, or `stores/` subdirectories from outside that feature.
- Use `@/app/...` for shared app modules and cross-feature imports.
- Keep short relative imports for files inside the same small feature or module subtree.

## Component And File Structure

- Split large feature files into entry components, controller hooks, presentational views, and local types, data, or constants.
- Card-style features use folder modules with `index.tsx` entries.
- A controller hook should not exceed about 150 lines. Split coherent groups of state and handlers into named hooks.
- Never call `storeInstance.setState()` from a component. Use the store's own action methods.

## Dashboard-Specific Rules

- `src/app/features/dashboard/utils/card-renderer.tsx` is the dashboard card registry. Do not move card rendering registration logic back into generic `src/app/utils/`.
- Dashboard entity visibility, custom card state, card ordering, and room ordering must stay colocated with the dashboard feature in `src/app/features/dashboard/stores/`.

## Related Guidance

- Feature and card entry points live in [project-map.md](project-map.md).
- Shared UI and theming rules live in [ui-and-theming.md](ui-and-theming.md).
