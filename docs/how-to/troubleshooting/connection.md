---
title: Connection or sign-in fails
description: Check the address, deployment path, provider status, and browser-specific session.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/troubleshooting/connection.md
---

Connection recovery differs by deployment mode. Avoid clearing all dashboard data before checking
the provider and address.

![System settings showing connected and available providers.](/docs/how-to/troubleshooting/connection-status.webp)

## Check the visible error

Common causes include:

- An unreachable provider address.
- A LAN, VPN, Tailscale, or external Home Assistant route that is unavailable from the current
  browser.
- DNS, firewall, or CORS restrictions.
- HTTP and HTTPS mismatch.
- An expired browser-specific session.
- A standalone container that cannot reach the configured upstream.

## Reconnect from Settings

1. Open **Settings → System**.
2. Review **Connection** and **Providers**.
3. Confirm the provider address.
4. Choose **Connect** or repeat the supported sign-in flow.

Do not use a manual long-lived-token flow for Home Assistant.

## Sign In At Home Or Through A VPN

Standalone Navet keeps the browser-facing Home Assistant address separate from its trusted
upstream. This lets the same installation open Home Assistant through a LAN address at home and a
VPN, Tailscale, or external address while away.

1. From the device that is signing in, confirm that you can open Home Assistant directly at the
   address you plan to use.
2. Enter that same address in Navet.
3. Choose **Continue** and finish the Home Assistant sign-in.

The address must lead to the same Home Assistant installation. Navet opens the authorization page
through the browser address, then verifies the returned OAuth code against its already trusted
upstream.

- If the authorization page does not open, troubleshoot the browser's LAN, VPN, DNS, or external
  route.
- If Home Assistant accepts the sign-in but returning to Navet fails, verify that the Navet
  container can reach and trust its configured or previously enrolled upstream.
- If Navet says operator pairing is required, the installation does not currently have a trusted
  Home Assistant upstream. On an existing installation, first verify that its original
  `navet-data` volume is mounted. On a fresh or reset installation, complete the one-time pairing
  described in [Home Assistant setup](/install/home-assistant/#standalone-docker).

## Deployment-specific checks

- Home Assistant Ingress should reuse the parent Home Assistant session.
- Standalone Docker needs a browser-reachable Home Assistant authorization address and a trusted
  upstream reachable from the Navet container. They may be different routes to the same Home
  Assistant installation.
- openHAB must be reachable from the browser and use the configured credentials.
- Homey OAuth requires the configured client and callback route.

## Reset only the affected connection

Use **Reset connection** or **Disconnect** for the affected provider, then reconnect. Signing out
ends the Navet session on the current device; it does not delete provider devices.

## Report safely

Include the Navet version, installation mode, provider, failing address hostname, HTTP status, and
exact visible error. Remove tokens, cookies, passwords, and signed URLs.
