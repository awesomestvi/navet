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

## Deployment-specific checks

- Home Assistant Ingress should reuse the parent Home Assistant session.
- Standalone Docker needs both a browser-reachable public provider address and server reachability
  for proxied operations.
- openHAB must be reachable from the browser and use the configured credentials.
- Homey OAuth requires the configured client and callback route.

## Reset only the affected connection

Use **Reset connection** or **Disconnect** for the affected provider, then reconnect. Signing out
ends the Navet session on the current device; it does not delete provider devices.

## Report safely

Include the Navet version, installation mode, provider, failing address hostname, HTTP status, and
exact visible error. Remove tokens, cookies, passwords, and signed URLs.
