---
title: Control climate devices
description: Adjust thermostats, HVAC modes, humidifiers, dehumidifiers, fans, and water heaters.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/climate.md
---

The Climate section collects normalized climate devices and shows controls based on each device's
reported capabilities.

![The Climate dashboard with thermostat and humidity devices.](/docs/how-to/everyday-control/climate-dashboard.webp)

## Adjust a thermostat

1. Open **Climate**.
2. Select a thermostat.
3. Adjust the target temperature.
4. Choose an HVAC mode or preset when available.
5. Close the dialog after the provider reports the updated state.

## Humidity and water devices

Humidifiers and dehumidifiers can expose a target humidity. Water heaters can expose temperature,
operation mode, or power when the provider supplies those capabilities.

![A thermostat control beside a target-humidity control.](/docs/how-to/everyday-control/climate-controls.webp)

## Fans

Supported fans can expose power, percentage, direction, oscillation, or presets. A fan with only a
power capability remains a simple control.

## If a control is absent

Navet does not manufacture provider commands. Check the provider's entity capabilities and the
[integration matrix](/integrations/). Homey and openHAB currently have narrower advanced feature
coverage than Home Assistant.
