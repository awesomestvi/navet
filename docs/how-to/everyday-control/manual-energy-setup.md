---
title: Configure Energy manually
description: Map required and optional sensors when Home Assistant Energy auto-detection is incomplete.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/manual-energy-setup.md
---

Use manual setup when auto-detection cannot identify the live power and cumulative energy sensors
needed for your installation.

![Energy setup showing the required quick-start sensor fields.](/docs/how-to/everyday-control/energy-manual-required.webp)

## Start with the required readings

Open **Energy → Reconfigure** and fill the quick-start fields available for your setup. Use the
entity identifiers reported by Home Assistant.

## Add optional sources

Choose **Show optional sensors** to map:

- Solar power and cumulative solar energy.
- Battery state of charge and battery power.
- Grid import and export power.
- Cumulative imported energy.
- Current whole-home load.

Follow the sign convention shown beside battery power. Reversed charging and discharging values
produce a misleading flow.

## Map individual devices

Add a power sensor for each device you want included in device-level totals and top-consumer views.
Remove mappings that no longer exist.

![Optional Energy sensors and individual device mappings.](/docs/how-to/everyday-control/energy-manual-advanced.webp)

## Save and verify

1. Choose **Save configuration**.
2. Return to **Live**.
3. Compare current home load, grid flow, solar, and battery direction with Home Assistant.
4. Check **Day** after history has accumulated.

If readings remain wrong, correct the source entity or unit in Home Assistant before compensating
for it in Navet.
