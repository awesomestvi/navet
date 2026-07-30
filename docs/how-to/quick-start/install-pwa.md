---
title: Install Navet as a PWA
description: Add Navet to a phone, tablet, or desktop and apply future updates.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/quick-start/install-pwa.md
---

Installing Navet as a Progressive Web App gives it an app icon and a standalone window while it
continues to use your self-hosted Navet installation.

![A supported browser offering to install Navet.](/docs/how-to/quick-start/pwa-install-prompt.webp)

## Before you start

- Open Navet from its normal trusted address.
- Sign in and confirm that the dashboard works in the browser.
- HTTPS is normally required outside local development.

## Install on a phone or tablet

### iPhone or iPad

1. Open Navet in Safari.
2. Open the Share menu.
3. Choose **Add to Home Screen**.
4. Confirm the name and choose **Add**.

### Android

1. Open Navet in a supported browser.
2. Open the browser menu.
3. Choose **Install app** or **Add to Home screen**.
4. Confirm the installation.

## Install on desktop

In a supporting Chromium-based browser, choose the install action in the address bar or browser
menu. The wording varies by browser.

![Navet running from an installed app window with its own icon.](/docs/how-to/quick-start/pwa-installed.webp)

## Apply an update

When Navet reports that an update is ready, choose the update action and allow the app to reload.
Unsaved edits should be completed before reloading.

## If installation is not offered

- Confirm that you are using the normal Navet address rather than an embedded preview.
- Check that the address is trusted and uses HTTPS where required.
- Reload after the first successful connection.
- On Home Assistant Ingress, browser installation behavior can differ from standalone Navet.

Installing the PWA does not copy your provider or dashboard data to Navet-operated servers.
