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

### Core Behavior

- Widgets are stored locally in browser storage (`ha-dashboard-custom-cards`)
- RSS widget feed configuration is stored on the widget card itself so exports/imports keep provider selection and article count
- Docker/add-on builds keep the optional RSS URL proxy disabled by default for a smaller image; enable it with `NAVET_ENABLE_RSS_PROXY=true` if a feed blocks browser CORS
- Widgets support edit-mode move/resize/delete flows
- Widget sizing is template-specific (not one global size list)
- Widgets can be assigned to rooms and participate in home layout sections

## Supported Sizes by Widget

The Add Card dialog defines widget size support in `src/app/features/dashboard/components/add-card-dialog/templates.tsx`.

- `rss`: `medium`, `large`
- `photo`: `small`, `medium`, `large`, `extra-large`
- `note`: `small`, `medium`, `large`, `extra-large`
- `battery`: `small`, `medium`, `large`
- `energy-now`: `small`, `medium`, `large`
- `button`: `tiny`, `extra-small`, `small`

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

### Move

1. Enter edit mode.
2. Drag and drop the widget card.

### Delete

1. Enter edit mode.
2. Use the remove action on the card.
3. Confirm deletion.

### Edit Data

- Quick Note: inline note editing with persisted content.
- RSS Feed: source/provider and tint configuration.
- Photo Frame: image URLs, shuffle mode, and tint configuration.
- Button: action label/icon/service/entity/service-data configuration.
- Battery Overview: read-only overview of battery entities.
- Energy Now: full-bleed live usage chart with current power overlaid on top, plus a settings dialog for choosing configured energy sources or matching energy-usage sensors/entities.

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
- RSS widget component lives in `src/app/features/rss/components/rss-feed-card/`

### Widget Store

- `src/app/features/dashboard/stores/custom-cards-store.ts`

Store responsibilities:
- persist cards
- add/remove/update cards
- normalize invalid migrated sizes
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

## Legacy Notes

- Legacy custom weather/calendar cards are no longer part of the widget system.
- Legacy presence/sparkline custom cards are removed and filtered out during persisted data migration.
