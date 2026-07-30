---
title: Keep dashboards synchronized across devices
description: Understand shared profile changes, device-owned settings, and connected-device status.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/sync-across-devices.md
---

Supported standalone and server-backed installations can synchronize dashboard structure across
registered browsers while preserving settings that belong to one physical screen.

![Connected devices with sync state, last update, and device names.](/docs/how-to/dashboards/connected-devices.webp)

## Understand the scopes

- Dashboard layouts, dashboard collections, room workspace configuration, and other household
  structure can be shared.
- Display behavior such as visual quality and kiosk-related choices can be device-owned.
- Provider credential sessions remain browser-specific.

When Navet asks **Apply to this device** or **Apply to all devices**, choose the smallest scope that
matches your goal.

![The scope chooser for this device or all devices.](/docs/how-to/dashboards/settings-scope-dialog.webp)

## Name each screen

1. Open **Settings → System → Connected devices**.
2. Rename **This device**.
3. Repeat on each important wall display or browser.

The name appears in assignments, recent updates, and revision history.

## Check synchronization

In **Connected devices**, review:

- **Synced** or **Ready** for a healthy profile.
- **Saving** while a local update is being stored.
- **Offline** when the server cannot be reached.
- **Sync needs attention** when recovery is required.

## Remove an old device record

Use **Remove device** for a browser or display that is no longer used. This removes its registered
record; it does not erase the active dashboard collection.

## If two devices edit at once

Follow [Resolve a synchronization conflict](/guide/dashboards/sync-conflicts/). Do not repeatedly
reload both screens while deciding which version should win.
