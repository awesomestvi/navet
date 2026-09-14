# Everyday provider lab coverage

The lab covers common household controls, measurements, and alerts supported by Navet's current
Homey and openHAB adapters. These are virtual fixtures, not evidence of compatibility with a
particular hardware brand. Initial warning states are intentional and describe demo data.

## Research basis

Homey's [sensor guide](https://homey.app/en-us/wiki/how-smart-sensors-make-home-automation-work/)
describes everyday uses for contact, motion, occupancy, safety, air-quality, soil, weather,
and utility sensors. Its [device category guide](https://homey.app/en-ca/best-buy-guide/)
also includes appliances, radiator valves, window coverings, and irrigation.
These sources establish useful use cases, not a statistical ranking of device popularity.

Capability names, data types, and enum values are checked against the pinned Homey CLI's
Homey SDK definitions and the [Homey capability documentation](https://apps.developer.homey.app/the-basics/devices/capabilities).
openHAB uses its documented [Item types](https://www.openhab.org/docs/concepts/items.html).
Navet's current mapper and device-profile implementations determine what each fixture exposes.

## Added everyday examples

| Example | Homey fixture | openHAB coverage | Useful initial check |
| --- | --- | --- | --- |
| Window contact | Bedroom window | Window Contact and battery Number | Open window, 15% battery |
| Motion sensor | Hallway motion sensor | Existing hallway motion item | Homey motion active in low light |
| Room occupancy | Office presence sensor | Office occupancy Contact | Occupied room, separate from account presence |
| Smoke and CO detector | Hallway smoke and CO alarm | Smoke and CO Contacts plus battery Number | Clear alarms with low battery |
| Air-quality monitor | Office air quality | CO₂, PM2.5, and TVOC Numbers | Elevated readings with units |
| Bathroom environment | Bathroom temperature and humidity | Temperature and humidity Numbers | 78% humidity |
| Radiator valve | Bedroom radiator valve | Target and current temperature Numbers | Homey mode and half-degree setpoint control |
| Appliance energy plug | Washing machine plug | Plug Switch, power and energy Numbers | Powered appliance drawing 485 W |
| Freezer monitoring | Freezer temperature alarm | Temperature Number and alarm Contact | Negative temperature with active warning |
| Plant monitoring | Garden soil sensor | Soil moisture Number | Dry soil at 18% |
| Garden watering | Garden irrigation valve | Irrigation Switch | Disabled watering |
| Main water shutoff | Main water shutoff valve | Water valve Switch | Open valve; On means open |
| Household meters | Household utility meters | Power, energy, water, and gas Numbers | Cumulative meters and live readings |
| Outdoor conditions | Garden weather station | Wind, pressure, rain, existing illuminance | Different units and large lux value |
| Movement-capable cover | Living room curtains | Additional Rollershutter | Homey open/close/stop and synchronized position |
| Speaker metadata and tracks | Kitchen speaker | Existing basic speaker items | Homey playing track with next/previous and shuffle |

Existing fixtures retain dimmable and RGB lights, fan, coffee-maker plug, thermostat,
multisensor, leak alarm, lock, position-only blind, and basic speaker. Flows, moods,
favorites, notifications, account profile, and installation browsing are described in
the [permission checklist](README.md#homey-permission-coverage).

## Remaining coverage gaps

| Category | What is needed before a meaningful lab fixture |
| --- | --- |
| Cameras and video doorbells | Homey has no registered Navet camera service; use a real test stream with an adapter that supports camera resources. |
| Robot vacuums and mowers | A normalized robot state and commands beyond generic power control. |
| Remotes, buttons, and doorbell presses | Momentary events and Flow triggers; a persistent on/off fixture does not exercise those events. |
| EV charging, solar, and battery management | Basic power readings are covered, but charging schedules, battery control, and energy flow contracts require dedicated support. |
| Full openHAB climate and media | Current Navet openHAB support exposes the basic items, not dedicated thermostat or speaker services. |
| Multiple people's presence | A second real Homey test account; room occupancy cannot substitute for account identity. |

The audit deliberately leaves these gaps visible instead of claiming full support from a
generic switch or sensor. Existing stored device states, account presence, and non-lab resources
are preserved by normal installation. Only the dedicated climate fixture changes automatically
for Insights sampling.
