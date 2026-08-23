---
title: Use the Security dashboard
description: Review attention states and safely control alarms, locks, covers, and cameras.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/security.md
---

Security brings together provider-backed alarms, locks, covers, openings, and cameras. Risky
actions require deliberate confirmation.

![The current Security dashboard with priority summary, needs-attention surface, alarm controls, and filtered security cards.](/docs/how-to/everyday-control/security-dashboard.webp)

## Review the overview

The summary strip orders critical, attention, unavailable, live, and secure counts by priority.
The first section names what needs attention and keeps the current alarm and live-camera state
close by. Use **All Security** to filter doors and windows, locks, motion and occupancy, or cameras.

## Control a lock or cover

Open the card, confirm the target, then use the supported action. Slide or swipe confirmation can
be required for lock state changes.

## Arm or disarm an alarm

1. Select the alarm panel.
2. Choose the supported arm or disarm mode.
3. Enter a code when required.
4. Confirm the action.

The emergency trigger requires a separate confirmation.

![The current phone confirmation sheet for intentionally triggering an alarm remotely.](/docs/how-to/everyday-control/alarm-confirmation.webp)

## View cameras

Use the live camera area for current streams. Kiosk mode can hide configuration controls while
leaving the live surface visible.

When a camera exposes linked lights, desktop uses a compact popover and phones use a bottom sheet
for power and brightness so the controls remain touch-friendly.

If video does not play, use [Camera does not play live video](/guide/troubleshooting/camera-playback/).

## Safety note

Navet sends commands through the owning provider. Verify physical state when safety matters,
especially after a network or provider error.
