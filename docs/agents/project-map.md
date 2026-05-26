# Project Map

This file summarizes Navet's stack, repository structure, key files, and common feature entry points.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8, pnpm |
| Styling | Tailwind CSS 4.3, Radix UI |
| State | Zustand 5 |
| Home Assistant integration | `home-assistant-js-websocket` |
| Linting and format | Biome 2 |

## Project Structure

```text
src/app/
  features/         # domain modules that own their hooks, stores, and components
  components/
    ui/             # Radix UI wrappers
    layout/         # header, sidebar, navigation
    primitives/     # low-level reusable UI building blocks
    patterns/       # composed shared UI structures
    system/         # curated public surface for Storybook and cross-app discovery
    shared/         # app-specific shared UI and compatibility shims
    figma/          # design integration components
  config/           # app-level configuration helpers
  constants/        # shared constants
  stores/           # shared Zustand stores
  pwa/              # PWA update support
  services/         # Home Assistant service layer
  hooks/            # shared hooks, device mappers, entity utilities
  session/          # config serialization helpers
  utils/            # pure helpers
  i18n/             # translations
  marketing/        # marketing and public-site support
  navigation/       # section types and helpers
  storybook/        # Storybook frames and docs utilities
  ui-kit/           # Storybook-facing inventory and overview stories
  test-utils/       # shared test helpers
  types/            # app-level shared types
  demo/             # GitHub Pages demo app and demo data
```

## Key Files

| File | Purpose |
|---|---|
| `src/app/App.tsx` | Root provider tree, connection effect, and global DOM attributes |
| `src/app/stores/` | Shared Zustand stores and selectors |
| `src/app/services/home-assistant.service.ts` | Home Assistant WebSocket and API integration |
| `src/app/stores/home-assistant-store.ts` | Home Assistant state store and service subscriptions |
| `src/app/features/dashboard/hooks/use-dashboard-controller.ts` | Dashboard coordinator hook |
| `src/app/features/dashboard/utils/card-renderer.tsx` | Dashboard card registry |
| `src/app/components/shared/theme/theme-surface-tokens.ts` | Shared surface theming decisions |
| `src/app/hooks/use-ha-devices.ts` | Entity-to-device-type mapping |
| `src/app/hooks/device-mappers/` | Domain-specific Home Assistant device mappers |
| `src/app/hooks/entity-utils/` | Shared entity parsing and formatting helpers |
| `src/app/stores/selectors.ts` | Typed selectors for store subscriptions |
| `src/app/storybook/story-frames.tsx` | Shared Storybook frame utilities |
| `src/app/storybook/story-docs.ts` | Story-level documentation helpers |
| `src/app/ui-kit/` | Storybook UI-kit discovery stories |
| `.storybook/main.ts` | Storybook Vite integration and base-path handling |
| `docs/technical/REACT_ZUSTAND.md` | Detailed state management guide |
| `design-system/UI-GUIDELINES.md` | Shared visual guidance |
| `design-system/FEATURES.md` | Feature map and test locations |

## Adding A New Feature

1. Create `src/app/features/<name>/` with `index.ts`, `components/`, and optionally `hooks/` and `stores/`.
2. If the feature has persisted state, create a Zustand store with `persist` middleware.
3. If the feature reads Home Assistant entities, use `useHomeAssistant(homeAssistantSelectors.entities)` instead of subscribing to the service directly.
4. Expose a single controller hook for the feature's root component.
5. Register the feature in `src/app/features/dashboard/components/dashboard-section-router.tsx` using `lazy()` if it needs a top-level section.

## Adding A New Card Type

1. Add the card in `src/app/features/<domain>/components/<name>-card/` as a folder module.
2. Implement `use-<name>-card-controller.ts` that reads from the Home Assistant store and calls service methods.
3. Register the card in `src/app/hooks/use-ha-devices.ts` under the appropriate device type.
4. Register the renderer in `src/app/features/dashboard/utils/card-renderer.tsx`.
5. Add the card to the add-card dialog in `src/app/features/dashboard/components/add-card-dialog/`.

## Anti-Patterns

- Do not use `window.localStorage` directly.
- Do not call `storeInstance.setState()` from outside the owning store file.
- Do not create React Context for shared reactive app state.
- Do not add a catch-all Home Assistant service listener that syncs all fields on every event.
- Do not make multiple store subscriptions when a combined selector exists.
- Do not make a controller hook longer than about 150 lines.
- Do not import from another feature's internals across feature boundaries.
- Do not duplicate components, hooks, utilities, or stories without checking existing surfaces first.
