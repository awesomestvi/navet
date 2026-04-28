# Navet

Navet is a smart home dashboard PWA built with React 19, TypeScript, Zustand, and Tailwind CSS 4.
It connects directly to Home Assistant over WebSocket and is designed to run well on both desktop
machines and lower-power wall panels.

## Overview

Navet focuses on three things:

- a dashboard-first Home Assistant experience with editable cards, rooms, and widgets
- a shared UI system with Storybook-backed primitives, patterns, and theme tokens
- predictable architecture: feature-owned modules, Zustand for shared state, and typed service events

Current release channel: `0.1.0-beta.2`

See [docs/VERSIONING.md](docs/VERSIONING.md) for release policy and version bump rules.

### Testing

Navet uses Vitest for unit testing with co-located test files in `__tests__/` directories. Test
coverage includes:

- shared utilities and entity mappers
- Zustand store behavior
- controller hooks and dashboard actions
- calendar and feature-specific logic

## Highlights

### Dashboard and device support

- Live Home Assistant entity cards for lights, climate, media, locks, cameras, weather, calendars,
  people, vacuums, sensors, helpers, scripts, and related domains
- Room-based navigation with dedicated section routes such as `/`, `/energy`, `/lights`,
  `/media`, and `/settings`
- Edit mode for adding cards, resizing cards, reordering content, and managing dashboard layout
- Card-level room reassignment for supported entity types
- Dashboard import/export through a YAML-based local config backup flow

### UI and theming

- Four theme modes: `glass`, `dark`, `light`, and `black` (`Black` in the UI)
- Accent color system with built-in accents and custom accent selection
- Adaptive visual-quality tiers for lower-power devices
- Shared card-shell primitives, body text, dialog patterns, and surface tokens documented in Storybook
- PWA shell with install prompt, update prompt, and offline app-shell support

### Widgets and specialized views

- Custom widgets including RSS feed, photo frame, quick note, battery overview, button, and map widgets
- Dedicated section views for energy, lights, locks, media, and security
- Live Home Assistant notification surfaces for persistent notifications, repair issues, and updates
- Artwork-led media cards and TV-specific media layouts

## Tech Stack

| Layer | Tooling |
|---|---|
| App | React 19 |
| Language | TypeScript 6 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4.2 |
| UI primitives | Radix UI |
| Build | Vite 8 |
| Smart home integration | `home-assistant-js-websocket` |
| Testing | Vitest 4 |
| Formatting and linting | Biome 2 |
| Workshop | Storybook |

## Architecture

### App structure

Navet is organized around feature-owned modules under [`src/app/features/`](/Users/vishal/Development/Github/Navet/Navet/src/app/features).
Current feature folders include:

- `auth`
- `calendar`
- `climate`
- `dashboard`
- `energy`
- `lighting`
- `media`
- `notifications`
- `person`
- `power`
- `rss`
- `scenes`
- `security`
- `sensors`
- `settings`
- `vacuum`
- `weather`

Cross-feature UI lives under [`src/app/components/`](/Users/vishal/Development/Github/Navet/Navet/src/app/components):

- `primitives/` for low-level reusable UI
- `patterns/` for composed shared structures
- `system/` for the curated public export surface used by Storybook and cross-app discovery
- `shared/` for app-specific shared UI and compatibility shims
- `layout/` and `ui/` for shell-level and wrapper components
- `figma/` for design integration components

### State and services

- All shared reactive state lives in Zustand stores under
  [`src/app/stores/`](/Users/vishal/Development/Github/Navet/Navet/src/app/stores)
- Current stores: `auth-store`, `config-store`, `edit-mode-store`, `error-store`,
  `home-assistant-store`, `navigation-store`, `search-store`, `settings-store`, `theme-store`
- Home Assistant data flows through
  [`src/app/services/home-assistant.service.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/services/home-assistant.service.ts)
  and into the store via typed events
- React Context is reserved for infrastructure concerns such as i18n

See [docs/technical/REACT_ZUSTAND.md](docs/technical/REACT_ZUSTAND.md) for the state-management contract.

### Key source files

| File | Role |
|---|---|
| [`src/app/App.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/App.tsx) | Root app shell, HA connection bootstrap, PWA/update shell, global DOM sync |
| [`src/app/stores/selectors.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/stores/selectors.ts) | Shared selectors for minimal store subscriptions |
| [`src/app/features/dashboard/utils/card-renderer.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/utils/card-renderer.tsx) | Dashboard card registry |
| [`src/app/storybook/story-frames.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook/story-frames.tsx) | Shared Storybook frame helpers |
| [`src/app/storybook/story-docs.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook/story-docs.ts) | Story-specific documentation strings |
| [`src/app/components/shared/theme/theme-surface-tokens.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/theme/theme-surface-tokens.ts) | Shared theme/surface decisions |
| [`src/app/hooks/use-ha-devices.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/hooks/use-ha-devices.ts) | HA entity to device type mapping |
| [`src/app/hooks/ha-entity-utils.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/hooks/ha-entity-utils.ts) | Entity transformation utilities |

## Setup

### Prerequisites

- Node.js 18+
- `pnpm`
- A running Home Assistant instance
- A Home Assistant long-lived access token

### Install

```bash
git clone https://github.com/awesomestvi/navet.git
cd navet
pnpm install
pnpm setup:hooks
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

### Development

Start the app:

```bash
pnpm dev
```

Optional local hostname setup:

```text
127.0.0.1 navet.local
```

Then open `http://navet.local:5200`.

### Storybook

Run Storybook when working on shared UI, cards, settings dialogs, or app shell pieces:

```bash
pnpm storybook
```

Relevant related scripts:

```bash
pnpm storybook:build
pnpm check:stories
```

Storybook is the main review surface for:

- tokens and theme behavior
- shared primitives and patterns
- app shell components
- entity cards and custom widgets
- dashboard, energy, and settings flows

See [design-system/STORYBOOK_FOUNDATION.md](design-system/STORYBOOK_FOUNDATION.md).

### Unit tests

Navet uses Vitest for focused unit coverage of shared utilities, Zustand stores, browser-dependent
hooks, and selected feature controllers. The repo also includes shared test helpers so new tests
can mount hooks with i18n, reset singleton stores deterministically, and stub Home Assistant
service events without bespoke setup in every file.

Current shared test support lives in:

- [`src/setupTests.ts`](/Users/vishal/Development/Github/Navet/Navet/src/setupTests.ts)
- [`src/test/render.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/test/render.tsx)
- [`src/test/store-reset.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/store-reset.ts)
- [`src/test/browser-mocks.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/browser-mocks.ts)
- [`src/test/factories/home-assistant-service-stub.ts`](/Users/vishal/Development/Github/Navet/Navet/src/test/factories/home-assistant-service-stub.ts)

Use:

```bash
pnpm test
pnpm test:coverage
```

Scope guidance:

- Prefer unit tests for shared logic, persistence, selector-heavy hooks, and controller seams
- Prefer Storybook for visual review of shared UI, cards, dialogs, and layout flows
- Avoid broad snapshot-heavy component testing for thin presentational wrappers

### Production preview

Use the preview flow when you need production-style runtime config or media/proxy behavior:

```bash
pnpm preview
```

This builds the app, writes `dist/config.js`, and serves the production bundle on
`http://localhost:4173`.

## Common Commands

```bash
pnpm dev
pnpm preview
pnpm storybook
pnpm storybook:build
pnpm check:stories
pnpm test
pnpm test:coverage
pnpm format
pnpm check
pnpm typecheck
```

## Product Surface

### Main sections

- `Home`: customizable dashboard
- `Energy`: energy views, charts, and widgets
- `Security`: camera-oriented views
- `Tasks`: placeholder section
- `Locks`: lock entity grid
- `Lights`: lighting-oriented section
- `Media`: media-player and TV views
- `Settings`: appearance, localization, dashboard, config, and onboarding controls

### Dashboard capabilities

- Start from discovered entities, a blank dashboard, or an imported config
- Switch Home room grouping between custom, room, type, or no grouping
- Add entity cards and custom widgets
- Resize cards across supported sizes including compact variants
- Reassign rooms from supported card settings dialogs
- Export and restore local dashboard configuration

### Supported Home Assistant surfaces

- `calendar.*` cards with source selection and week/month views
- `weather.*` cards backed by Home Assistant forecast data
- `person.*` cards with images and normalized presence text
- media-player cards with artwork, transport controls, and TV remote flows
- helper and script domains mapped into existing card paths

## Documentation

Start with [docs/README.md](docs/README.md) for the documentation index.

Useful entry points:

- [docs/WIDGETS.md](docs/WIDGETS.md)
- [docs/DOCKER_HOME_ASSISTANT_ADDON.md](docs/DOCKER_HOME_ASSISTANT_ADDON.md)
- [docs/technical/REACT_ZUSTAND.md](docs/technical/REACT_ZUSTAND.md)
- [src/test/](/Users/vishal/Development/Github/Navet/Navet/src/test)
- [design-system/README.md](design-system/README.md)
- [design-system/FEATURES.md](design-system/FEATURES.md)
- [design-system/UI-GUIDELINES.md](design-system/UI-GUIDELINES.md)

## Contributing

Navet uses Conventional Commits. Format commits as:

```text
type(scope): summary
```

Valid types include `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`,
and `style`.

When contributing:

- keep feature logic inside the owning feature module
- use shared primitives and patterns before creating new bespoke UI
- update docs when behavior, architecture, or workflows change
- keep Storybook titles and colocated story ownership valid

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Navet source code is licensed under `AGPL-3.0-only`.

Branding is separate from the code license. See:

- [LICENSE.md](LICENSE.md)
- [docs/TERMS_OF_USE.md](docs/TERMS_OF_USE.md)
- [docs/branding/TRADEMARK_POLICY.md](docs/branding/TRADEMARK_POLICY.md)
