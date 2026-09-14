---
title: Control lights and scenes
description: Read whole-home lighting status, run scenes, and control room or individual lights.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/lights-and-scenes.md
---

The Lights section groups supported lights and switches by room while keeping common actions close
to the current state.

![The current phone Lights dashboard with status, quick scenes, whole-home actions, and expandable room groups.](/docs/how-to/everyday-control/lights-dashboard.webp)

The summary strip shows how many lights are on, average brightness when available, and unavailable
lights that need attention. Quick scenes and **Expand all**, **Collapse all**, or whole-home power
actions stay beside that summary.

## Control a room

1. Open **Lights**.
2. Choose a room group. Rooms needing attention appear first, followed by active and inactive
   rooms.
3. Use the room icon to turn the available room lights on or off.
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

## Switch card measurements

Switch cards automatically show available measurements, such as power, voltage, current, and
energy. Card size determines how many readings fit. Readings remain visible when a switch is off,
and new measurements appear as the provider supplies them.

Open the switch card's settings and choose **Metrics** to remove or restore readings. Navet
remembers removed measurements for that card, including when a reading temporarily disappears.

## Run a scene

Choose a scene shortcut to ask the owning provider to activate it. Scene behavior comes from the
provider; Navet does not rewrite the scene actions.

## If a light is missing

Confirm that it is assigned to the expected room, visible in Navet, and supplied by a selected
provider. Then follow [Rooms, devices, or entities are missing](/guide/troubleshooting/missing-entities/).
