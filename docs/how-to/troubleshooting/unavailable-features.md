---
title: A feature is unavailable
description: Distinguish provider limitations, missing services, entity capabilities, and connection errors.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/troubleshooting/unavailable-features.md
---

Navet keeps one interaction model across providers without pretending that every provider supplies
the same services.

![Provider cards showing different registered feature capabilities.](/docs/how-to/troubleshooting/provider-capabilities.webp)

## Check the capability matrix

Home Assistant currently supplies the broad advanced feature-service set, including climate,
media, camera, energy, calendar, weather, notifications, tasks, history, security, and provider
administration.

Homey also supplies supported climate, speaker, lock, cover, scene, presence, notification,
Insights, favorite, and hub-resource behavior. openHAB also supplies supported fans, climate
setpoints, speaker controls, locks, covers, security sensors, batteries, and utility measurements.
Hubitat and SmartThings remain planned.

See the current [integration capability matrix](/integrations/).

## Check the entity itself

Within a supported section, an individual control appears only when the entity reports the
required capability. For example, a light without color capability does not receive a color
picker.

## Check the selected source

Open the card or feature's editing controls and check its selected entity. The entity's provider
must be connected and support the requested capability. Review connections in
**Settings → System → Providers**.

![An unavailable alarm card with its controls disabled.](/docs/how-to/troubleshooting/unavailable-section.webp)

## Treat connection errors separately

If a normally supported feature disappeared after a connection problem, follow
[Connection or sign-in fails](/guide/troubleshooting/connection/) rather than assuming the provider
never supported it.
