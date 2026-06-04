# Navet Feature Map

This document maps the current product and UI ownership at a high level.

## Active Feature Folders

Current feature folders under `packages/app/src/features/`:

- `auth`
- `calendar`
- `climate`
- `dashboard`
- `energy`
- `lighting`
- `media`
- `habits`
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

## App Shell

Current app-shell composition is centered on:

- `packages/app/src/App.tsx`
- `packages/app/src/components/layout/`
- `packages/app/src/features/dashboard/page/index.tsx`

The app shell owns:

- authenticated split between login and dashboard
- network and global error surfaces
- section navigation and room navigation
- mobile sheets and top-level section transitions

## Top-Level Sections

Current primary top-level sections:

- `home`
- `energy`
- `climate`
- `security`
- `lights`
- `media`
- `tasks`
- `settings`

Section routing is coordinated by
`packages/app/src/features/dashboard/components/dashboard-section-router.tsx`.

## Dashboard Ownership

The dashboard feature owns:

- card rendering and registration
- entity visibility
- room-driven Home dashboard behavior
- custom-card templates and placement
- card sizing and ordering
- Home overview layout state
- add-card and add-entity flows

Key current paths:

- `packages/app/src/features/dashboard/hooks/use-dashboard-controller.ts`
- `packages/app/src/features/dashboard/utils/card-renderer.tsx`
- `packages/app/src/features/dashboard/components/`
- `packages/app/src/features/dashboard/stores/`

## Widget Ownership

Current widget templates:

- info
- rss
- photo
- note
- battery
- ups
- energy-now
- button
- map

Dashboard owns widget registration and placement. Feature folders may own the actual widget behavior
when the widget is domain-specific.

## Shared UI Ownership

- `packages/app/src/components/primitives/`: low-level reusable building blocks
- `packages/app/src/components/patterns/`: composed shared structures
- `packages/app/src/components/shared/`: app-specific shared UI
- `packages/app/src/components/system/`: curated internal export surface
- `packages/app/src/ui-kit/`: stable docs/story import surface

## Provider-Aware Behavior

Shared UI should prefer normalized provider/runtime state from:

- `packages/app/src/core/`
- `packages/app/src/platform/`
- `packages/app/src/stores/`
- `packages/app/src/hooks/`

Provider-specific runtime, auth, media, and resource behavior should remain in:

- provider packages (`packages/provider-*/`) for runtime-capable providers
- app-owned compatibility seams (`packages/app/src/services/`, `packages/app/src/infrastructure/home-assistant/`) only where extraction to provider packages is still in progress

## Testing And Stories

- colocated stories live beside shared UI or feature UI
- aggregate card and product scenario stories live under dashboard stories and UI-kit stories
- tests are primarily colocated in `__tests__/` folders beside the code they cover
