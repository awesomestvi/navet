---
title: Control climate devices
description: Read the climate overview and adjust thermostats, humidity, fans, and water heaters.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/climate.md
---

The Climate section collects normalized climate devices, summarizes current conditions, and shows
only the controls reported by each device.

![The current Climate dashboard grouped into room controls and environmental details.](/docs/how-to/everyday-control/climate-dashboard.webp)

## Read the overview

The summary strip puts exceptions first, followed by the current temperature range, active
heating or cooling, humidity, air quality, and unavailable-device counts when those readings exist.
Room control groups come next. Environmental sensor-only cards follow under **Humidity**, **Air
Quality**, or **Pressure** instead of being mixed into the control grid.

## Adjust a thermostat

1. Open **Climate**.
2. Select a thermostat.
3. Adjust the target temperature.
4. Choose an HVAC mode or preset when available.
5. Close the dialog after the provider reports the updated state.

## Humidity and water devices

Humidifiers and dehumidifiers can expose a target humidity. Water heaters can expose temperature,
operation mode, or power when the provider supplies those capabilities.

## Fans

Supported fans can expose power, percentage, direction, oscillation, or presets. A fan with only a
power capability remains a simple control.

## If a control is absent

Navet does not manufacture provider commands. Check the provider's entity capabilities and the
[integration matrix](/integrations/). Homey and openHAB currently have narrower advanced feature
coverage than Home Assistant.
