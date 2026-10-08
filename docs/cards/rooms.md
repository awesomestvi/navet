---
title: Build a room dashboard
description: Group Home Assistant entities into room cards and add room navigation.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/rooms.md
---

[Install Navet Cards](/cards/installation/) first. Start with one room and the controls
people use there most often.

## Add a room card

1. Edit your Home Assistant dashboard and choose **Add card**.
2. Search for **Navet** and choose the room card.
3. Select your Home Assistant area and name the card.
4. Save. Open **Controls** to use the room's supported device controls.

In YAML, use the area's ID:

```yaml
type: custom:navet-room-card
area: kitchen
name: Kitchen
panel_id: "#kitchen"
```

Area membership follows entity assignments, with device areas as a fallback.
Hidden, disabled, and diagnostic entities are excluded. Select a member's name in the
room dialog to open Home Assistant's entity details; use **Close** or Escape to dismiss it.

## Choose room members yourself

Use **Selected entities** in the visual editor to choose a specific set of devices and readings.
An explicit list takes precedence over area membership and also works when area information
is unavailable.

```yaml
type: custom:navet-room-card
name: Kitchen
entities:
  - light.kitchen
  - switch.coffee_machine
  - sensor.kitchen_temperature
```

Replace these example IDs with your own. Add separate light, climate, or media cards for
controls you want to keep visible on the dashboard. Home Assistant owns card placement.

## Navigate directly to a room

Give each room a unique `panel_id` hash within the view. Add a navigation card in the same view:

```yaml
type: custom:navet-navigation-card
links:
  - name: Kitchen
    path: "#kitchen"
  - name: Home
    path: /lovelace/home
```

The room hash opens the matching room dialog. Replace `/lovelace/home` with your dashboard's
local path. Closing the room clears its hash.

Next, [adjust appearance and sizing](/cards/appearance/) or [add sub-controls](/cards/actions/#sub-controls).
