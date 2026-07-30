---
title: Play and manage media
description: Browse sources, search, build a queue, choose speakers, group playback, and use TV controls.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/media.md
---

Media features vary significantly by provider and player. Navet shows the controls registered by
the active media feature service.

![The Media dashboard with now playing, browse, queue, sources, and devices.](/docs/how-to/everyday-control/media-dashboard.webp)

## Choose a destination

Open **Devices** or the destination control and select the speaker or player that should receive
the action.

## Browse and play

1. Open **Browse**.
2. Choose a source or media category.
3. Search when the provider supports it.
4. Choose an item.
5. Select play-now or enqueue behavior when offered.

## Manage playback

Use **Queue** to review upcoming media. Now-playing controls can include play, pause, next, previous,
seek, repeat, shuffle, and volume.

![The media browser and queue with a destination selected.](/docs/how-to/everyday-control/media-browser-queue.webp)

## Group speakers

Choose a primary session or destination, then add compatible speakers. Grouping support and group
ownership come from the provider.

## Use TV controls

Supported media devices can expose source selection, volume, channel controls, and a navigation
pad. Hide the navigation pad when it is not useful for that player.

## If artwork or browsing fails

Authenticated artwork and browse URLs may need Navet's resource proxy. Reload once, confirm the
provider connection, and check the capability matrix before treating the player as unsupported.
