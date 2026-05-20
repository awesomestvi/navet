# Widget System Documentation

This document explains how custom dashboard widgets work in Navet.

Calendar and weather are not custom widgets. They are Home Assistant entity cards (`calendar.*` and weather entities) and should be added through the entity flow.

## Overview

Custom widgets let users place non-entity cards on the dashboard and keep their state locally.

### Current Built-in Widgets

- RSS Feed
- Photo Frame
- Quick Note
- Battery Overview
- Energy Now
- Button
- Map

### Core Behavior

- Widgets are stored locally in browser storage (`ha-dashboard-custom-cards`)
- Widgets persist through the shared dashboard custom-card store for both the home section and the energy section
- RSS widget feed configuration is stored on the widget card itself so exports/imports keep provider selection and article count
- Direct RSS URLs are fetched through the same-origin `/__navet_rss_proxy__` path; Docker and add-on nginx load those feeds through the embedded njs runtime (no browser CORS, no separate Node sidecar)
- Widgets support edit-mode rename, move, resize, lock, and delete flows
- Widget sizing is template-specific (not one global size list)
- Widgets can be assigned to rooms and participate in the home overview zone layout
- Locked widget cards stay visible but ignore accidental taps outside edit mode, using the same
  `lockedCardIds` dashboard entity state as entity cards

Room assignment details:

- `__home__` is the sentinel room used for widgets that belong to the home overview canvas
- `__energy__` is the sentinel room used for widgets that belong to the energy section's custom-widget band
- Home widgets may also persist an optional `zone` override (`hero`, `actions`, `status`, `analytics`)

## Supported Sizes by Widget

The Add Card dialog defines widget size support in `src/app/features/dashboard/components/add-card-dialog/templates.tsx`.

- `rss`: `medium`, `large`
- `photo`: `small`, `medium`, `large`, `extra-large`
- `note`: `small`, `medium`, `large`, `extra-large`
- `battery`: `small`, `medium`, `large`
- `energy-now`: `small`, `medium`, `large`
- `button`: `tiny`, `extra-small`, `small`
- `map`: `small`, `medium`, `large`

## Add and Manage Widgets

### Add

1. Enter `Customize` to open edit mode.
2. Open the `Add` menu.
3. Select a widget template.
4. Choose one of the template's supported sizes.
5. Confirm add.

### Resize

1. Enter edit mode.
2. Use the card resize action.
3. Pick a supported size for that widget type.

### Rename

1. Enter edit mode.
2. Open the widget settings or edit action.
3. Change the custom card name.
4. Save the widget settings.

### Move

1. Enter edit mode.
2. Drag and drop the widget card.

### Delete

1. Enter edit mode.
2. Use the remove action on the card.
3. Confirm deletion.

### Lock

1. Enter edit mode.
2. Use the lock action on the widget card.
3. Leave edit mode. The widget remains visible but no longer reacts to normal dashboard taps until it is unlocked.

### Edit Data

- Quick Note: inline note editing with persisted content.
- RSS Feed: source/provider and tint configuration.
- Photo Frame: image URLs, shuffle mode, and tint configuration.
- Button: action label/icon/service/entity/service-data configuration.
- Battery Overview: read-only overview of battery entities.
- Energy Now: full-bleed live usage chart with current power overlaid on top, plus a settings dialog for choosing configured energy sources or matching energy-usage sensors/entities.
- Map: live person and `device_tracker` markers from Home Assistant, plus tint configuration.

## Architecture and File Map

### Add Dialog Templates

- `src/app/features/dashboard/components/add-card-dialog/types.ts`
- `src/app/features/dashboard/components/add-card-dialog/templates.tsx`

These files define widget type ids, labels, defaults, and supported sizes.

### Widget Host Renderer

- `src/app/features/dashboard/components/widget-card.tsx`

`WidgetCard` maps `CustomCard.type` to the actual widget component and manages per-widget update callbacks.

### Widget Components

- `src/app/features/dashboard/components/widgets/button-widget.tsx`
- `src/app/features/dashboard/components/widgets/note-widget.tsx`
- `src/app/features/dashboard/components/widgets/photo-frame-widget.tsx`
- `src/app/features/dashboard/components/widgets/battery-overview-widget.tsx`
- `src/app/features/dashboard/components/widgets/energy-now-dashboard-widget.tsx`
- `src/app/features/dashboard/components/widgets/map-widget.tsx`
- RSS widget component lives in `src/app/features/rss/components/rss-feed-card/`

### Widget Store

- `src/app/features/dashboard/stores/custom-cards-store.ts`

Store responsibilities:
- persist cards
- add/remove/update cards
- persist custom widget names through the card data payload
- normalize invalid migrated sizes
- preserve home-zone overrides and shared room sentinels used by the home and energy sections
- migrate legacy widget types (`news` -> `rss`)
- drop removed legacy custom-card types (`weather`, `calendar`, `presence`, `sparkline`) during migration

## Type Reference

```ts
type CardType = 'rss' | 'photo' | 'note' | 'battery' | 'energy-now' | 'button' | 'map';

type CardSize =
  | 'tiny'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'medium-vertical'
  | 'large'
  | 'extra-large';

interface CustomCard {
  id: string;
  type: CardType;
  size: CardSize;
  room: string;
  zone?: string;
  data?: Record<string, unknown>;
  createdAt: number;
}
```

`room` is not limited to Home Assistant room names. The dashboard also uses sentinel values such as
`__home__` and `__energy__` for section-level widget bands.

Dashboard export/import and shared profile sync also include dashboard entity state. That state now
contains `lockedCardIds`, so locked widget and entity cards survive YAML backup/restore and
Docker/add-on profile synchronization.

## Legacy Notes

- Legacy custom weather/calendar cards are no longer part of the widget system.
- Legacy presence/sparkline custom cards are removed and filtered out during persisted data migration.
