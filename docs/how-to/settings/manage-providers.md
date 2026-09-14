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

## Browse Homey resources

Open the connected Homey card's menu and choose **Browse and manage**. Choose a category to view
devices, zones, Flows, Moods, people, notifications, apps, your available Homeys, or Insights. You can run supported Flows
and Moods, edit writable device capabilities, update Homey favorites, and change your own
presence. Other household members are read-only. Insights offers the last 24 hours, 7 days,
or 31 days when Homey supplies history.

These choices depend on Homey's version and the permissions granted during sign-in. An unavailable
category shows an error without disconnecting your devices. See [Homey](/install/homey/) for details.

## Disconnect

Choose **Disconnect** on the provider card and confirm. This ends that provider session on the
current device or server scope. It does not delete devices from the provider.

## Availability

Home Assistant supplies Navet's broadest advanced feature set. Homey also supplies runnable Flows
and Moods, people, notifications, and Insights history. openHAB supplies rooms, live entities,
lighting, switches, and sensors. Hubitat and SmartThings are planned, not implemented runtimes.

See [A feature is unavailable](/guide/troubleshooting/unavailable-features/).
