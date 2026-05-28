# Widget System

This document describes the currently implemented custom widget system in Navet.

Calendar and weather are not custom widgets. They are entity-card flows driven by provider-backed
devices.

## Current Widget Types

Current custom widget templates:

- `info`
- `rss`
- `photo`
- `note`
- `battery`
- `ups`
- `energy-now`
- `button`
- `map`

Widget templates are defined from the dashboard feature, primarily in:

- `src/app/features/dashboard/components/add-card-dialog/templates.tsx`
- `src/app/features/dashboard/components/add-card-dialog/types.ts`

## Current Ownership

Widget ownership is split across the dashboard feature and feature-specific implementations:

- dashboard feature owns template registration, add-card flows, placement, persistence, room
  assignment, sizing, locking, and layout behavior
- RSS behavior lives in the RSS feature
- info and grouped sensor behavior compose with the sensors feature
- map, energy, battery, UPS, photo, note, and button widgets live under dashboard widget paths

Current host renderer surface:

- `src/app/features/dashboard/components/widgets/`

## Core Behavior

- widgets persist through dashboard feature stores
- widgets support rename, move, resize, lock, and delete flows
- widgets can belong to room views or Home overview bands
- widgets participate in dashboard import and export state
- RSS fetching uses the same-origin proxy path rather than direct browser cross-origin fetches

## Special Room IDs

- `__home__`: widget belongs to the Home overview
- `__energy__`: widget belongs to the Energy section band

Home widgets may also store zone placement metadata for the Home overview layout.

## Current Size Support

Supported sizes are template-specific rather than globally identical.

Current template size rules live in
`src/app/features/dashboard/components/add-card-dialog/templates.tsx`.

Representative support:

- `button`: `tiny`, `extra-small`, `small`
- `photo`, `note`: `small`, `medium`, `large`, `extra-large`
- `battery`, `ups`, `energy-now`, `info`, `map`: `small`, `medium`, `large`
- `rss`: `medium`, `large`

## Editing Flow

Current widget editing behavior:

1. enter dashboard edit mode
2. open the add-card dialog or widget settings
3. choose template and supported size
4. place, rename, resize, move, or lock through dashboard edit controls

## Implementation Notes

- do not describe widgets as backend-native cards
- do not treat them as a separate platform-specific dashboard system
- keep widget docs aligned with the dashboard feature and current template registry
