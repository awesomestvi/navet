---
title: Set up kiosk and Wall Display mode
description: Hide normal chrome, keep the screen awake, and retain navigation through the orbit menu.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/wall-displays/kiosk-mode.md
---

Use **Wall display** for a dedicated household screen. It applies a coordinated set of settings
instead of requiring each option to be changed separately.

![Dashboard settings with Standard and Wall display presets.](/docs/how-to/wall-displays/wall-display-preset.webp)

## Apply the preset

1. Open **Settings → Dashboard** on the display.
2. Under **Display preset**, choose **Wall display**.
3. When asked for scope, choose **This device** unless every registered screen should behave as a
   wall display.

The preset enables:

- Kiosk mode.
- Keep-awake.
- A clock header.
- More-space layout.
- The Home summary bar.

## Use Navet in kiosk mode

Kiosk mode hides the normal Navet header and sidebar. Use the orbit trigger to open:

- Main sections.
- Room navigation.
- Settings.
- Dashboard customization.

![A landscape tablet in kiosk mode with the orbit menu open.](/docs/how-to/wall-displays/kiosk-orbit-menu.webp)

## Home Assistant header and sidebar

Navet kiosk mode controls Navet's own chrome. In Home Assistant-hosted modes, hiding Home
Assistant's surrounding header and sidebar also requires the optional shell module described in
the [Home Assistant installation guide](/install/home-assistant/).

## Leave kiosk mode

1. Open the orbit menu.
2. Open **Settings**.
3. Choose the **Standard** display preset or turn off **Kiosk mode**.

Keep this recovery path available before mounting a tablet where browser controls are difficult to
reach.

## If the display sleeps

Check the keep-awake status and follow
[Recover kiosk access and keep-awake](/guide/wall-displays/recovery/).
