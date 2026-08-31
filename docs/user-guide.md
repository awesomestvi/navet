---
title: Using Navet
description: Learn the dashboard model and find user-facing references.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/user-guide.md
---

Navet organizes smart-home state around the rooms, devices, and entities supplied by your active
provider. The first screen is designed for glanceable state and common household controls.

## Dashboard basics

- Use rooms to keep controls close to the physical spaces they affect.
- Use widgets for focused status or control surfaces.
- Keep common actions visible and move less frequent information into supporting views.
- Treat provider data as the source of truth when a device or room is missing.

## Main Sections

- **Home** is the editable room-first overview. It supports custom sections and columns, layout
  packs, manual entity cards, drag ordering, sizing, locking, hiding, and undo/redo while editing.
- **Lights** leads with whole-home status, quick scenes, expand/collapse and whole-home power
  actions, then orders room groups by unavailable, active, and inactive state. Expand a room for
  individual brightness and power controls.
- **Media** promotes the large now-playing session while media is active and promotes browsing
  while idle. It also supports provider browsing and search, speaker destinations, grouping,
  playback, volume, and TV controls when the provider exposes them.
- **Energy** combines configurable KPI summaries with detailed usage history by device, room, or
  source. Day, week, month, year, and custom ranges depend on provider history/statistics support;
  live flow, tracked and untracked load, and source diagnostics remain available when reported.
- **Climate** summarizes current conditions, then groups controllable thermostats, HVAC devices,
  fans, humidifiers, dehumidifiers, and water heaters by room. Environmental sensor details such
  as air quality and pressure follow in their own sections.
- **Security** combines a camera-first command center with actionable alerts, alarm controls,
  provider-backed activity history, a customizable overview, and grouped security entity cards.
- **Household** puts native chores into an attention-first Today list, keeps completed cards visible,
  exposes optional missions and rewards from House pulse, manages recurring work and people in
  dedicated views, and preserves provider automations and scripts under Routines.
- **Navet AI** shows installation-local, evidence-backed observations for supported lighting,
  switch, and energy patterns in standalone Docker and the Home Assistant add-on. It never acts
  automatically or creates routines and automations; explicit on/off commands submitted in its
  Assist chat are routed through the connected provider.
- **Settings** controls appearance, dashboard profiles, kiosk behavior, interactions, providers,
  extensions, import/export, and project information.

## Editing And Profiles

Home editing supports layout packs such as command center, security monitor, and energy wall, or a
custom section/column arrangement. Dashboard configuration can be exported and imported. The
`standard` and `wall_display` profile presets adjust spacing, title behavior, keep-awake, kiosk,
and Home-summary settings; scoped settings can remain device-specific instead of overwriting the
shared profile.

Kiosk mode hides normal dashboard chrome and keeps section, room, settings, and customization
access in the orbit menu. In Home Assistant-hosted modes, hiding Home Assistant's own header and
sidebar additionally uses the optional shell module described in the
[Home Assistant guide](/install/home-assistant/).

## Providers And Availability

Navet can keep multiple implemented provider sessions and combine selected providers in its
normalized entity collections. Provider-scoped IDs prevent collisions between platforms. Advanced
sections degrade when their required provider feature service is unavailable; consult the
[capability matrix](/integrations/) instead of assuming every connected platform supplies media,
camera, energy, calendar, weather, notification, or task services.

## Appearance, Extensions, And Device Support

Navet includes Liquid Glass (`glass`), `dark`, `light`, and `black` theme families, eight built-in
accent colors plus a custom accent, built-in and uploaded wallpapers, optional reduced motion, and
adaptive effects that reduce expensive rendering on weaker hardware. The interface ships with
Danish, Dutch, English, Finnish, French, German, Italian, Norwegian, Polish, Portuguese, Spanish,
Swedish, and Chinese message catalogs.

With visual quality set to **Auto**, ARM Linux browsers such as Raspberry Pi OS start in the
low-cost rendering tier. Navet removes animated transitions, backdrop and filter effects, large
shadows, ambient layers, and other compositor-heavy decoration while keeping controls and
information intact. The setting is device-owned, so a wall panel can stay on **Low** without
reducing visual quality on another signed-in phone or computer.

Custom sidebar extensions can open links in an embedded Navet page and attach up to five quick
actions. Provider notifications and available update/restart actions appear in the app's
notification surface when the active provider registers those services. Navet is installable as a
PWA and offers keep-awake and wall-display settings for tablet and kiosk use.

## Widget reference

The [widget guide](/guide/widgets/) documents the available widget types, supported sizes, and
placement limits.

## Household chores

The [Household chores guide](/guide/chores/) explains availability, profiles, assignments,
one-time through tri-weekly schedules, ID-based card colours and edit-time overrides, optional
motivation, Home and room summaries, shared history, backups, and the Home Assistant projection
boundary. Use the task-oriented guides to
[set up and complete chores](/guide/everyday-control/household-chores/) or
[manage and recover the workspace](/guide/everyday-control/manage-household-chores/).

## Step-by-step help

Use the [how-to guides](/guide/how-to/) for complete tasks such as creating another dashboard,
organizing rooms, setting up kiosk mode, assigning dashboards to devices, and recovering a
synchronization or connection problem.

## Provider-specific behavior

Connection and deployment behavior varies by provider. Use the
[integration guide](/integrations/) to reach the matching setup documentation.
