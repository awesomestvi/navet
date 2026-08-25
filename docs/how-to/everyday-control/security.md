---
title: Use the Security dashboard
description: Review attention states and safely control alarms, locks, covers, and cameras.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/security.md
---

Security brings together provider-backed alarms, locks, covers, openings, and cameras. Risky
actions require deliberate confirmation.

![The current Security dashboard with camera feeds, needs-attention actions, alarm controls, recent activity, and grouped security cards.](/docs/how-to/everyday-control/security-dashboard.webp)

## Review the overview

The summary strip orders attention, unavailable, live, and normal counts by priority. The command
center keeps the selected camera feeds prominent while **Needs attention**, alarm controls, and
**Recent activity** stay together beside them on larger screens and stack into the same reading
order on phones.

- Select an attention row to jump to that entity's card.
- Select a camera activity row to open the matching camera.
- Choose **Load older activity** when provider history is available and you need earlier events.
- Use the group buttons below the overview to inspect doors and windows, locks, motion and
  occupancy, cameras, and other available security groups.

## Customize the overview

1. Choose **Customize** while Security is open.
2. Choose **Overview**.
3. Keep **Automatic** to prioritize up to two available cameras, or choose **Manual**.
4. In Manual mode, select and order the cameras, locks, sensors, people, or other security
   entities you want at the top.
5. Save the overview and choose **Done** to leave edit mode.

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

Select an overview camera to open its live viewer. Kiosk mode can hide configuration controls
while leaving the camera surface visible.

When a camera exposes linked lights, desktop uses a compact popover and phones use a bottom sheet
for power and brightness so the controls remain touch-friendly.

If video does not play, use [Camera does not play live video](/guide/troubleshooting/camera-playback/).

## Safety note

Navet sends commands through the owning provider. Verify physical state when safety matters,
especially after a network or provider error.
