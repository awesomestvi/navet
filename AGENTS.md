# Navet

Navet is a smart home dashboard PWA built on React 19 + TypeScript 6 + Zustand 5 + Tailwind CSS 4.3.
Connects to Home Assistant over WebSocket.

---

## Commit Rules

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): summary`
- Valid types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`, `style`
- Summary must be lowercase, imperative mood, no period at the end
- Do not use generic or free-form commit messages
- Include a concise bullet-point body for meaningful changes so the project can track what changed between releases
- Keep bullet lists contiguous in the commit body. Do not create each bullet as a separate `git commit -m` paragraph, because that inserts blank lines between items.
- Keep commit bodies focused on user-visible behavior, architecture, tests, docs, or operational impact
- Trivial commits such as formatting-only or metadata-only changes may omit the body
- Do not use `git commit --no-verify` unless the user explicitly approves skipping hooks for that commit

---

## Commands

```bash
pnpm typecheck    # type-check without emitting
pnpm check        # Biome lint + format check
pnpm format       # Biome format (auto-fix)
pnpm check:stories # validate Storybook title, coverage, and ownership rules
pnpm check:ui-kit  # validate UI-kit import and boundary rules
pnpm test          # unit tests
pnpm storybook:build # static Storybook build for GitHub Pages
```

**Do not run `pnpm build` unless explicitly asked.**
**Do not run `pnpm typecheck` or `pnpm check` yourself** — ask the user to run them and report back.
If a commit or hook is blocked by TypeScript errors, fix the type errors instead of updating or relying on a typecheck baseline.

Storybook builds for GitHub Pages at `/navet/storybook/` via `STORYBOOK_BASE_PATH=/navet/storybook/`.
Keep manager and preview asset paths relative or base-aware; do not add root-relative `/logo.svg`
style paths in Storybook configuration.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19, TypeScript 6 (strict) |
| Build | Vite 8, pnpm |
| Styling | Tailwind CSS 4.3, Radix UI |
| State | Zustand 5 (all shared state) |
| HA Integration | home-assistant-js-websocket |
| Linting / Format | Biome 2 |

---

## Project Structure

```
src/app/
  features/        # 16 domain modules — each owns its hooks, stores, components
  components/
    ui/            # Radix UI wrappers (buttons, dialogs, selects …)
    layout/        # Header, sidebar, navigation
    primitives/    # Low-level reusable UI building blocks
    patterns/      # Composed shared UI structures
    system/        # Curated public surface for Storybook and cross-app discovery
    shared/        # App-specific shared UI + compatibility shims
    figma/         # Design integration components
  config/          # App-level configuration helpers
  constants/       # Shared constants
  stores/          # All Zustand stores (auth, config, HA, settings, theme, navigation …)
  pwa/             # PWA update state and install/update support
  services/        # HomeAssistantService — WebSocket + HA API
  hooks/           # Shared hook modules (useHomeAssistant, useDeviceMap, useCardState …)
    device-mappers/ # HA domain-specific entity-to-device mappers
    entity-utils/   # Shared HA entity parsing and formatting helpers
    theme-generators/
  session/         # Config serialization helpers
  utils/           # Pure helpers (storage, effects-quality, colors, dashboard-config)
  i18n/            # Translation files (en, sv, de, fr, es)
  marketing/       # Marketing/public-site support modules
  navigation/      # Section type and helpers
  storybook/       # Shared Storybook utilities (story-frames, story-docs)
  ui-kit/          # Storybook-facing inventory, overview, and recipe stories
  test-utils/      # Shared test helpers
  types/           # Shared app-level TypeScript types
  demo/            # GitHub Pages demo app and demo data
```

---

## Engineering Standards

These rules apply to all code written for this project. Follow them before writing, and verify against them before finishing.

### Architecture and Maintainability

- Prefer reusable, composable, detachable components over large monolithic ones.
- Keep components focused on a single responsibility.
- Extract repeated UI, logic, and utility patterns instead of duplicating them.
- Keep code scalable and easy to extend without rewriting existing functionality.
- Use clear separation of concerns: UI, state, business logic, and utilities belong in separate layers.
- New shared cross-feature UI belongs in `src/app/components/primitives/` or `src/app/components/patterns/`. Feature-specific logic stays in the feature module.
- `src/app/components/system/` is the curated public export surface, not the authoring location for new components.
- `src/app/components/shared/` is for app-specific shared UI and compatibility shims; do not default new primitives there.
- Do not add new feature-specific hooks, stores, or utilities to global folders unless they are genuinely shared across multiple features.

### React Standards

- Use modern React best practices throughout.
- Avoid unnecessary prop drilling — prefer better composition or lifting state only when needed.
- Keep state as local as possible; only lift it when multiple components need it.
- Avoid over-engineering, but do not allow quick hacks that reduce maintainability.
- Prefer predictable and consistent patterns across the codebase over one-off solutions.

### Performance

- Optimize for both high-end devices and low-power devices (tablets, Raspberry Pi, dashboards).
- Avoid unnecessary re-renders — use minimal Zustand selectors and memoize only where it provides real value.
- Avoid heavy computations during render; move them to `useMemo` or outside the component if they are expensive.
- Lazy load expensive features where appropriate (see existing `lazy()` usage in the dashboard).
- Keep DOM structure lean and avoid deep nesting.
- Be careful with animations, shadows, blur, and heavy CSS effects — they must remain smooth on weaker hardware. Flag any tradeoff where visual richness may hurt performance on low-power devices.

### Code Quality

- Follow DRY, but do not abstract prematurely — three similar lines are better than a premature abstraction.
- Prefer readability over cleverness.
- Reuse existing components, hooks, and utilities before creating new ones.
- Do not introduce duplicate utilities, hooks, or component variants unless clearly justified.
- Keep naming consistent and descriptive.

### Before Writing Code

1. Check whether an existing component, hook, utility, or pattern should be reused.
2. **Before building any new UI element, scan `src/app/components/primitives/` first.** If a primitive already covers the use case (button, slider, dialog shell, round control, card header, etc.), use it — do not re-implement it inline or in a feature folder.
3. **Before adding a new Storybook story file, check whether a story for that component already exists** — run `glob src/app/**/*.stories.*` or search for the component name. Add to an existing story file rather than creating a duplicate.
4. **Before writing new UI logic, check if unit tests already exist** — look for `__tests__/` directories next to the source. Extend existing tests before adding duplicate coverage.
5. If creating something new, make it reusable if that is realistically beneficial.
6. Explain any architectural decision that affects maintainability or performance.
7. Flag any tradeoff where visual richness may hurt performance on low-power devices.
8. Do not produce shortcut code that solves the immediate task but worsens the codebase.

### Before Finalizing Code

- Is this reusable?
- Is this consistent with existing patterns?
- Is this the simplest maintainable solution?
- Will this perform well on weaker devices?
- Does this avoid duplication?

---

## Architecture Rules

### State Management

- **All shared state is Zustand.** Do not introduce React Context for reactive state.
- Context is only for infrastructure without reactive state (e.g. `I18nProvider` in `src/app/i18n/`).
- Use selectors from `src/app/stores/selectors.ts` to subscribe to the minimum slice needed.
- Persisted stores use `persist` middleware with `createJSONStorage(() => localStorage)` and a
  `merge` function that validates before rehydrating. Never use raw `window.localStorage` in stores.
- See `docs/technical/REACT_ZUSTAND.md` for the full state management guide.

### Zustand Stores

| Store | Responsibility |
|---|---|
| `auth-store` | `isAuthenticated`, `config`, `login`, `logout` |
| `config-store` | HA connection config, `testConnection`, `saveConfig` |
| `home-assistant-store` | WebSocket connection state, entities, registries |
| `settings-store` | User preferences (persisted) |
| `theme-store` | Theme mode, accent color, wallpaper (persisted) |
| `navigation-store` | Active section, current room (persisted) |
| `edit-mode-store` | Dashboard edit mode toggle |
| `search-store` | Search query and filtered device ids |
| `error-store` | Global app error overlay (`ErrorDisplay`): `error`, `setError`, `clearError` |

### Selector Usage

```ts
// Good — minimal subscription
const connected = useHomeAssistant(homeAssistantSelectors.connected);

// Good — one subscription for a related group
const { disableAnimations, effectsQuality, weatherForecastMode } = useSettingsStore(
  settingsSelectors.displaySettings
);

// Avoid — re-renders on every store change
const store = useHomeAssistant();
```

### Service → Store Event Flow

`HomeAssistantService` emits typed events: `'entities' | 'config' | 'registries' | 'connection'`.
The store subscribes and updates only the affected slice. Do not add catch-all listeners that
copy all service state on every event.

---

## Imports and Feature Boundaries

- Import from a feature's root `index.ts` when crossing feature boundaries — never reach into its
  `components/`, `hooks/`, or `stores/` subdirectories from outside.
- Use `@/app/...` for shared app modules and cross-feature imports.
- Keep short relative imports for files inside the same small feature/module subtree.

---

## Component and File Structure

- Split large feature files into: entry component, controller hook, presentational views,
  local types/data/constants.
- Card-style features use folder modules with `index.tsx` entries:
  ```
  light-card/  hvac-card/  media-card/  vacuum-card/  weather-card/
  ```
- A controller hook should not exceed ~150 lines. Split a coherent group of state and handlers
  into its own named hook (e.g. `useOnboardingController`, `useDashboardDialogs`).
- Never call `storeInstance.setState()` from a component — use the store's own action methods.

---

## Dashboard-Specific Rules

- `src/app/features/dashboard/utils/card-renderer.tsx` is the dashboard card registry.
  Do not move card rendering registration logic back into generic `src/app/utils/`.
- Dashboard entity visibility, custom card state, card ordering, and room ordering must stay
  colocated with the dashboard feature (`src/app/features/dashboard/stores/`).

---

## Theming Rules

- Use `src/app/components/shared/theme/theme-surface-tokens.ts` for shared surface decisions.
- Do not add `theme === 'light' ? ... : ...` branches inline when a shared surface token covers it.
- Only keep local theme branches for truly feature-specific styling (domain accents, status colors).
- Tailwind CSS 4 only — no inline style objects except for dynamic numeric values
  (e.g. `style={{ width: `${pct}%` }}`).
- Glass aesthetic: `backdrop-blur-xl`, `bg-white/5–10`, `border border-white/10–20`.
- 4 themes: `glass` (default), `dark`, `light`, `black` — applied via `data-theme` on `<html>`. Persisted legacy `contrast` values are normalized to `black`.

---

## Documentation Rules

- When moving or renaming files referenced by docs, update the active docs in the same change.
- Keep these current: `README.md`, `docs/README.md`, `design-system/README.md`, `design-system/FEATURES.md`.
- Treat `docs/archive/status/*` as historical snapshots — do not rewrite them.
- If you add or reorganize stories, run `pnpm check:stories` and keep Storybook titles, coverage, and colocated story ownership valid.

---

## Publishing Rules

- CI checks run on branch pushes and pull requests.
- GitHub Pages deploys the demo at `/navet/demo/` and Storybook at `/navet/storybook/`.
- Pushes to `main` publish only developer app images: `ghcr.io/awesomestvi/navet:dev` and `sha-*`.
- Manual Publish workflow runs are for developer hardware testing and default to the `dev` app image tag.
- Public beta app images publish only from `v*-alpha.*`, `v*-beta.*`, and `v*-rc.*` tags. They update the exact tag, `beta`, `latest`, and `sha-*`.
- Home Assistant add-on images publish `dev` and `sha-*` on `main` pushes or manual workflow runs, and add-on version, `beta`, `latest`, and `sha-*` on public beta tags.
- There is no stable channel yet. Treat `latest` as the current public beta compatibility tag because existing users already consume it.

---

## Key Files

| File | Purpose |
|---|---|
| [src/app/App.tsx](src/app/App.tsx) | Root — provider tree, connection effect, global DOM attributes |
| [src/app/stores/](src/app/stores/) | All Zustand stores + selectors |
| [src/app/services/home-assistant.service.ts](src/app/services/home-assistant.service.ts) | WebSocket connection, typed event emitter |
| [src/app/stores/home-assistant-store.ts](src/app/stores/home-assistant-store.ts) | HA state — subscribes to typed service events |
| [src/app/features/dashboard/hooks/use-dashboard-controller.ts](src/app/features/dashboard/hooks/use-dashboard-controller.ts) | Dashboard coordinator hook |
| [src/app/features/dashboard/utils/card-renderer.tsx](src/app/features/dashboard/utils/card-renderer.tsx) | Dashboard card registry |
| [src/app/components/shared/theme/theme-surface-tokens.ts](src/app/components/shared/theme/theme-surface-tokens.ts) | Shared surface theme tokens |
| [src/app/hooks/use-ha-devices.ts](src/app/hooks/use-ha-devices.ts) | HA entity to device type mapping |
| [src/app/hooks/device-mappers/](src/app/hooks/device-mappers/) | Domain-specific HA device mapper modules |
| [src/app/hooks/entity-utils/](src/app/hooks/entity-utils/) | Shared HA entity parsing and formatting helpers |
| [src/app/hooks/ha-entity-utils.ts](src/app/hooks/ha-entity-utils.ts) | Compatibility barrel for entity transformation utilities |
| [src/app/hooks/ha-device-mappers.ts](src/app/hooks/ha-device-mappers.ts) | Compatibility barrel for the device mapper registry |
| [src/app/stores/selectors.ts](src/app/stores/selectors.ts) | Typed selectors for all stores |
| [src/app/storybook/story-frames.tsx](src/app/storybook/story-frames.tsx) | Shared Storybook frame utilities — `EntityCardStoryFrame`, `SettingsDialogStoryFrame`, `noopCardSizeChange` |
| [src/app/storybook/story-docs.ts](src/app/storybook/story-docs.ts) | Story-specific documentation strings |
| [src/app/ui-kit/](src/app/ui-kit/) | Storybook UI-kit discovery pages |
| [.storybook/main.ts](.storybook/main.ts) | Storybook Vite integration, static assets, and base path support |
| [docs/technical/REACT_ZUSTAND.md](docs/technical/REACT_ZUSTAND.md) | State management decision guide |
| [design-system/UI-GUIDELINES.md](design-system/UI-GUIDELINES.md) | Color system, typography, card sizes, glass effects |
| [design-system/FEATURES.md](design-system/FEATURES.md) | Feature map with test locations |

---

## Adding a New Feature

1. Create `src/app/features/<name>/` with `index.ts`, `components/`, and optionally `hooks/` and `stores/`.
2. If the feature has persisted state, create a Zustand store with `persist` middleware.
3. If the feature reads HA entities, use `useHomeAssistant(homeAssistantSelectors.entities)` —
   do not subscribe to the service directly.
4. Expose a single controller hook for the feature's root component to consume.
5. Register the feature in `src/app/features/dashboard/components/dashboard-section-router.tsx`
   using `lazy()` if it needs a top-level section.

## Adding a New Card Type

1. Add the card in `src/app/features/<domain>/components/<name>-card/` as a folder module.
2. Implement `use-<name>-card-controller.ts` that reads from the HA store and calls service methods.
3. Register in `src/app/hooks/use-ha-devices.ts` under the appropriate device type.
4. Register in `src/app/features/dashboard/utils/card-renderer.tsx`.
5. Add to the "Add card" dialog in `src/app/features/dashboard/components/add-card-dialog/`.

---

## Anti-Patterns

- Do not use `window.localStorage` directly — use `src/app/utils/storage`.
- Do not call `storeInstance.setState()` from outside the store file — use its action methods.
- Do not create React Context for shared reactive state — use Zustand.
- Do not add a catch-all HA service listener that syncs all fields on every event.
- Do not make multiple `useXyzStore(state => state.field)` calls when a combined selector exists.
- Do not make a controller hook longer than ~150 lines — split it.
- Do not import from inside a feature's subdirectories across feature boundaries — use the feature root `index.ts`.
- Do not duplicate a component, hook, or utility — check if something reusable already exists first.
- Do not solve a task with shortcut code that makes the codebase harder to maintain.
- Do not add new low-level shared UI to `src/app/components/shared/` when it should live in `primitives/` or `patterns/`.
- Do not re-implement a UI element that already exists in `src/app/components/primitives/` — always check primitives before writing new UI.
- Do not create a new `*.stories.*` file for a component that already has one — extend the existing story file instead.
- Do not place Storybook frame or utility components (e.g. `EntityCardStoryFrame`, `SettingsDialogStoryFrame`) inside feature or dashboard subdirectories — they belong in `src/app/storybook/story-frames.tsx`.
- Do not skip unit tests for shared utilities, entity mappers, or controller logic — check for existing `__tests__/` directories first.
