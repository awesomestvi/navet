# Navet Feature Map

This document is a current implementation map for Navet's major product areas. It is intended to
help contributors understand where behavior lives, which sections are active, and where story/test
coverage is expected to exist.

## Feature Inventory

Current active feature folders under
[`src/app/features/`](../src/app/features):

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

Additional notes:

- cross-feature imports should prefer a feature's root `index.ts` when that entrypoint exists
- `auth` owns the login/onboarding entry surface rather than a top-level dashboard section
- `notifications` is a supporting feature surfaced through shared app-shell UI rather than a top-level section

## App Shell

### Root app composition

[`src/app/App.tsx`](../src/app/App.tsx) assembles:

- the i18n provider
- the global error display
- the authenticated split between login and dashboard shell
- the PWA update prompt
- the network status surface
- the notification/toast layer
- theme- and viewport-related DOM synchronization

Shared app-shell composition lives primarily under
[`src/app/components/layout/`](../src/app/components/layout).

Current layout ownership includes:

- header and sidebar
- room navigation
- section navigation helpers
- section customization shell/button
- mobile command, search, and section sheets
- reusable section layouts such as media and security

## State and Data Flow

### Shared state

Navet uses Zustand for all shared reactive state.

Current store files:

- `edit-mode-store.ts`
- `error-store.ts`
- `home-assistant-store.ts`
- `navigation-store.ts`
- `search-store.ts`
- `settings-store.ts`
- `theme-store.ts`

Shared selectors live in
[`src/app/stores/selectors.ts`](../src/app/stores/selectors.ts)
and should be preferred over full-store subscriptions.

### Home Assistant flow

[`src/app/services/home-assistant.service.ts`](../src/app/services/home-assistant.service.ts)
is the public Home Assistant facade. It composes:

- [`src/app/services/ha-connection.service.ts`](../src/app/services/ha-connection.service.ts)
- [`src/app/services/ha-entity-service.ts`](../src/app/services/ha-entity-service.ts)
- [`src/app/services/ha-registry.service.ts`](../src/app/services/ha-registry.service.ts)

The facade emits typed updates for:

- entities
- config
- registries
- connection

The store updates only the affected slices for each event. Avoid broad "copy the whole service
state" sync patterns.

Navigation keeps `currentRoom` persisted in the store while `activeSection` is derived from the URL
through [`src/app/navigation/sections.ts`](../src/app/navigation/sections.ts).

## Top-Level Sections

The current primary section model is:

- `home`
- `energy`
- `climate`
- `security`
- `lights`
- `media`
- `tasks`
- `settings`

Section routing and lazy loading are coordinated by
[`src/app/features/dashboard/components/dashboard-section-router.tsx`](../src/app/features/dashboard/components/dashboard-section-router.tsx).

### Section ownership

- `home`: room-driven dashboard overview, editable zone-based home canvas, and home widgets
- `energy`: energy dashboard, setup wizard, drilldown flow, and energy-only custom widget band
- `climate`: grouped HVAC, temperature, humidity, air-quality, and pressure surfaces
- `security`: camera-first section built on the shared device-section shell
- `lights`: all-lights overview using the dashboard all-view grid in custom grouping mode
- `media`: grouped media section with audio and TV-specific presentation
- `tasks`: Home Assistant automation/task summaries grouped into sections
- `settings`: appearance, localization, dashboard, interaction, project, and system settings

## Dashboard

### Ownership

The dashboard feature owns:

- card registration
- entity visibility
- locked entity/widget card interaction state
- custom-card placement
- custom-card naming and persisted widget data
- room ordering
- card ordering
- dashboard-specific persisted layout state
- home overview layout state
- sectioned and flow layout behavior

Important paths:

- [`src/app/features/dashboard/utils/card-renderer.tsx`](../src/app/features/dashboard/utils/card-renderer.tsx)
- [`src/app/features/dashboard/hooks/`](../src/app/features/dashboard/hooks)
- [`src/app/features/dashboard/stores/custom-cards-store.ts`](../src/app/features/dashboard/stores/custom-cards-store.ts)
- [`src/app/features/dashboard/stores/dashboard-entities-store.ts`](../src/app/features/dashboard/stores/dashboard-entities-store.ts)
- [`src/app/features/dashboard/stores/home-dashboard-layout-store.ts`](../src/app/features/dashboard/stores/home-dashboard-layout-store.ts)

### Current custom widgets

Current `CardType` values for dashboard/section widgets:

- `info`
- `rss`
- `photo`
- `note`
- `battery`
- `ups`
- `energy-now`
- `button`
- `map`

Most home-widget implementations currently live under
[`src/app/features/dashboard/components/widgets/`](../src/app/features/dashboard/components/widgets).
RSS is owned by [`src/app/features/rss/components/rss-feed-card/`](../src/app/features/rss/components/rss-feed-card),
and sensor-backed Info widget behavior composes pieces from
[`src/app/features/sensors/components/`](../src/app/features/sensors/components).

The widget store also uses special room sentinels:

- `__home__` for widgets attached to the home overview
- `__energy__` for widgets attached to the energy section band

Home widgets may additionally persist zone overrides via
[`src/app/features/dashboard/zones/`](../src/app/features/dashboard/zones).

### Room sourcing

Home-room navigation is assembled from two sources:

- Home Assistant areas via [`src/app/hooks/use-area-rooms.ts`](../src/app/hooks/use-area-rooms.ts)
- discovered device rooms merged by
  [`src/app/features/dashboard/hooks/use-available-rooms.ts`](../src/app/features/dashboard/hooks/use-available-rooms.ts)

This keeps the room list stable when registry-backed area names exist while still surfacing devices
whose room can only be inferred from entity metadata.

### Home overview zones

The `All` home view is grouped into four named zones:

- `hero`
- `actions`
- `status`
- `analytics`

Default placement and fallback resolution live in:

- [`src/app/features/dashboard/zones/zone-types.ts`](../src/app/features/dashboard/zones/zone-types.ts)
- [`src/app/features/dashboard/zones/resolve-card-zone.ts`](../src/app/features/dashboard/zones/resolve-card-zone.ts)
- [`src/app/features/dashboard/zones/use-zone-layout.ts`](../src/app/features/dashboard/zones/use-zone-layout.ts)

## Feature Ownership Highlights

### `calendar`

- weather-like schedule surfaces with selectable sources and multiple display modes
- key path: [`src/app/features/calendar/components/calendar/`](../src/app/features/calendar/components/calendar)

### `climate`

- HVAC card presentation, controls, status labels, and settings dialogs
- key path: [`src/app/features/climate/components/hvac-card/`](../src/app/features/climate/components/hvac-card)

### `energy`

- setup wizard, statistics services, dashboard-page composition, and energy widgets
- key paths:
  - [`src/app/features/energy/components/dashboard/`](../src/app/features/energy/components/dashboard)
  - [`src/app/features/energy/components/widgets/`](../src/app/features/energy/components/widgets)

### `lighting`

- light card behavior, settings dialogs, and grouped lighting controls
- key path: [`src/app/features/lighting/components/light-card/`](../src/app/features/lighting/components/light-card)

### `media`

- artwork-aware media cards, controller hooks, volume/playback behavior, and TV-specific views
- key paths:
  - [`src/app/features/media/components/media-card/`](../src/app/features/media/components/media-card)
  - [`src/app/features/media/components/media/`](../src/app/features/media/components/media)

### `notifications`

- persistent-notification and repair/update notification surfaces used by the app shell
- key path: [`src/app/features/notifications/components/notifications/`](../src/app/features/notifications/components/notifications)

### `rss`

- RSS/news card logic, source resolution, and item rendering
- key path: [`src/app/features/rss/components/rss-feed-card/`](../src/app/features/rss/components/rss-feed-card)

### `security`

- camera cards, lock cards, and security-specific surface tokens
- locks are security-owned card behavior rather than a separate top-level section
- cover cards include direct drag/keyboard position controls via `CoverPositionGestureSurface`,
  preset chips, and feature-aware open/close/stop actions
- key path: [`src/app/features/security/components/`](../src/app/features/security/components)

### `sensors`

- sensor cards, grouped sensor displays, history sparklines, home-status summaries, and the shared
  settings flow used by Info widgets
- key paths:
  - [`src/app/features/sensors/components/`](../src/app/features/sensors/components)
  - [`src/app/features/sensors/hooks/`](../src/app/features/sensors/hooks)

### `settings`

- sectioned settings UI for appearance, localization, dashboard, interaction, project, and system controls
- key path: [`src/app/features/settings/components/`](../src/app/features/settings/components)

### `tasks`

- Home Assistant automation grouping and task-row presentation
- key paths:
  - [`src/app/features/tasks/components/`](../src/app/features/tasks/components)
  - [`src/app/features/tasks/utils/`](../src/app/features/tasks/utils)

### `vacuum`

- vacuum cards, status utilities, controls, and settings dialogs
- key path: [`src/app/features/vacuum/components/`](../src/app/features/vacuum/components)

### `weather`

- weather card controller, source-aware temperature units via `normalizeTemperatureUnit`, overlays,
  icons, and settings dialog
- key path: [`src/app/features/weather/components/weather-card/`](../src/app/features/weather/components/weather-card)

## Shared UI System

### Ownership split

- `primitives/`: low-level reusable UI such as shared buttons, card shells, header parts, and compact text
- `patterns/`: composed shared structures
- `system/`: curated export and token-story surface
- `ui-kit/`: canonical shared import surface for docs, stories, and stable shared consumers
- `shared/`: app-specific shared UI and compatibility shims
- `layout/`: app-shell and section-level composition
- `ui/`: wrappers around library primitives and dropdown/dialog infrastructure

See [../README.md](../README.md) and [README.md](README.md) for the higher-level explanation.

### Storybook support

Storybook is the review surface for:

- token and theme stories
- shared primitives and patterns
- layout and navigation surfaces
- entity cards
- dashboard widgets
- settings sections
- energy-specific visuals

Shared story helpers live in
[`src/app/storybook/story-frames.tsx`](../src/app/storybook/story-frames.tsx)
and
[`src/app/storybook/story-docs.ts`](../src/app/storybook/story-docs.ts).

## Testing Map

Vitest is the preferred path for:

- shared utility logic
- persisted store behavior
- controller composition
- browser-dependent hooks
- token and entity-mapping helpers
- dashboard actions and feature-specific logic seams
- input modality, temperature conversion, registry service, cover gesture, and dashboard lock-state behavior

Current co-located `__tests__/` directories:

- `src/api/__tests__/`
- `src/app/__tests__/`
- `src/app/components/layout/__tests__/`
- `src/app/components/primitives/__tests__/`
- `src/app/components/shared/theme/__tests__/`
- `src/app/components/system/tokens/__tests__/`
- `src/app/constants/__tests__/`
- `src/app/features/auth/__tests__/`
- `src/app/features/calendar/components/calendar/__tests__/`
- `src/app/features/climate/components/hvac-card/__tests__/`
- `src/app/features/climate/components/hvac-settings-dialog/__tests__/`
- `src/app/features/climate/utils/__tests__/`
- `src/app/features/dashboard/components/__tests__/`
- `src/app/features/dashboard/components/widgets/__tests__/`
- `src/app/features/dashboard/hooks/__tests__/`
- `src/app/features/dashboard/page/__tests__/`
- `src/app/features/dashboard/shell/__tests__/`
- `src/app/features/dashboard/stores/__tests__/`
- `src/app/features/dashboard/utils/__tests__/`
- `src/app/features/energy/components/dashboard/__tests__/`
- `src/app/features/energy/components/energy-setup-wizard/__tests__/`
- `src/app/features/energy/hooks/__tests__/`
- `src/app/features/energy/services/__tests__/`
- `src/app/features/energy/utils/__tests__/`
- `src/app/features/lighting/components/__tests__/`
- `src/app/features/lighting/components/fan-card/__tests__/`
- `src/app/features/lighting/components/light-card/__tests__/`
- `src/app/features/media/__tests__/`
- `src/app/features/media/components/media-card/__tests__/`
- `src/app/features/media/components/media/__tests__/`
- `src/app/features/rss/components/rss-feed-card/__tests__/`
- `src/app/features/security/components/__tests__/`
- `src/app/features/security/components/camera-card/__tests__/`
- `src/app/features/security/components/cover-card/__tests__/`
- `src/app/features/security/utils/__tests__/`
- `src/app/features/sensors/components/__tests__/`
- `src/app/features/sensors/hooks/__tests__/`
- `src/app/features/sensors/components/sensor-group-settings/__tests__/`
- `src/app/features/tasks/components/__tests__/`
- `src/app/features/tasks/utils/__tests__/`
- `src/app/features/vacuum/components/vacuum/__tests__/`
- `src/app/hooks/__tests__/`
- `src/app/hooks/device-mappers/__tests__/`
- `src/app/infrastructure/home-assistant/resources/__tests__/`
- `src/app/runtime/__tests__/`
- `src/app/services/__tests__/`
- `src/app/stores/__tests__/`
- `src/app/utils/__tests__/`
- `src/auth/__tests__/`

Shared test harness support lives in [`src/test/`](../src/test).

## Maintenance Expectations

- Update this file when top-level sections, feature ownership, widget types, or test locations change
- Remove references to deleted feature folders or moved paths instead of leaving historical hints in active docs
- Prefer describing the actual current tree over describing an intended future architecture
