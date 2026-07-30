---
title: Set up and understand the Energy dashboard
description: Detect Home Assistant Energy sources and read flow, ranges, trends, and top consumers.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/energy.md
---

Energy requires compatible energy and history services. Home Assistant is currently the reference
provider for the complete setup flow.

![The Energy setup panel offering Home Assistant auto-detection.](/docs/how-to/everyday-control/energy-auto-detect.webp)

## Auto-detect sources

1. Open **Energy**.
2. Choose **Connect to HA Energy** or **Reconfigure**.
3. Choose **Auto-detect**.
4. Review the detected sources and sensors.
5. Save the configuration.

## Read the dashboard

- **Live** shows current flow and demand.
- **Day**, **Week**, and **Month** change the comparison range.
- **Energy flow** shows supply, storage, home load, import, and export when available.
- **Top consumers** ranks device-level usage.
- **Untracked** represents load that is not assigned to a tracked device.
- **Insights and anomalies** explain conditions that deserve attention.

![The Energy dashboard with live flow, range controls, and top consumers.](/docs/how-to/everyday-control/energy-dashboard.webp)

## Manage source selection

Source selection originates in Home Assistant Energy. Use **Manage source selection in Home
Assistant Energy** when the upstream configuration is wrong.

## If auto-detection is incomplete

Follow [Configure Energy manually](/guide/everyday-control/manual-energy-setup/).

## Provider availability

An unavailable Energy section on Homey or openHAB is a current provider capability difference, not
an indication that the dashboard failed to load.
