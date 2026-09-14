---
title: Connect and manage providers
description: Connect smart-home providers and choose the sources used by your dashboard.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/settings/manage-providers.md
---

Standalone Navet connects to multiple smart-home providers and combines their supported devices
and features. Choose sources in the relevant card or feature settings. Each selected entity keeps
its provider identity, so controls and data requests reach the correct smart-home platform.

![System settings showing connected and available providers.](/docs/how-to/settings/provider-management.webp)

## Connect a provider

1. Open **Settings → System → Providers**.
2. Expand provider management when it is collapsed.
3. Choose **Connect**.
4. Complete the provider-specific flow:
   - Home Assistant uses the supported sign-in flow for the current deployment.
   - Homey uses its OAuth connection.
   - openHAB uses a reachable base URL and credentials.

Do not paste a long-lived Home Assistant token into a manual token field; Navet does not use that
as its connection model.

## Choose sources

Use the card or feature's editing controls to choose from available sources. Weather cards can use
any weather entity exposed by a connected provider. Calendars combine selected sources, and the
Energy metric picker includes energy-related sensors from connected providers.

Available choices depend on each adapter's capabilities. Home Assistant currently supplies weather
forecasts, calendar events, and the detailed energy history dashboard. Homey and openHAB supply
supported devices and sensors; connecting them does not add forecast, calendar, or statistics APIs.

## Disconnect

On your primary device, open **Settings → System → Providers**, open the provider's menu, and
choose **Disconnect**. The confirmation names the provider and explains that it disconnects
across connected devices. Choose **Cancel** to keep the connection, or **Disconnect** to proceed.
You can connect the provider again later. Disconnecting does not delete devices from the provider.

## Availability

Home Assistant supplies Navet's broadest advanced feature set. Homey also supplies runnable Flows
and Moods, people, notifications, and Insights history. openHAB supplies rooms, live entities,
lighting, switches, and sensors. Hubitat and SmartThings are planned, not implemented runtimes.

See [A feature is unavailable](/guide/troubleshooting/unavailable-features/).
