# Widgets

Widgets are Navet-owned dashboard blocks. They are separate from provider-backed entity cards such
as weather, calendar, lights, or cameras.

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
| `button` | custom action button |
| `map` | people and tracker locations |

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
| `battery`, `ups`, `energy-now`, `info`, `map` | `small`, `medium`, `large` |
| `rss` | `medium`, `large` |

## Placement

Widgets can be placed in:

- a room
- the Home overview
- the Energy section, for supported widget types

There are internal room IDs for special overview areas, but users do not need to manage those
directly.

## Limits And Notes

- Widgets are part of Navet itself, not provider-native card definitions.
- RSS uses Navet's same-origin proxy instead of direct browser fetches.
- Supported sizes and placement depend on widget type.
