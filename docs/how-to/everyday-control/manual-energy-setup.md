---
title: Configure Home Assistant Energy sources
description: Configure required and optional sensors in Home Assistant when Energy discovery is incomplete.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/manual-energy-setup.md
---

Use Home Assistant's Energy configuration when Navet cannot discover the live power and cumulative
energy sensors needed for your installation.

## Start with the required readings

Open Home Assistant's **Settings → Dashboards → Energy** and configure the sources available for
your setup. Use sensors with the device class, state class, and units expected by Home Assistant.

## Add optional sources

Add optional sources in Home Assistant for:

- Solar power and cumulative solar energy.
- Battery state of charge and battery power.
- Grid import and export power.
- Cumulative imported energy.
- Current whole-home load.

Follow the sign convention shown beside battery power. Reversed charging and discharging values
produce a misleading flow.

## Map individual devices

Add individual device energy sensors in Home Assistant for each device you want included in
device-level totals and top-consumer views. Remove mappings that no longer exist.

## Save and verify

1. Save the Energy configuration in Home Assistant.
2. Return to Navet and open **Energy → Live**.
3. Compare current home load, grid flow, solar, and battery direction with Home Assistant.
4. Check **Day** after history has accumulated.

If readings remain wrong, correct the source entity or unit in Home Assistant before compensating
for it in Navet.
