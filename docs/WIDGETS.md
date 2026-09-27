---
title: Widgets
description: Available widget types, supported sizes, placement, and current limits.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/WIDGETS.md
---

Widgets add notes, photos, feeds, actions, and summaries to your dashboard. Open
**Add Card → Custom cards** to choose one. Widgets are saved with your dashboard and included in
configuration export and import.

## Overview

Add widgets to Home or a room, then use edit mode to move, resize, rename, lock, or delete them.
See [Add cards, devices, and widgets](/guide/dashboards/add-cards/) for the steps.

## Current Widget Types

| Widget | Purpose |
|---|---|
| Info | Summary of selected measurements |
| RSS Feed | Headlines from a public HTTPS feed |
| Photo | Rotating image frame |
| Quick Note | Freeform text note |
| Battery Overview | Battery readings and low-battery state |
| UPS Monitor | Power-backup status |
| Energy Now | Live energy snapshot |
| Energy Metric | Selected energy measurements |
| Action | Custom action button |
| Scene | Shortcut to a provider scene |
| Assist | Text and microphone access to a Home Assistant Assist pipeline |
| Map | People and tracker locations |

## What You Can Do With Widgets

- Add them to a room or Home.
- Move and resize them in edit mode.
- Change their name, content, source, or action in card settings.
- Lock a card to disable its input outside edit mode.
- Delete a widget when it is no longer useful.

## Sizes

When adding a widget, the library offers these sizes:

| Widget | Sizes in Add Card |
|---|---|
| Action, Scene, Assist | Tiny, Extra-small, Small |
| Photo, Quick Note | Small, Medium, Large, Extra-large |
| Info | Extra-small, Small, Medium, Large |
| Battery Overview, UPS Monitor, Energy Now, Energy Metric, Map | Small, Medium, Large |
| RSS Feed | Medium, Large |

## Placement

Widgets can be placed on Home or in a room. The Energy section offers **Energy Now** and
**Energy Metric**.

## Limits And Notes

- Available sources and actions depend on the connected provider and devices.
- Assist is offered when a Home Assistant session is configured. Conversations and microphone
  recordings last only while the dialog is open; the selected pipeline is saved with the card.
- RSS feeds require public HTTPS addresses and a signed-in Navet session.
- Provider devices are listed under **All cards**. Navet offers a generic entity card when a
  device has no dedicated card.

To show several media players in one card, follow
[Show several players in one card](/guide/everyday-control/media/#show-several-players-in-one-card).
