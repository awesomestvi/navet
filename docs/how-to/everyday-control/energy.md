---
title: Understand Energy usage and KPIs
description: Read KPI summaries and detailed usage history by device, room, or source.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/energy.md
---

Energy requires compatible energy and history services. Home Assistant is currently the reference
provider for the complete dashboard.

## Make sources available

Configure the Energy sources in Home Assistant first, then open **Energy** in Navet. Navet reads
the configured sources and their live or historical statistics. If no compatible configuration is
available, Energy shows a setup state instead of an empty chart.

## Read the dashboard

- The KPI strip summarizes live energy, grid import, solar production, battery, and cost when those
  readings are available.
- **Day**, **Week**, **Month**, **Year**, and **Custom** set the history range.
- **Devices**, **Rooms**, and **Sources** change how usage is grouped.
- **Live** and the period comparison show current demand beside accumulated energy.
- Selecting a chart period opens its energy-used total and highest consumer details.
- **Untracked** represents load that is not assigned to a tracked device.
- Source and sensor warnings remain visible when provider data is incomplete.

![The current Energy dashboard with KPI strip, detailed usage chart, range controls, and device grouping.](/docs/how-to/everyday-control/energy-dashboard.webp)

## Customize Energy

Choose **Customize** while Energy is open to apply the **Essentials** or **Balanced** overview
layout. Open **KPIs** to keep automatic metric selection or manually choose and order the four
metrics shown above Energy usage. These choices change Navet's presentation; they do not change
the provider's source configuration.

## Manage source selection

Source selection originates in Home Assistant Energy. Change it there when a source is missing,
duplicated, or mapped to the wrong sensor, then reopen Energy in Navet.

## If source discovery is incomplete

Configure Home Assistant's Energy sources as described below.

## Configure Home Assistant Energy sources

Open Home Assistant's **Settings → Dashboards → Energy** and configure the sources available for
your setup. Use sensors with the device class, state class, and units expected by Home Assistant.

Add the applicable solar power and cumulative energy, battery state of charge and power, grid
import and export, cumulative imported energy, and current whole-home load sources. Follow the
battery sign convention shown by Home Assistant; reversed charging and discharging values produce
a misleading flow.

Add individual-device energy sensors for devices that should appear in Navet's device totals and
top-consumer views, and remove mappings for entities that no longer exist.

After saving:

1. Return to Navet and open **Energy → Live**.
2. Compare home load, grid flow, solar, and battery direction with Home Assistant.
3. Check **Day** after history has accumulated.

Correct a wrong source entity or unit in Home Assistant instead of compensating for it in Navet.

## Provider availability

An unavailable Energy section on Homey or openHAB is a current provider capability difference, not
an indication that the dashboard failed to load.
