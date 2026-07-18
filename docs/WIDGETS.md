---
title: Widgets
description: Available widget types, supported sizes, placement, and current limits.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/WIDGETS.md
---

Widgets are Navet-owned dashboard blocks. Most are separate from provider-backed entity cards such
as weather, calendar, lights, or cameras; the generic `entity` widget is the intentional bridge for
a normalized provider entity that has no richer dedicated card.

## Overview

Use widgets when you want dashboard content that belongs to Navet itself rather than to a provider
entity type.

Widgets are included in dashboard export and import.

## Current Widget Types

| Widget | Purpose |
|---|---|
| `info` | compact summary cards for grouped information |
| `rss` | RSS headlines shown through Navet's proxy |
| `photo` | rotating image frame |
| `note` | freeform text note |
| `battery` | low-battery overview |
| `ups` | UPS status overview |
| `energy-now` | live energy snapshot |
| `media-stack` | responsive media summary retained in saved and imported dashboard profiles |
| `button` | custom action button |
| `map` | people and tracker locations |
| `entity` | generic fallback card for a normalized provider entity |

## What You Can Do With Widgets

Widgets support the normal dashboard editing flow:

- add them to a room or the Home overview
- move them
- resize them
- rename them
- lock them
- delete them

## Sizes

Widget sizing is per widget type, not global.

| Widget | Supported sizes |
|---|---|
| `button` | `tiny`, `extra-small`, `small` |
| `photo`, `note` | `small`, `medium`, `large`, `extra-large` |
| `info`, `entity` | `extra-small`, `small`, `medium`, `large` |
| `battery`, `ups`, `energy-now`, `media-stack`, `map` | `small`, `medium`, `large` |
| `rss` | `medium`, `large` in the Add card flow |

## Placement

Widgets can be placed in:

- a room
- the Home overview
- the Energy section, where the chooser is limited to `energy-now` and the energy-metric preset of
  `info`

There are internal room IDs for special overview areas, but users do not need to manage those
directly.

## Limits And Notes

- Widgets are part of Navet itself, not provider-native card definitions.
- The Widgets tab offers eleven choices. Nine create the base `info`, `rss`, `photo`, `note`,
  `battery`, `ups`, `energy-now`, `button`, and `map` types; scene and energy-metric are presets of
  `button` and `info`. Generic `entity` cards come from the Cards library rather than the Widgets
  tab. `media-stack` remains runtime-supported
  for compatible saved and imported dashboard profiles, but is intentionally hidden from the
  custom-widget chooser.
- RSS uses Navet's same-origin proxy instead of direct browser fetches.
- The `entity` widget is a fallback for entities without a richer dedicated Navet card.
- Supported sizes and placement depend on widget type.
