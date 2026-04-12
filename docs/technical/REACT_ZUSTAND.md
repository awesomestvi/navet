# React + Zustand Guide

Current state-management guidance for Navet.

## Summary

Navet uses **Zustand exclusively** for all shared client state. React Context is reserved only
for cross-cutting infrastructure concerns that have no reactive state of their own (i18n provider,
loading orchestration). Auth, config, and the global app error overlay are Zustand stores.

---

## State Layer Ownership

### Zustand stores (`src/app/stores/`)

All shared, reactive state lives here. Stores self-initialize — no provider wrappers needed.

| Store | Responsibility |
|---|---|
| `auth-store` | `isAuthenticated`, `config`, `login`, `logout` |
| `config-store` | HA connection config, `testConnection`, `saveConfig` |
| `home-assistant-store` | WebSocket connection state, entities, registries |
| `settings-store` | User preferences (persisted) |
| `theme-store` | Theme mode, accent color, wallpaper (persisted) |
| `navigation-store` | Active section, current room (persisted via Zustand persist) |
| `edit-mode-store` | Dashboard edit mode toggle |
| `search-store` | Search query and filtered device ids |
| `error-store` | Global app error overlay (`ErrorDisplay`): `error`, `setError`, `clearError` |

### React Context

Only used for providers that have no reactive state:

- `I18nProvider` (`src/app/i18n/`) — locale loading and translation function
- `AuthProvider` and `ConfigProvider` (`src/app/contexts/`) — identity pass-throughs to preserve import
  compatibility. They contain no state — all logic is in the stores.

---

## Rules

### All shared state goes in Zustand

Do not introduce new React Context for state that drives rendering. If many components need to
read or write the same value, put it in a store.

### Expose stores through hook modules

Stores should be consumed via hook wrappers (`useAuth`, `useConfig`, `useHomeAssistant`, etc.)
rather than imported and called directly with `useXyzStore(selector)` outside of `src/app/hooks/`
and `src/app/stores/`.

### Prefer typed selectors

Use selectors from `src/app/stores/selectors.ts` to subscribe to the minimum slice of state
needed. Avoid subscribing to the full store object — this re-renders on every state change.

```ts
// Good — re-renders only when connected changes
const connected = useHomeAssistant(homeAssistantSelectors.connected);

// Good — one subscription for a group of related display settings
const { disableAnimations, effectsQuality, pageZoom } = useSettingsStore(
  settingsSelectors.displaySettings
);

// Avoid — re-renders on every store change
const store = useHomeAssistant();
```

### One source of truth

- Do not maintain the same domain in both a store and local component state
- Do not duplicate persistence logic — use `createJSONStorage(() => localStorage)` inside
  the store's `persist` middleware, not raw `window.localStorage` access
- Stores own their own localStorage keys; feature components do not call `storage.set` directly

### Controller decomposition contract

Feature controller hooks should remain orchestration-focused and delegate responsibility:

- Keep entity/service synchronization in dedicated sync hooks (for example `use-*-entity-sync`,
  `use-*-runtime-state`, `use-*-on-state-sync`)
- Keep side-effectful domain actions in action hooks (`use-*-actions`, `use-*-toggle-action`)
- Keep display-only computed fields in display hooks (`use-*-display`, `use-*-display-fields`)

The controller should compose these slices and return view state, rather than accumulating large
inline sync/action/display blocks.

### Shared compact-card presentation contract

When adding or revising dense card variants:

- Reuse shared presentational primitives such as the entity title block and tiny action-card shell
- Prefer passing feature data into a shared compact shell over building new one-off tiny layouts
- Keep title/subtitle ordering explicit through the shared title block (`title-first` vs `eyebrow-first`) so compact cards stay visually consistent across domains

This keeps tiny, extra-small, and other compressed card variants aligned while still letting
features supply their own actions, metrics, and visual accents.

### Typed i18n callback contract

Use shared translator function types exported by the i18n module for hook/component dependencies
that accept `t` callbacks.

- Prefer importing `TranslateFn` from `src/app/hooks` or `src/app/i18n`
- Avoid redefining local callback signatures like `(key: string) => string`

This keeps strict `TranslationKey` typing intact across features and prevents type mismatch when
extracting helper hooks.

### Store mutation boundary

For import/restore/config-apply flows, mutate stores through explicit action methods (`apply...`,
`replace...`) rather than calling external `store.setState(...)` from feature or utility modules.

`setState` is allowed inside the store implementation itself when needed for store-internal sync
mechanics, but external callers should use store actions.
  for store-owned domains

### Persistence pattern

Use Zustand `persist` middleware for any store that needs to survive a page reload:

```ts
export const useMyStore = create<MyState>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'navet-my-key',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        // Validate and normalize persisted values before rehydrating
        return { ...current, ...sanitized };
      },
    }
  )
);
```

All persisted stores (`settings-store`, `theme-store`, `navigation-store`, `edit-mode-store`,
`dashboard-entities-store`) implement a `merge` function that validates or normalizes values
before rehydrating. Never add a persisted store without a `merge` function.

Never use the manual `subscribe` + `localStorage.setItem` pattern.

---

## Service → Store event flow

`HomeAssistantService` emits typed events: `'entities' | 'config' | 'registries' | 'connection'`.

The store subscribes via `addListener(event => ...)` and updates **only the affected slice**:

```
service emits 'entities'  →  store sets { entities }
service emits 'config'    →  store sets { config }
service emits 'registries'→  store sets { areas, deviceRegistry, entityRegistry }
service emits 'connection'→  store sets { connected, connection, connecting }
```

Do not add a generic "re-sync everything" listener. Each event type should produce a
minimal, targeted `set()` call.

---

## Decision Guide

| Scenario | Use |
|---|---|
| State read by 2+ components | Zustand store |
| State persisted across page loads | Zustand store + `persist` middleware |
| Real-time data from WebSocket | Zustand store updated via typed service events |
| Feature-scoped ephemeral UI state | `useState` / `useReducer` inside the feature hook |
| Cross-cutting lifecycle / DI | React Context (no reactive state) |

---

## Anti-patterns to avoid

- Raw `window.localStorage` access outside of `src/app/utils/storage`
- Calling `storeInstance.setState(...)` directly from a component — use the store's own actions
- Registering a catch-all listener on the HA service that copies all fields on every event
- Maintaining the same flag in both a Zustand store and a React Context
- Multiple `useXyzStore(state => state.field)` calls in the same component when a combined
  selector already exists

---

## HA entity update performance

Every HA WebSocket state change replaces the `entities` object in the store, causing
`useHADevices` to rebuild all device collections and `useDeviceMap` to produce a new
`Map`. Without stabilization this triggers a full component-tree re-render.

**`useDeviceMap` reference stabilization** — A `useRef` tracks the previous Map. On each
rebuild, each new device object is compared against its previous version (primitives by
`===`, arrays by length + `JSON.stringify`). Unchanged devices reuse their old object
reference. When no devices changed, the same Map instance is returned, collapsing the
entire cascade.

---

## Performance optimization patterns

### useShallow for multi-value subscriptions

When subscribing to multiple related values from a store, use `useShallow` from Zustand to
enable shallow equality checking instead of referential equality. This prevents re-renders
when multiple fields are extracted but only some have changed:

```ts
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '@/app/stores';

// ✅ Good — only re-renders when effectsQuality or lowPowerMode actually change
const { effectsQuality, lowPowerMode } = useSettingsStore(
  useShallow((state) => ({
    effectsQuality: state.effectsQuality,
    lowPowerMode: state.lowPowerMode,
  }))
);

// ❌ Avoid — creates new object every render, always re-renders
const { effectsQuality, lowPowerMode } = useSettingsStore(
  (state) => ({
    effectsQuality: state.effectsQuality,
    lowPowerMode: state.lowPowerMode,
  })
);
```

### Memoize complex computations and callbacks

Use `useMemo` for expensive transformations and `useCallback` for stable callback references
passed to child components or event handlers:

```ts
// ✅ Memoize derived arrays and objects
const sortableItems = useMemo(() => 
  cardIds.map((cardId) => `home-card-${cardId}`), 
  [cardIds]
);

// ✅ Memoize callback closures
const handleAddCard = useCallback(() => {
  onOpenAddCardDialog?.();
}, [onOpenAddCardDialog]);
```

### Cache Intl formatters

Intl formatters are expensive to create. Cache them in a module-level Map keyed by locale,
or memoize within components:

```ts
// Module-level cache for date/time formatters
const timeFormatterByLocale = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(locale: string): Intl.DateTimeFormat {
  const existing = timeFormatterByLocale.get(locale);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  timeFormatterByLocale.set(locale, formatter);
  return formatter;
}
```

### Theme surface token memoization

Use `useMemo` to prevent recalculation of theme surface tokens on every render:

```ts
const surface = useMemo(
  () => getThemeSurfaceTokens(theme, resolvedEffectsQuality),
  [resolvedEffectsQuality, theme]
);
```

**`RoomSection` custom memo comparator** — Default `memo` re-renders all sections
whenever `deviceMap` changes reference. The custom comparator (`areRoomSectionPropsEqual`)
only iterates `orderedIds` that belong to *this* section when checking `deviceMap` and
`customCardMap`, and compares `orderedIds` by content rather than reference. Sections
whose devices are unmodified skip re-rendering entirely when another section's device
updates.

**Per-entity selectors** — `homeAssistantSelectors.entity(id)` returns a selector that extracts a
single entity by ID. Since `home-assistant-js-websocket` preserves entity object references for
unchanged entities, Zustand's `Object.is` check means a card only re-renders when *its own* entity
changes — not when any other entity in the house updates. Use this in card controllers instead of
`homeAssistantSelectors.entities` + index lookup.

```ts
// Good — re-renders only when light.living_room changes
const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));

// Avoid — re-renders on every entity update in the house
const entities = useHomeAssistant(homeAssistantSelectors.entities);
const liveEntity = entities?.[id];
```

**`useDeferredValue` for bulk entity consumers** — Hooks that process the full entity collection
(device builders, RSS source scanners, notification watchers) should wrap their `entities`
subscription in `useDeferredValue`. React will prioritize user interactions over the rebuild and
schedule it during idle time:

```ts
const entities = useDeferredValue(useHomeAssistant(homeAssistantSelectors.entities));
```

**`useCardOrdering` identity key** — Card ordering only needs to rebuild when device IDs
or room assignments change, not on every HA state update (temperature, brightness, etc.).
A `deviceIdentityKey` string (`id:room` pairs joined) is computed from `devices` and used
to gate `buildOrders` recreation. The actual pairs are read via a `useRef` so the callback
never goes stale. This decouples ordering from HA state churn entirely.

**Edit mode `startTransition`** — Toggling edit mode causes every `DashboardCardItem` to
re-render (the `isEditMode` prop changes) and mounts ~200 new DOM nodes (remove + resize
buttons per card). Wrapping the `toggleEditMode` call in `startTransition` marks the
update as non-urgent, keeping the UI responsive on low-end hardware (RPi) while React
processes the batch in the background.

**`content-visibility: auto` on room sections (low quality mode only)** — When
`effectsQuality === 'low'`, each `RoomSection` wrapper gets `content-visibility: auto` and
`contain-intrinsic-block-size` set to the estimated section height. This tells the browser to
skip layout and paint for offscreen sections entirely. Omitted in high/medium quality modes
because `content-visibility: auto` creates a containment context that clips ambient light
bleed effects.

**`contain: layout style paint` on card wrappers** — Applied to all cards except light cards
when `ambientLightBleed` is enabled; `paint` containment clips glow effects to the card
border-box, so light cards in bleed mode use `contain: layout style` only.

**Stable event handlers** — Where multiple sibling elements share the same logical action
(for example brightness preset buttons), a single `useCallback`-memoized handler can be
passed to all buttons via `data-*` attributes and `e.currentTarget`. This produces one
function allocation instead of N closures per render.

