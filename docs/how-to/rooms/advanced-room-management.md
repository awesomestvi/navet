---
title: Rename, merge, split, or delete rooms
description: Perform structural room changes and review their provider impact before saving.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/rooms/advanced-room-management.md
---

These operations can affect many devices. Review the provider impact before saving, especially
when Home Assistant room administration is available.

![Room actions showing Edit, Merge, Split, and Delete.](/docs/how-to/rooms/advanced-room-actions.webp)

## Rename a room

1. Select the room.
2. Choose **Edit room**.
3. Change the room name.
4. Review and save.

## Merge rooms

1. Choose **Merge room**.
2. Select the room that should remain.
3. Review the devices and connected systems affected.
4. Choose **Merge rooms**.

The source room is folded into the destination. Use a backup or provider-native recovery plan when
the provider change cannot be undone.

## Split a room

1. Choose **Split room**.
2. Enter the new room name.
3. Select the devices to move.
4. Choose **Create split room**.
5. Review and save the changes.

![The device-selection step used while splitting a room.](/docs/how-to/rooms/split-room-dialog.webp)

## Delete a room

1. Choose **Delete room**.
2. Choose where affected devices should go, or leave them unassigned.
3. Read the provider warning.
4. Confirm **Delete room**.

Deletion can be permanent after a connected provider accepts it. Navet shows the affected device
count, provider list, and destination before confirmation.

## Partial success

If Navet saves local changes but a provider operation fails, read the partial-success summary. Do
not repeat the entire operation blindly; confirm the provider's current room structure first.
