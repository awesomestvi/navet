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
- A LAN, VPN, Tailscale, or external Home Assistant authorization route that is unavailable from
  the current browser during sign-in.
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

## Sign in at home or through a VPN

Standalone Navet keeps the browser-facing Home Assistant address separate from its trusted
upstream. This lets the same installation open Home Assistant through a LAN address at home and a
VPN, Tailscale, or external address while away.

1. From the device that is signing in, confirm that you can open Home Assistant directly at the
   address you plan to use.
2. Enter that same address in Navet.
3. Choose **Continue** and finish the Home Assistant sign-in.

The address must lead to the same Home Assistant installation. Navet opens the authorization page
through the browser address, then verifies the returned OAuth code against its already trusted
upstream. Once sign-in finishes, Navet also proxies access-token renewal, WebSocket traffic, API
calls, and provider-managed Home Assistant HTTP resources. The browser does not need a continuing
route to the trusted LAN address.

### Read the Home Assistant return error

- **Navet could not reach Home Assistant to finish sign-in** means the browser completed the Home
  Assistant step, but the Navet server could not redeem the response against its trusted upstream.
  This message also covers an HTTP error returned by the token endpoint; it does not prove the
  server is unreachable. Check the route from the Navet host or container and confirm that the
  entered address and saved upstream lead to the same Home Assistant installation. A successful
  login against a different installation cannot authorize the saved upstream.
- **Home Assistant returned an invalid sign-in response** means the OAuth response cannot be
  reused. Return to login and start a fresh sign-in instead of retrying the old browser return.

- If the authorization page does not open, troubleshoot the browser's LAN, VPN, DNS, or external
  route.
- If Home Assistant accepts the sign-in but returning to Navet fails, verify that the Navet
  container can reach and trust its configured or previously enrolled upstream.
- If Navet says operator pairing is required, the installation does not currently have a trusted
  Home Assistant upstream. On an existing installation, first verify that its original
  `navet-data` volume is mounted. On a fresh or reset installation, complete the one-time pairing
  described in [Home Assistant setup](/install/home-assistant/#standalone-docker).

### Change an unreachable trusted upstream

Use this only when the saved server route has permanently changed, for example when Navet moved
from a LAN-only address to a Tailscale address for the same Home Assistant installation.

1. Confirm the replacement address returns the same Home Assistant installation and is reachable
   from the Navet host or container.
2. Recover the existing installation key. Replace `navet` if your container has another name:

   ```bash
   docker exec navet cat /data/navet-installation-key
   ```

3. Append `#navet_pairing=<key>` to the trusted Navet URL and load that complete URL once. If you
   only change the fragment in an already open Navet tab, reload the page so Navet can consume it.
4. Continue in that same tab, choose **Home Assistant**, enter the replacement address, and finish
   sign-in. Navet removes the key from the address immediately and updates the trusted upstream
   only after Home Assistant accepts the sign-in.

Keep the installation key private. If `NAVET_HASS_URL` pins the upstream in Compose, update that
setting and recreate the container instead; pairing cannot override a configured pin.

**Restart onboarding** in Dashboard settings only reopens dashboard setup. It does not clear the
trusted upstream or repair this connection mismatch. Local development also retains installation
and sign-in state in its working directory's `.cache`; starting on another port alone does not
create a fresh installation.

## Stuck on Starting your dashboard

An existing standalone session should renew through Navet even when the browser cannot reach Home
Assistant's LAN address.

1. Reload Navet once to activate the current application version.
2. Confirm that the VPN route to Navet is still active.
3. Confirm from the Docker host that the Navet container can reach its trusted Home Assistant
   upstream.
4. If a recovery action appears, choose **Retry connection** for a temporary outage. Choose
   **Back to login** when the saved Home Assistant session cannot be restored and you need to sign
   in again.

## Deployment-specific checks

- Home Assistant Ingress should reuse the parent Home Assistant session.
- Standalone Docker needs a browser-reachable Home Assistant address while authorization is open
  and a trusted upstream reachable from the Navet container. They may be different routes to the
  same Home Assistant installation; routine dashboard use and token renewal use the latter through
  Navet's same-origin proxy.
- openHAB must be reachable from the browser and use the configured credentials.
- Homey OAuth requires the configured client and callback route.

## Reset only the affected connection

Use **Reset connection** or **Disconnect** for the affected provider, then reconnect. Signing out
ends the Navet session on the current device; it does not delete provider devices.

## Report safely

Include the Navet version, installation mode, provider, failing address hostname, HTTP status, and
exact visible error. Remove tokens, cookies, passwords, and signed URLs.
