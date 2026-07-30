---
title: Recover kiosk access and keep-awake
description: Exit kiosk mode, activate wake-lock fallback, and recover embedded-display problems.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/wall-displays/recovery.md
---

Use this guide when normal navigation is hidden, the screen still sleeps, or an embedded page will
not load.

![The kiosk orbit trigger and Settings destination.](/docs/how-to/wall-displays/kiosk-recovery-route.webp)

## Exit kiosk mode

1. Use the orbit trigger.
2. Open **Settings**.
3. Open **Dashboard**.
4. Choose **Standard** under **Display preset**, or turn off **Kiosk mode**.

If Home Assistant's outer chrome is also hidden, change or remove the optional shell module
configuration from Home Assistant.

## Check keep-awake

Open **Settings → Dashboard → Keep device awake** and read the status:

- **Active via browser wake lock** needs no action.
- **Active via silent audio fallback** is working through the fallback.
- **Pending activation** requires a user gesture.
- **Blocked** means the browser or device denied the method.
- **Unsupported** means neither path is available.

Choose **Tap to activate fallback audio** when shown.

![Keep-awake statuses including pending activation and blocked.](/docs/how-to/wall-displays/keep-awake-status.webp)

Keep-awake is best effort. Some embedded browsers, power-saving modes, and operating-system rules
can still turn off a display.

## Embedded page is blocked

When a custom sidebar page reports that it may be blocking embedding:

1. Choose **Retry** once.
2. Choose **Open externally** if the site still refuses to load.
3. Edit the shortcut to open a new browser tab instead of an embedded page.

Sites can block framing through their own security headers; Navet cannot override that policy.

## Prevent getting locked out

- Test the orbit menu before mounting the display.
- Keep browser or operating-system access available.
- Apply kiosk settings to **This device** first.
- Record the Navet address outside the kiosk.
