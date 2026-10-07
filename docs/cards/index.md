---
title: Navet Cards
description: Add Navet controls to your existing Home Assistant dashboard.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/index.md
---

Navet Cards brings lights, rooms, heating, music, and everyday readings into your
Home Assistant dashboard. Configure cards in the visual editor or YAML and arrange
them with Home Assistant's dashboard tools.

**Navet Cards is an early beta for Home Assistant 2024.6.4 or newer.** Read the notes
for your selected [release](https://github.com/navet-app/navet-cards/releases) before installing.

![Room dashboard with lights, climate, sensors, and media](/cards-preview/composition.webp)

*Preview with simulated devices.*

## Choose Navet or Navet Cards

| | Navet | Navet Cards |
| --- | --- | --- |
| Dashboard | Complete household interface with its own navigation and settings | Custom cards placed in Home Assistant's dashboard |
| Platforms | Home Assistant, Homey, and openHAB | Home Assistant |
| Setup | [Choose a Navet installation](/install/) | [Install a JavaScript card resource](/cards/installation/) |
| Layout | Navet dashboard and room settings | Home Assistant dashboard editor |

Navet Cards runs independently using your Home Assistant login and device connections.
The Navet app is optional. Each card shows the controls supported by its selected entity,
a device or reading supplied by Home Assistant.

## Start here

1. [Install and add your first card](/cards/installation/).
2. [Build a room dashboard](/cards/rooms/) with grouped controls.
3. [Choose appearance and layouts](/cards/appearance/).
4. [Set up actions and sub-controls](/cards/actions/) for related devices.

Use the [card and configuration reference](/cards/reference/) to choose a card type.
For resource updates, rollback, or missing cards, see [updates and troubleshooting](/cards/troubleshooting/).

## Help and feedback

Ask setup questions in [Cards Discussions](https://github.com/navet-app/navet-cards/discussions).
Report a reproducible problem in [Cards Issues](https://github.com/navet-app/navet-cards/issues/new/choose)
with your card version, Home Assistant version, and a minimal configuration.
