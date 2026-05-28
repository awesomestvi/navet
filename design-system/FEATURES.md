# Navet Feature Map

This document maps the current product and UI ownership at a high level.

## Active Feature Folders

Current feature folders under `src/app/features/`:

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

## App Shell

Current app-shell composition is centered on:

- `src/app/App.tsx`
- `src/app/components/layout/`
- `src/app/features/dashboard/page/index.tsx`

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
`src/app/features/dashboard/components/dashboard-section-router.tsx`.

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

- `src/app/features/dashboard/hooks/use-dashboard-controller.ts`
- `src/app/features/dashboard/utils/card-renderer.tsx`
- `src/app/features/dashboard/components/`
- `src/app/features/dashboard/stores/`

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

- `src/app/components/primitives/`: low-level reusable building blocks
- `src/app/components/patterns/`: composed shared structures
- `src/app/components/shared/`: app-specific shared UI
- `src/app/components/system/`: curated internal export surface
- `src/app/ui-kit/`: stable docs/story import surface

## Provider-Aware Behavior

Shared UI should prefer normalized provider/runtime state from:

- `src/app/core/`
- `src/app/platform/`
- `src/app/stores/`
- `src/app/hooks/`

Provider-specific runtime, auth, media, and resource behavior should remain in:

- `src/app/infrastructure/home-assistant/`
- `src/app/services/`

## Testing And Stories

- colocated stories live beside shared UI or feature UI
- aggregate card and product scenario stories live under dashboard stories and UI-kit stories
- tests are primarily colocated in `__tests__/` folders beside the code they cover
