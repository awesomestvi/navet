---
title: Control lights and scenes
description: Use room lighting, brightness, color, scenes, and responsive card or table layouts.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/lights-and-scenes.md
---

The Lights section groups supported lights and switches by room while keeping common actions close
to the current state.

![The Lights dashboard with room summaries and scene shortcuts.](/docs/how-to/everyday-control/lights-dashboard.webp)

## Control a room

1. Open **Lights**.
2. Choose a room.
3. Use the room power action for the visible room group.
4. Adjust room brightness when supported.

Expand a group to work with individual lights.

## Control one light

Open the light card to use available controls:

- Power.
- Brightness.
- Color temperature.
- Color.
- Saved brightness or temperature presets.

The card only shows controls supported by the entity.

![A light control dialog with brightness, color temperature, and color controls.](/docs/how-to/everyday-control/light-controls.webp)

## Run a scene

Choose a scene shortcut to ask the owning provider to activate it. Scene behavior comes from the
provider; Navet does not rewrite the scene actions.

## Change the presentation

Use the Lights customization controls to choose the responsive card or table presentation and to
show or hide scene shortcuts.

## If a light is missing

Confirm that it is assigned to the expected room, visible in Navet, and supplied by a selected
provider. Then follow [Rooms, devices, or entities are missing](/guide/troubleshooting/missing-entities/).
