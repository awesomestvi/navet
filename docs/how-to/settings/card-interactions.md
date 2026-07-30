---
title: Choose how cards react to taps
description: Select toggle-first or control-first behavior and configure camera live-stream interaction.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/settings/card-interactions.md
---

Card interaction style changes the common tap path without changing what the provider device can
do.

![Interaction settings with card behavior and camera stream controls.](/docs/how-to/settings/card-interaction-settings.webp)

## Choose a card behavior

Open **Settings → Interaction**, then choose:

- **Tap toggles** for a fast common action on supported cards.
- **Tap opens controls** when you prefer to inspect the control dialog first.

Settings buttons and secondary card actions remain available in both modes.

## Camera live streams

Choose whether camera cards should request live playback as part of their normal interaction.
Live video can use more network and device resources than snapshots.

![The same light card showing the toggle-first and control-first outcomes.](/docs/how-to/settings/card-interaction-comparison.webp)

## Choose a safe household default

Control-first is useful on shared screens where accidental actions are more costly. Toggle-first
is useful for familiar lighting and switch controls.

Locks, alarms, and other risky actions keep their own confirmation behavior rather than inheriting
an unsafe one-tap path.

## If behavior differs on another screen

The setting may be device-owned. Apply it to all devices only when the same interaction model is
appropriate for every household screen.
