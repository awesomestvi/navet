---
title: Choose how cards react to taps
description: Select toggle-first or control-first behavior for supported cards.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/settings/card-interactions.md
---

Card interaction style changes the common tap path without changing what the provider device can
do.

![Interaction settings with card behavior choices and a live card preview.](/docs/how-to/settings/card-interaction-settings.webp)

## Choose a card behavior

Open **Settings → Interaction**, then choose:

- **Tap toggles** for a fast common action on supported cards.
- **Tap opens controls** when you prefer to inspect the control dialog first.

Settings buttons and secondary card actions remain available in both modes.

## Choose a safe household default

Control-first is useful on shared screens where accidental actions are more costly. Toggle-first
is useful for familiar lighting and switch controls.

Locks, alarms, and other risky actions keep their own confirmation behavior rather than inheriting
an unsafe one-tap path.

This is an account preference when profile synchronization is available. It is separate from the
device-setting groups used for kiosk mode, visual quality, and layout.
