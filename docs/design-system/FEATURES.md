# Navet Feature Map

This document maps the current product and UI ownership at a high level.

Architecture note:

- `@navet/ui` is the target provider-neutral shared UI package boundary.
- The paths in this document under `packages/app/src/...` describe the current implementation
  layout, not the final ownership destination for every shared UI surface.

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
- Home edit command bar behavior, including undo/redo, section add controls, and room management
- Home layout packs such as command center, security monitor, and energy wall
- manual entity-card cataloging for normalized entities that do not have a richer dedicated card yet

Key current paths:

- `packages/app/src/features/dashboard/hooks/use-dashboard-controller.ts`
- `packages/app/src/features/dashboard/utils/card-renderer.tsx`
- `packages/app/src/features/dashboard/components/`
- `packages/app/src/features/dashboard/packs/`
- `packages/app/src/features/dashboard/stores/`
- `packages/app/src/features/dashboard/utils/manual-entity-card-catalog.ts`

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
- entity

`media-stack` remains a supported stored widget type for compatible saved/imported profiles, but
is intentionally absent from the Add card chooser. The chooser also exposes scene and energy
metric presets backed by the existing `button` and `info` types.

Dashboard owns widget registration and placement. Feature folders may own the actual widget behavior
when the widget is domain-specific.

The `entity` widget is a generic fallback for normalized provider entities. Prefer a dedicated
provider-neutral card when the entity type has meaningful controls or domain-specific presentation.

## Household, Routines, And Habit Automation

The chores feature owns provider-neutral participants, definitions, occurrences, scheduling,
workflow, activity, and the Today and Chores surfaces. Household participants are attribution and
workflow profiles, not authenticated accounts. Shared chores use revisioned installation storage and
are unavailable in the Home Assistant custom panel.

The tasks feature continues to own provider automation and script presentation under Household's
Routines tab. Automation detail rows can summarize triggers, conditions, actions, diagnostics, and
dependent entities discovered from provider automation config.

Habit insights can suggest safe local routines. When the active provider exposes
`createAutomationFromHabitRule`, the app asks that provider to create a native automation. When the
capability is absent, Navet falls back to saving the rule locally where supported by the habit
store.

## Energy Dashboard

The energy feature owns its dashboard model, data-coverage state, live-flow presentation, and
explanations for what is driving the current load. Explanations are derived from normalized energy
overview data and should identify affected consumer IDs when the explanation points at tracked
devices.

## Settings Profiles

The settings feature owns dashboard profile modes. Current presets include `standard` and
`wall_display`; applying a preset updates dashboard spacing, header title mode, keep-awake,
kiosk-mode, and Home summary-bar settings as a scoped profile change.

Settings also owns provider management, four theme families, built-in/custom accent colors,
wallpapers, interaction policy, adaptive effects controls, custom sidebar extensions, dashboard
import/export, experimental options, and project/runtime information.

## Shared UI Ownership

- `packages/app/src/components/primitives/`: current low-level reusable building blocks
- `packages/app/src/components/patterns/`: current composed shared structures
- `packages/app/src/components/shared/`: current app-specific shared UI
- `packages/app/src/components/system/`: current curated internal export surface
- `packages/app/src/ui-kit/`: current stable docs/story import surface
- `packages/ui/src/`: target provider-neutral shared UI package boundary

## Provider-Aware Behavior

Shared UI should prefer normalized provider/runtime state from:

- `packages/app/src/core/`
- `packages/app/src/platform/`
- `packages/app/src/stores/`
- `packages/app/src/hooks/`

The runtime can retain multiple implemented provider sessions. Dashboard collections merge the
currently selected providers while preserving provider-scoped and canonical IDs; provider-specific
feature operations still resolve through the matching active/owning runtime registration.

Provider-specific runtime, auth, media, and resource behavior should remain in:

- provider packages (`packages/provider-*/`) for runtime-capable providers
- app-owned compatibility seams (`packages/app/src/services/`, `packages/app/src/infrastructure/home-assistant/`) only where extraction to provider packages is still in progress

Ownership rule of thumb:

- if the work is generic shared UI and provider-neutral, the long-term destination is `@navet/ui`
- if the work is staying in app-owned shared UI for now, document it as a current implementation
  seam rather than as the final architecture

Current feature-service baseline:

| Capability group | Home Assistant | Homey | openHAB |
|---|---:|---:|---:|
| rooms, realtime state, lighting, switches, sensors | Yes | Yes | Yes |
| climate, media, cameras, energy, calendar, weather | Yes | No | No |
| notifications, tasks, history, security, administration | Yes | No | No |

## Testing And Stories

- colocated stories live beside shared UI or feature UI
- aggregate card and product scenario stories live under dashboard stories and UI-kit stories
- primary entity-card families should keep standalone review stories for their main interaction surfaces, including climate (`Climate`, `Humidifier`) and security (`Camera`, `Cover`, `Lock`, `Alarm Panel`)
- tests are primarily colocated in `__tests__/` folders beside the code they cover
