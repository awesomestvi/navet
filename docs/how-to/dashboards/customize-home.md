---
title: Customize your Home dashboard
description: Move, resize, hide, lock, and arrange Home cards without changing provider devices.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/customize-home.md
---

Home edit mode changes the active dashboard layout. It does not reconfigure the underlying device
unless a separate dialog explicitly describes a provider change.

![Home in edit mode with card controls, layout choices, undo, redo, Add Card, and Done visible.](/docs/how-to/dashboards/customize-home-layout-edit-mode.webp)

## Enter edit mode

1. Open the Home dashboard you want to change.
2. Choose **Customize** or **Edit dashboard**.
3. Confirm that the editing command bar appears.

## Arrange cards

While editing, you can:

- Drag a card to another position.
- Change its supported size.
- Move it into another section or column.
- Lock it to prevent accidental layout changes.
- Hide an automatically added entity.
- Delete a Navet widget or manually added card.

Card sizes are intentional per card type. A size that is unavailable would not provide a useful
version of that card. Saved or imported layouts that contain a compatible extra-wide card fall
back to Extra-Large or Large on narrower screens so the dashboard remains usable on tablets and
phones.

![The current phone card-size sheet with footprint choices and the selected size identified.](/docs/how-to/dashboards/card-size-selector.webp)

![Home edit mode showing the full layout, row, column, undo, redo, Add card, and Done command bar.](/docs/how-to/dashboards/customize-home-edit-mode.webp)

## Use undo and redo

Choose **Undo** to reverse the latest layout change and **Redo** to reapply it. These controls are
most useful before you leave edit mode.

## Finish

Choose **Done**. Navet saves the active Home layout to the dashboard profile.

If another registered device is editing the shared profile at the same time, Navet may ask which
version to keep. See
[Resolve a synchronization conflict](/guide/dashboards/sync-across-devices/#resolve-a-synchronization-conflict).

## Restore a hidden card

Open **Settings → Dashboard → Entity visibility** and use the restore action. See
[Restore removed entities](/guide/dashboards/restore-entities/).

## Before making a large change

Use [Back up and restore configuration](/guide/dashboards/backup-and-restore/) before replacing a
large layout or experimenting with several packs.
