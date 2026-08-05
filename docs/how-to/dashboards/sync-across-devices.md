---
title: Keep dashboards synchronized across devices
description: Understand shared profile changes, device-owned settings, and connected-device status.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/sync-across-devices.md
---

Supported standalone and server-backed installations can synchronize dashboard structure across
registered browsers while preserving settings that belong to one physical screen.

![Connected devices showing sync state, recent activity, and the Device settings controls.](/docs/how-to/dashboards/connected-devices.webp)

## Understand what synchronizes

- Dashboard layouts, dashboard collections, room workspace configuration, and other household
  structure can be shared.
- Display behavior such as kiosk mode, visual quality, and layout is independent on each device by
  default.
- Provider credential sessions remain browser-specific.

Navet no longer asks you to choose a scope every time a display setting changes. Instead, use the
controls under **Device settings** when two or more screens should match.

## Name each screen

1. Open **Settings → System → Connected devices**.
2. Rename **This device**.
3. Repeat on each important wall display or browser.

The name appears in assignments, recent updates, and revision history.

## Copy settings once

Use this when another screen should start with the same kiosk, visual-quality, and layout settings
but remain independent afterward.

1. Configure the source screen the way you want.
2. Open **Settings → System → Connected devices → Device settings**.
3. Choose **Copy to devices**.
4. Select the destination screens and choose **Copy settings**.

Later changes on either screen do not affect the other.

## Keep display settings linked

Use a sync group for wall panels that should continue to share kiosk mode, visual quality, and
layout.

1. Under **Device settings**, choose **Keep devices in sync**.
2. Enter a recognizable group name such as **Wall displays**.
3. Select the devices that should share those settings.
4. Save the group.

Choose the group later to add or remove devices. A removed device keeps its current settings and
becomes independent.

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
