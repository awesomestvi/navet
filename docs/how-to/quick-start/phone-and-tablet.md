---
title: Use Navet on a phone or tablet
description: Navigate on smaller screens, install the PWA, and prepare a dedicated tablet.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/quick-start/phone-and-tablet.md
---

Navet keeps the same rooms, sections, and cards across screen sizes, but moves navigation into
touch-friendly sheets on smaller screens.

![Navet Home on a phone with the Home button and section menu identified.](/docs/how-to/quick-start/mobile-home.webp)

## Move between sections

1. Use the **Home** control to return to the Home overview.
2. Open the section menu to choose **Energy**, **Climate**, **Security**, **Lights**, **Media**,
   **Household**, or **Settings**.
3. Recently used sections remain easy to reach.

The mobile menu renders only the controls for the active screen size. Keyboard and screen-reader
users should not encounter a second hidden copy of the desktop navigation.

## Choose a room

Open the room selector in the header, then choose a room or **All rooms**. Room groups can be
expanded when your home has a deeper structure.

![The mobile section menu and room selector open side by side.](/docs/how-to/quick-start/mobile-navigation-sheets.webp)

## Search

Use the header search action to find visible devices and dashboard content. If a search result is
not available, check whether the entity is hidden or belongs to a provider that is not selected.

## Open card controls

- Tap the card's main area to use the configured interaction style.
- Use the settings or details action for secondary controls.
- Dialogs become sheets where that gives touch controls more room.
- Avoid browser zoom while dragging or resizing cards in edit mode.

## Use a tablet as a household display

For a dedicated tablet, use the **Wall display** preset instead of changing every related setting
individually. It enables kiosk mode, keep-awake, a clock header, denser spacing, and the Home
summary bar.

See [Set up kiosk and Wall Display mode](/guide/wall-displays/kiosk-mode/).

## Add Navet to your Home Screen

Installing Navet as a PWA gives it an app icon and opens it without normal browser controls. Open
Navet from its trusted address, sign in, and confirm the dashboard works first. HTTPS is normally
required outside local development.

### iPhone

1. Open Navet in Safari.
2. Open the Share menu and choose **Add to Home Screen**.
3. Confirm the name and choose **Add**.

### Android

1. Open Navet in a supported browser.
2. Open the browser menu and choose **Install app** or **Add to Home screen**.
3. Confirm the installation.

![Navet opened from a phone's Home Screen without browser controls.](/docs/how-to/quick-start/pwa-installed.webp)

When Navet reports an update, finish unsaved edits, choose the update action, and allow the app to
reload.

If installation is not offered, use the normal Navet address rather than an embedded preview,
confirm HTTPS where required, and reload after the first successful connection. Home Assistant
Ingress installation behavior can differ from standalone Navet.

## If controls feel too dense

Open **Settings → Dashboard** and change **Space usage** to **Default**. More-space mode fits more
content but can produce smaller touch targets.
