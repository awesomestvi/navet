# Navet

Navet is a smart home dashboard PWA built with React 19, TypeScript 6, Zustand 5, Tailwind CSS 4.2,
and Vite 8. It connects directly to Home Assistant over WebSocket and is designed to stay usable on
both desktop-class hardware and lower-power wall panels.

Current release channel: `0.1.0-beta.2`

See [docs/VERSIONING.md](docs/VERSIONING.md) for release policy and bump rules.

## Overview

Navet is organized around three product goals:

- a dashboard-first Home Assistant experience with editable entity cards, rooms, and custom widgets
- a shared UI system backed by primitives, patterns, theme helpers, and Storybook coverage
- predictable architecture with feature-owned modules, Zustand-only shared state, and typed service events

## Product Surface

### Main sections

Top-level sections are defined in [`src/app/navigation/sections.ts`](src/app/navigation/sections.ts):

- `home`
- `energy`
- `security`
- `tasks`
- `locks`
- `lights`
- `media`
- `settings`

Routing and lazy-loading are coordinated by
[`src/app/features/dashboard/components/dashboard-section-router.tsx`](src/app/features/dashboard/components/dashboard-section-router.tsx).

### Home dashboard

The home section is the main editable canvas. It currently supports:

- room-driven navigation with `All` and per-room views
- sectioned and flow-style layouts for the `All` room
- entity cards plus custom widgets stored alongside dashboard layout state
- card resizing, room reassignment, ordering, and visibility control
- import/export of local dashboard configuration

### Domain sections

- `energy`: energy dashboard, setup wizard, and an energy-only custom-widget band
- `security`: camera-oriented section, cover cards, and lock cards
- `tasks`: Home Assistant automation/task summaries grouped into actionable sections
- `locks`: lock-focused section built on the shared device-section shell
- `lights`: all-lights overview using the shared dashboard all-view grid
- `media`: grouped media section with dedicated audio and TV handling
- `settings`: appearance, localization, dashboard, interaction, system, and project settings

### Entity and widget coverage

Navet currently includes first-class card or section support for:

- lights and switches
- climate/HVAC
- media players and TV remotes
- locks
- cameras
- covers
- calendars
- weather
- people/presence
- sensors and grouped sensor displays
- scenes and script-like actions
- vacuums
- RSS/news feeds
- energy dashboards and derived energy widgets

Current home custom-widget types are defined in
[`src/app/features/dashboard/stores/custom-cards-store.ts`](src/app/features/dashboard/stores/custom-cards-store.ts):

- `rss`
- `photo`
- `note`
- `battery`
- `energy-now`
- `button`
- `map`

## Tech Stack

| Layer | Tooling |
|---|---|
| App | React 19 |
| Language | TypeScript 6 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4.2 |
| UI primitives | Radix UI |
| Build | Vite 8 |
| Smart-home integration | `home-assistant-js-websocket` |
| Mapping | `leaflet` + `react-leaflet` |
| Notifications | `sonner` |
| Formatting and linting | Biome 2 |
| Unit testing | Vitest 4 |
| Visual workshop | Storybook 10 |
| PWA runtime | `vite-plugin-pwa` + `workbox-window` |

## Architecture

### Feature-owned modules

Primary feature folders under [`src/app/features/`](src/app/features/) currently include:

- `auth`
- `calendar`
- `climate`
- `dashboard`
- `energy`
- `lighting`
- `media`
- `notifications`
- `person`
- `rss`
- `scenes`
- `security`
- `sensors`
- `settings`
- `tasks`
- `vacuum`
- `weather`

There is also a `power/` folder in the tree, but it is not currently an active feature entrypoint.

Cross-feature UI lives under [`src/app/components/`](src/app/components/):

- `primitives/` for low-level reusable UI
- `patterns/` for composed shared structures
- `system/` for curated exports and token stories
- `shared/` for app-specific shared UI and compatibility shims
- `layout/` for app-shell and section-level composition
- `ui/` for wrapper components around UI libraries
- `figma/` for design-integration helpers

### Shared state and services

- All shared reactive state lives in Zustand stores under [`src/app/stores/`](src/app/stores/)
- Current store files include `auth-store`, `config-store`, `edit-mode-store`, `error-store`,
  `home-assistant-store`, `navigation-store`, `search-store`, `settings-store`, and `theme-store`
- Shared subscriptions should go through [`src/app/stores/selectors.ts`](src/app/stores/selectors.ts)
- Home Assistant integration flows through
  [`src/app/services/home-assistant.service.ts`](src/app/services/home-assistant.service.ts)
- The service emits typed updates for entities, registries, config, and connection state
- React Context is reserved for infrastructure concerns such as i18n rather than shared app state

See [docs/technical/REACT_ZUSTAND.md](docs/technical/REACT_ZUSTAND.md) for the state-management contract.

### Key source files

| File | Role |
|---|---|
| [`src/app/App.tsx`](src/app/App.tsx) | Root shell, auth split, HA bootstrap, DOM sync, and PWA wiring |
| [`src/app/navigation/sections.ts`](src/app/navigation/sections.ts) | Section registry and URL/path helpers |
| [`src/app/features/dashboard/components/dashboard-section-router.tsx`](src/app/features/dashboard/components/dashboard-section-router.tsx) | Top-level section router |
| [`src/app/features/dashboard/utils/card-renderer.tsx`](src/app/features/dashboard/utils/card-renderer.tsx) | Entity-card registry for the dashboard |
| [`src/app/features/dashboard/stores/custom-cards-store.ts`](src/app/features/dashboard/stores/custom-cards-store.ts) | Custom-widget persistence and migration |
| [`src/app/components/layout/device-section-layout.tsx`](src/app/components/layout/device-section-layout.tsx) | Shared shell for domain-specific entity sections |
| [`src/app/components/shared/theme/`](src/app/components/shared/theme/) | Theme, surface, readable-text, and card-state helpers |
| [`src/app/hooks/use-ha-devices.ts`](src/app/hooks/use-ha-devices.ts) | Home Assistant entity-to-device mapping |
| [`src/app/storybook/story-frames.tsx`](src/app/storybook/story-frames.tsx) | Shared Storybook frame helpers |
| [`src/app/storybook/story-docs.ts`](src/app/storybook/story-docs.ts) | Shared Storybook docs descriptions |

## Setup

### Prerequisites

- Node.js 18+
- `pnpm`
- a running Home Assistant instance
- a Home Assistant long-lived access token

### Install

```bash
git clone https://github.com/awesomestvi/navet.git
cd navet
pnpm install
```

### Environment

Create `.env` from the example file:

```bash
cp .env.example .env
```

Set:

```env
NAVET_HASS_URL=http://your-home-assistant:8123
NAVET_HASS_TOKEN=your-long-lived-access-token
```

### Local development

Run the app:

```bash
pnpm dev
```

Optional local hostname setup:

```text
127.0.0.1 navet.local
```

Then open `http://navet.local:5173` unless Vite reports a different port.

### Production-style preview

Use the preview flow when you need the generated runtime config and production bundle behavior:

```bash
pnpm preview
```

This builds the app, writes `dist/config.js`, and serves the bundle on `http://localhost:4173`.

## Commands

### App and Storybook

```bash
pnpm dev
pnpm preview
pnpm storybook
pnpm storybook:build
pnpm check:stories
```

### Quality and tests

```bash
pnpm test
pnpm test:coverage
pnpm test:storybook
pnpm format
pnpm check
pnpm typecheck
```

### Utility scripts

```bash
pnpm check:ui-kit
pnpm report:ui-kit
pnpm check:lockfile
pnpm clean:root
pnpm clean:all
```

## Testing and Review Workflow

### Unit tests

Navet uses Vitest for unit coverage of shared utilities, stores, hooks, controller seams, and selected
feature logic.

Shared test support currently lives in:

- [`src/setupTests.ts`](src/setupTests.ts)
- [`src/test/render.tsx`](src/test/render.tsx)
- [`src/test/store-reset.ts`](src/test/store-reset.ts)
- [`src/test/browser-mocks.ts`](src/test/browser-mocks.ts)
- [`src/test/factories/home-assistant-service-stub.ts`](src/test/factories/home-assistant-service-stub.ts)
- [`src/test/mocks/virtual-pwa-register.ts`](src/test/mocks/virtual-pwa-register.ts)

Active co-located `__tests__/` directories currently include:

- [`src/app/components/layout/__tests__/`](src/app/components/layout/__tests__)
- [`src/app/components/system/tokens/__tests__/`](src/app/components/system/tokens/__tests__)
- [`src/app/features/calendar/components/calendar/__tests__/`](src/app/features/calendar/components/calendar/__tests__)
- [`src/app/features/dashboard/components/__tests__/`](src/app/features/dashboard/components/__tests__)
- [`src/app/features/dashboard/hooks/__tests__/`](src/app/features/dashboard/hooks/__tests__)
- [`src/app/features/energy/components/dashboard/__tests__/`](src/app/features/energy/components/dashboard/__tests__)
- [`src/app/features/energy/components/energy-setup-wizard/__tests__/`](src/app/features/energy/components/energy-setup-wizard/__tests__)
- [`src/app/features/energy/utils/__tests__/`](src/app/features/energy/utils/__tests__)
- [`src/app/features/lighting/components/light-card/__tests__/`](src/app/features/lighting/components/light-card/__tests__)
- [`src/app/features/media/components/media-card/__tests__/`](src/app/features/media/components/media-card/__tests__)
- [`src/app/features/rss/components/rss-feed-card/__tests__/`](src/app/features/rss/components/rss-feed-card/__tests__)
- [`src/app/features/tasks/components/__tests__/`](src/app/features/tasks/components/__tests__)
- [`src/app/features/tasks/utils/__tests__/`](src/app/features/tasks/utils/__tests__)
- [`src/app/hooks/__tests__/`](src/app/hooks/__tests__)
- [`src/app/stores/__tests__/`](src/app/stores/__tests__)
- [`src/app/utils/__tests__/`](src/app/utils/__tests__)

### Storybook

Storybook is the main visual review surface for:

- shared tokens and theme behavior
- primitives and patterns
- card shells and card variants
- settings sections and dialogs
- layout components and navigation surfaces
- dashboard and energy widgets

See [design-system/STORYBOOK_FOUNDATION.md](design-system/STORYBOOK_FOUNDATION.md).

## Documentation

Start with [docs/README.md](docs/README.md) for the active docs index.

Useful entry points:

- [docs/technical/REACT_ZUSTAND.md](docs/technical/REACT_ZUSTAND.md)
- [docs/WIDGETS.md](docs/WIDGETS.md)
- [design-system/README.md](design-system/README.md)
- [design-system/FEATURES.md](design-system/FEATURES.md)
- [design-system/UI-GUIDELINES.md](design-system/UI-GUIDELINES.md)

## Contributing

Navet uses Conventional Commits:

```text
type(scope): summary
```

Valid types include `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`,
and `style`.

When contributing:

- keep behavior inside the owning feature module when possible
- prefer shared primitives and patterns before building new bespoke UI
- update active docs when architecture, product surface, or workflow changes
- keep Storybook ownership and titles aligned with the shared UI structure

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Navet source code is licensed under `AGPL-3.0-only`.

Branding is separate from the code license. See:

- [LICENSE.md](LICENSE.md)
- [docs/TERMS_OF_USE.md](docs/TERMS_OF_USE.md)
- [docs/branding/TRADEMARK_POLICY.md](docs/branding/TRADEMARK_POLICY.md)
