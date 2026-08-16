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
| Climate dashboard services | Yes | No | No |
| Media controls, browse, search, artwork, and grouping | Yes | No | No |
| Camera snapshots and live streams | Yes | No | No |
| Energy configuration, live energy, and history/statistics | Yes | No | No |
| Calendar and weather data | Yes | No | No |
| Persistent notifications, updates, and restart actions | Yes | No | No |
| Automation/task details and habit-created automations | Yes | No | No |
| Provider room and entity administration | Yes | No | No |

`No` means that Navet has no provider feature-service registration for that capability today. It
does not mean the underlying platform itself lacks the feature.

### Home Assistant

Navet maps Home Assistant rooms and realtime entities for lights, switches, sensors, climate,
media players, cameras, energy, calendars, weather, notifications, updates, and supported task or
automation surfaces. Home Assistant also provides the advanced dashboard and administration
services marked **Yes** in the matrix above.

### Homey

Navet currently maps Homey rooms and realtime entities for lights, switches, and sensors. Climate,
media, cameras, energy, calendars, weather, notifications, and provider administration are not yet
registered as Homey feature services in Navet.

### openHAB

Navet currently maps openHAB rooms and realtime items for lights, switches, and sensors. Climate,
media, cameras, energy, calendars, weather, notifications, and provider administration are not yet
registered as openHAB feature services in Navet.

### Planned providers

Hubitat and SmartThings have package and registration surfaces only. They are not available as
runtime providers yet.

## Multiple Providers

Navet can store more than one implemented provider session in runtimes that expose provider
management. In **Settings -> System** you can connect or disconnect providers, choose the active
provider for provider-specific operations, and include connected providers in the normalized
dashboard collection. Canonical, provider-scoped IDs keep entities from different platforms
distinct when their native IDs match.
