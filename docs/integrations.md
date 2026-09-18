---
title: Integrations
description: Provider setup documentation and current support status.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/integrations.md
---

Navet keeps shared dashboard behavior provider-neutral while each provider adapter owns its
connection, authentication, state mapping, and command translation.

## Available providers

- [Home Assistant](/install/home-assistant/) is the reference adapter and supports the custom panel,
  add-on, and standalone deployment routes.
- [Homey](/install/homey/) uses the standalone cloud OAuth flow. A Home Assistant add-on can also
  connect Homey as an additional provider when its Homey client options are configured.
- [openHAB](/install/openhab/) uses the base-URL and credential flow. It can also be connected as an
  additional provider from Settings in a running multi-provider installation.

Hubitat and SmartThings are planned providers. Follow the [roadmap](/roadmap/) for current direction;
do not treat planned integrations as supported installations.

## Capability Matrix

This table reflects the runtime feature registrations in the current release. Basic entity cards
still depend on the entity types a provider exposes and maps successfully.

| Capability | Home Assistant | Homey | openHAB |
|---|---:|---:|---:|
| Rooms, realtime state, lighting, switches, and sensors | Yes | Yes | Yes |
| Lock state and lock/unlock controls | Yes | Writable lock capabilities | Supported lock items |
| Cover position and movement controls | Yes | Writable position, open/close, and supported stop commands | Position and movement for supported cover items |
| Climate dashboard services | Yes | Target temperature and operating modes | Target setpoint |
| Media playback and volume controls | Yes | Writable speaker capabilities | Playback and volume for supported items |
| Media browse, search, artwork, and grouping | Yes | No | No |
| Camera snapshots and live streams | Yes | No | No |
| Energy configuration and statistics | Yes | No | No |
| Entity sensor history | Yes | Insights logs | No |
| Calendar and weather data | Yes | No | No |
| Notifications | Yes | Read and hide locally | No |
| Updates and restart actions | Yes | No | No |
| Runnable scenes, Flows, and Moods | Yes | Yes | No |
| Household presence | Yes | View everyone; edit your own | No |
| Hub favorites, device capabilities, and app browsing | No | Yes | No |
| Automation/task details and triggering | Yes | No | No |
| Assist text, microphone, and response audio | Yes | No | No |
| Provider room and entity administration | Yes | No | No |

`No` means that Navet has no provider feature-service registration for that capability today. It
does not mean the underlying platform itself lacks the feature.

### Home Assistant

Navet maps Home Assistant rooms and realtime entities for lights, switches, sensors, climate,
media players, cameras, energy, calendars, weather, notifications, updates, Assist pipelines, and
supported task or automation surfaces. Home Assistant also provides the advanced dashboard and administration
services marked **Yes** in the matrix above.

### Homey

Navet maps Homey rooms, lights, switches, fans, sensors, locks, covers, thermostats, speakers, people, and
notifications. Locks show their current state and support lock/unlock through writable capabilities.
Cover cards show available position readings and offer writable percentage or movement controls;
stop depends on the device's capabilities, and tilt is unavailable.
Thermostats support target temperature and available operating modes; speaker
controls follow writable playback, volume, mute, and track capabilities. Runnable Flows,
Advanced Flows, and Moods are available as shared scene cards. Homey's provider menu opens a
resource browser for devices, zones, Flows, Moods, people, notifications, apps, and Insights.
It supports Homey favorites, writable device capabilities, your own presence and sleep status,
and Insights history for the last 31 days. Availability depends on Homey's version and granted
permissions. Media browsing and grouping are unavailable. Dedicated camera, energy
configuration/statistics, calendar, weather,
Assist, task, alarm-panel, and room-administration services are not registered for Homey.

### openHAB

Navet maps openHAB rooms and realtime items for lights, switches, fans, climate setpoints, speaker
playback and volume, locks, covers, security sensors, batteries, and utility measurements. It does
not register history, energy-statistics, alarm-panel, media-browser, camera, calendar, weather,
notification, Assist, task, or provider-administration services.

### Planned providers

Hubitat and SmartThings have catalog metadata only. They are not available as
runtime providers yet.

## Multiple Providers

Navet can store more than one implemented provider session in runtimes that expose provider
management. In **Settings → System** you can connect or disconnect providers. Shared features use
the entities you select and route commands to each entity's owning provider. Canonical,
provider-scoped IDs keep entities from different platforms
distinct when their native IDs match.
