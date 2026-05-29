# Widgets

Widgets are Navet-owned dashboard blocks. They are separate from provider-backed entity cards like
weather, calendar, lights, or cameras.

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

## What You Can Do With Them

Widgets support the normal dashboard editing flow:

- add them to a room or the Home overview
- move them
- resize them
- rename them
- lock them
- delete them

Widgets are included in dashboard export and import.

## Sizes

Sizes depend on the widget type.

- `button`: `tiny`, `extra-small`, `small`
- `photo`, `note`: `small`, `medium`, `large`, `extra-large`
- `battery`, `ups`, `energy-now`, `info`, `map`: `small`, `medium`, `large`
- `rss`: `medium`, `large`

## Placement

Widgets can be placed in:

- a room
- the Home overview
- the Energy section, for supported widget types

There are internal room IDs for special overview areas, but users do not need to manage those
directly.

## Notes

- Widget sizing is per widget type, not global.
- Widgets are part of Navet itself, not provider-native card definitions.
- RSS uses Navet's same-origin proxy instead of direct browser fetches.
