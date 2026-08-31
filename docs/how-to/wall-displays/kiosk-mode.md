---
title: Set up and recover kiosk and Wall Display mode
description: Hide normal chrome, keep the screen awake, navigate through Kiosk control, and recover access.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/wall-displays/kiosk-mode.md
---

Use **Wall display** for a dedicated household screen. It applies a coordinated set of settings
instead of requiring each option to be changed separately.

![Dashboard settings with Standard and Wall display presets.](/docs/how-to/wall-displays/wall-display-preset.webp)

## Apply the preset

1. Open **Settings → Dashboard** on the display.
2. Under **Display preset**, choose **Wall display**.

The preset enables:

- Kiosk mode.
- Keep-awake.
- A clock header.
- A denser layout.
- The Home summary bar.

The preset applies to the current device. To reuse the same display behavior elsewhere, use
**Settings → System → Connected devices → Device settings** to copy it once or link a group of
screens.

## Use Navet in kiosk mode

Kiosk mode hides the normal Navet header and sidebar. Use the bottom-right **More** button to open
**Kiosk control**.

![Kiosk control with dashboards, sections, rooms, management actions, and Exit kiosk mode.](/docs/how-to/wall-displays/kiosk-control-center.webp)

Kiosk control provides:

- Dashboards, sections, and room navigation.
- Settings and room management.
- Dashboard and sidebar customization.
- Kiosk behavior, including swipe navigation.
- A direct **Exit kiosk mode** action.

Open **Kiosk behavior** to enable **Swipe between rooms**. Swipes work on empty dashboard space so
they do not replace normal card gestures.

## Home Assistant header and sidebar

Navet kiosk mode controls Navet's own chrome. In Home Assistant-hosted modes, hiding Home
Assistant's surrounding header and sidebar also requires the optional shell module described in
the [Home Assistant installation guide](/install/home-assistant/).

## Leave kiosk mode

1. Open **Kiosk control** from the bottom-right **More** button.
2. Choose **Exit kiosk mode**.

You can also open **Settings → Dashboard** and choose the **Standard** display preset.

Keep this recovery path available before mounting a tablet where browser controls are difficult to
reach.

## Check keep-awake

Open **Settings → Dashboard → Keep device awake** and read the status:

- **Active via browser wake lock** needs no action.
- **Active via silent audio fallback** is working through the fallback.
- **Pending activation** requires a user gesture.
- **Blocked** means the browser or device denied the method.
- **Unsupported** means neither path is available.

Choose **Tap to activate fallback audio** when shown.

![Dashboard settings showing the Keep device awake control and fallback behavior.](/docs/how-to/wall-displays/keep-awake-status.webp)

Keep-awake is best effort. Embedded browsers, power-saving modes, and operating-system rules can
still turn off a display.

## If an embedded page is blocked

When a custom sidebar page reports that it may be blocking embedding:

1. Choose **Retry** once.
2. Choose **Open externally** if the site still refuses to load.
3. Edit the shortcut to open a new browser tab instead of an embedded page.

Sites can block framing through their own security headers; Navet cannot override that policy.

## Prevent getting locked out

- Test **Kiosk control** before mounting the display.
- Keep browser or operating-system access available.
- Keep the display independent until its kiosk behavior is confirmed; link it to a Device settings
  group afterward if needed.
- Record the Navet address outside the kiosk.
