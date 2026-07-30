---
title: Optimize Navet for low-power displays
description: Reduce rendering cost on Raspberry Pi-class hardware without removing controls.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/wall-displays/low-power.md
---

Navet can reduce expensive visual effects while preserving information, layout meaning, and
controls.

![System settings showing Auto, High, Medium, and Low visual quality.](/docs/how-to/wall-displays/visual-quality.webp)

## Start with Auto

1. Open **Settings → System** on the low-power screen.
2. Find **Visual quality**.
3. Choose **Auto**.

ARM Linux browsers such as Raspberry Pi OS normally start in a lower-cost tier automatically.

## Choose Low manually

Use **Low** when scrolling, live updates, or dialogs remain sluggish. Low quality reduces:

- Backdrop and filter effects.
- Large or layered shadows.
- Animated transitions and ambient layers.
- Other compositor-heavy decoration.

It does not remove device state or household controls.

![The same dashboard in richer and reduced visual-quality modes.](/docs/how-to/wall-displays/visual-quality-comparison.webp)

## Reduce motion

Use **Disable animations** or the system reduced-motion preference when motion is distracting or
hardware is constrained.

## Keep the setting local

When Navet asks where to apply visual quality, choose **This device**. A wall panel can remain on
Low while a phone or desktop uses richer rendering.

## Additional checks

- Prefer one browser tab dedicated to Navet.
- Avoid extremely large external room images or photo-frame sources.
- Use Default spacing if denser layouts make touch or scrolling harder.
- Confirm that the browser and display resolution match the panel.
