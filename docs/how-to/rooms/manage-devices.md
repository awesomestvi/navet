---
title: Move, hide, and restore devices in rooms
description: Adjust dashboard placement without accidentally deleting a provider entity.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/rooms/manage-devices.md
---

Device actions in the Rooms workspace distinguish dashboard visibility from provider-backed room
assignment.

![A selected room showing On dashboard and Hidden device lists.](/docs/how-to/rooms/room-device-lists.webp)

## Open the device list

1. Open the Rooms workspace.
2. Select a room.
3. Open **Devices**.

## Hide a device from the dashboard

Find the device and choose **Hide**. The device moves to **Hidden** and remains present in the
provider.

Use **Show** to restore it to the dashboard.

## Move a device

1. Open the device's action menu.
2. Choose **Move**.
3. Search for and select the destination room.
4. Review whether the move affects only Navet or also the connected provider.
5. Save the change.

## Remove a manually placed device

**Remove** takes the device out of the current dashboard placement. It is not the same as deleting
the device from the provider.

## If a device has no room

Select **Not in a room**, then move it into the appropriate room. A provider may continue to report
it as unassigned when room administration is unsupported.

## If the device disappears everywhere

Clear room filters, check **Hidden**, and search Add Card. Then use
[Rooms, devices, or entities are missing](/guide/troubleshooting/missing-entities/).
