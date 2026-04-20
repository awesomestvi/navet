# Navet Feature Map

This document is a current implementation map for Navet's major product areas. It is intended to
help contributors understand where behavior lives and which shared patterns are expected.

## Feature Inventory

Current feature folders under
[`src/app/features/`](/Users/vishal/Development/Github/Navet/Navet/src/app/features):

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
- `vacuum`
- `weather`

Cross-feature imports should go through a feature's root `index.ts` when crossing feature
boundaries where that entrypoint exists. The current intended pattern is feature-root imports,
but `auth` is still a small exception because it does not yet expose a root entry file.

## App Shell

### Root app composition

[`src/app/App.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/App.tsx) assembles:

- the i18n provider
- the global error display
- the PWA update prompt
- the network status banner
- the notification toaster
- the authenticated route split between `LoginPage` and `DashboardPage`

It also syncs:

- accent CSS variables
- page zoom CSS/viewport variables
- reduced-effects flags and theme-related DOM data attributes

## State and data flow

### Shared state

Navet uses Zustand for all shared reactive state.

Current core stores:

- `auth-store`
- `config-store`
- `home-assistant-store`
- `settings-store`
- `theme-store`
- `navigation-store`
- `edit-mode-store`
- `search-store`
- `error-store`

Selectors live in
[`src/app/stores/selectors.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/stores/selectors.ts)
and should be preferred over full-store subscriptions.

### Home Assistant flow

[`src/app/services/home-assistant.service.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/services/home-assistant.service.ts)
emits typed events for:

- entities
- config
- registries
- connection

The store updates only the affected slice for each event. Avoid catch-all "copy the whole service
state" sync paths.

## Dashboard

### Ownership

The dashboard feature owns:

- card registration
- entity visibility
- custom card placement
- room ordering
- card ordering
- dashboard-specific persisted layout state

Important paths:

- [`src/app/features/dashboard/utils/card-renderer.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/utils/card-renderer.tsx)
- [`src/app/features/dashboard/hooks/`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/hooks)
- [`src/app/features/dashboard/stores/`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/stores)

### Current behavior

- Home is the main editable dashboard section
- cards can be added from entity-library and widget flows
- supported cards can be resized across shared card sizes
- room grouping modes support custom, room, type, and no-grouping views
- onboarding can start from all entities, a blank board, or imported config

## Settings

Settings is the control surface for:

- appearance and theme mode
- accent color
- visual quality
- page zoom
- localization
- dashboard config import/export
- onboarding reset
- interaction preferences such as tap behavior

Settings UI should reuse shared patterns and primitives before introducing feature-specific shells.

## Theme and appearance

Navet supports four themes:

- `glass`
- `dark`
- `light`
- `black`

The current expectation is:

- shared theme branches resolve through surface/token helpers
- theme-aware shared controls reuse shared primitives
- accent/tinted surfaces use readable-text token logic when needed

Key theme helpers live in
[`src/app/components/shared/theme/`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/theme).

## Shared UI system

### Ownership split

- `primitives/`: low-level reusable UI
- `patterns/`: composed shared structure
- `system/`: curated export surface
- `shared/`: app-specific shared UI and compatibility shims

This split is documented in:

- [README.md](README.md)
- [`src/app/components/README.md`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/README.md)
- [`src/app/components/shared/README.md`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/README.md)

### Storybook support

Storybook is the review surface for the system layer, card surfaces, settings flows, and app shell.

Shared story helpers live in
[`src/app/storybook/story-frames.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook/story-frames.tsx)
and [`src/app/storybook/story-docs.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/storybook/story-docs.ts).

## Card system

### Size model

The canonical size registry lives in
[`src/app/components/shared/card-size-selector.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size-selector.tsx).

Supported sizes:

- `tiny`
- `extra-small`
- `small`
- `medium`
- `medium-vertical`
- `large`
- `extra-large`

Preview dimensions, ratios, and drag overlays derive from the shared registry rather than per-card
hardcoded values.

### Compact-card rules

- use shared title/header primitives in dense cards
- use shared tiny/compact shells where available
- keep control density intentional
- do not duplicate the same action in multiple rows of a compact card

## Dialog surfaces

Entity settings dialogs should compose from the shared dialog primitives and patterns, including:

- `DialogShell`
- `CardDialogHeader`
- `CardDialogSection`
- `CardDialogTabList`
- `CardDialogTabTrigger`
- `DialogSectionRow`
- `DialogDoneFooter`

This keeps room reassignment, sections, tabs, and action footers aligned across card families.

## Media

### Media players

Media cards are backed by live Home Assistant `media_player` entities and include:

- transport controls
- metadata
- artwork-aware layouts
- volume control
- remaining-time handling
- local mute/unmute restoration behavior

### TV treatment

TV-class media entities use a dedicated TV layout with:

- D-pad navigation cluster
- source selection
- volume and channel actions
- remote-profile-based command mapping

The TV card is a specialized path inside the media feature, not a separate global card family.

## Climate

Climate entities render through the HVAC card path. Navet should not reintroduce a parallel legacy
climate-card implementation.

Climate/HVAC work should stay inside the climate feature and reuse shared card/state/dialog
patterns rather than forking presentation logic.

## Weather and calendar

### Weather

- Home Assistant weather entities render as live weather cards
- card settings support room reassignment
- weather visuals should still respect low-power rendering constraints

### Calendar

- Home Assistant calendar entities render as live calendar cards
- cards support source selection and week/month display modes
- event details remain part of the calendar feature path

## Security, locks, lights, energy, and notifications

### Security

- security section centers on camera-oriented content
- section-level customization uses the shared section shell pattern

### Locks and lights

- each section exposes domain-focused grids
- shared edit/customize affordances should be reused instead of per-section reinvention

### Energy

Energy owns:

- energy widgets
- energy charts
- energy-specific UI shells and services

This feature has its own components, hooks, stores, and data layer.

### Notifications

Notifications feature work includes:

- Home Assistant persistent notifications
- repair/issues surfaces
- update actions and update-related content

## Controller decomposition rules

Feature controllers should stay orchestration-focused.

Expected supporting split:

- sync hooks for entity/service synchronization
- action hooks for side effects and domain actions
- display hooks/helpers for presentational shaping

Avoid long controller hooks that accumulate sync logic, state derivation, and event handling in one
place.

## Performance-sensitive areas

Contributors should be careful when changing:

- heavy glass effects
- chart rendering
- offscreen dashboard behavior
- card layout density in compact sizes
- artwork and media color extraction paths
- large entity-picker and dashboard grid flows

Visual changes that increase blur, overdraw, nesting, or animation cost should be evaluated with
low-power dashboards in mind.

Last updated: April 21, 2026
