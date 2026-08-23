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

Follow [Configure Home Assistant Energy sources](/guide/everyday-control/manual-energy-setup/).

## Provider availability

An unavailable Energy section on Homey or openHAB is a current provider capability difference, not
an indication that the dashboard failed to load.
