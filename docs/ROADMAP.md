---
title: Product roadmap
description: Current Navet product direction, planned Music Engine, and provider expansion.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/ROADMAP.md
---

This is the public roadmap for Navet. It answers two questions:

- what ships today
- what is likely next

## Shipping Today

Navet currently ships:

- Home Assistant support across custom panel via HACS, add-on, and standalone modes
- Homey support through the standalone OAuth flow
- openHAB support through the standalone base-URL and username/password flow
- simultaneous stored provider sessions and selected-provider aggregation in shared dashboards
- dedicated `home`, `lights`, `media`, `energy`, `climate`, `security`, `tasks`, and `settings`
  sections
- dashboard editing with card ordering, sizing, locking, visibility, import/export, undo/redo, and
  Home overview layout packs
- multiple named dashboards with shared layouts, direct links, and per-device defaults
- addable widgets for info summaries, RSS, photos, notes, battery and UPS status, live energy,
  action buttons, Home Assistant Assist, Navet AI observations, maps, and generic provider entities
- entity-card families for lights, switches, fans, climate and HVAC, humidifiers, covers, locks,
  alarm panels, cameras, media, weather, calendars, people, sensors, sensor groups, scenes, helpers,
  vacuums, and lawn mowers
- task automation details and dependency summaries for providers that expose automation services
- installation-local Navet AI observations in Docker and the Home Assistant add-on; these are
  read-only and never create or trigger provider routines
- custom sidebar extensions with embedded pages and up to five quick actions
- dashboard profile presets for standard and wall-display setups, including kiosk mode and kiosk
  navigation
- sensor history sparklines and dedicated energy charts when the connected provider exposes the
  required statistics
- PWA install support, themes, localization, and public demo and Storybook publishing

Provider capabilities are not equal: Home Assistant currently supplies the advanced climate,
media, camera, energy, calendar, weather, notification, task, Assist conversation, history,
security, and administration
services. Homey and openHAB currently supply rooms, lighting, switches, sensors, and realtime state.

## Likely Next

### Layout And Navigation

- [ ] Multiple views per dashboard
- [ ] User-configurable full-width views
- [ ] Per-view column count
- [ ] User-configurable card stacks and more flexible section layouts
- [ ] Reordering and customizing top-level navigation
- [ ] Better mobile gesture navigation

### Cards And Widgets

- [ ] Standalone configurable history graph cards
- [ ] Standalone configurable statistics graph cards
- [ ] Conditional cards
- [ ] Entity filter cards
- [ ] Floor plan cards
- [ ] Logbook cards
- [ ] Generic gauge cards
- [ ] User-configurable badge rows
- [ ] Timer cards
- [ ] Dedicated todo and shopping list cards
- [ ] Dedicated template-sensor cards
- [ ] More provider-backed automation creation targets

### Music And Media

- [ ] Navet Music Engine for provider-neutral music browsing, queue management, and playback to
  supported household speakers
- [ ] Capability-aware music-service connections and playback targets, beginning with a focused
  supported set
- [ ] Shared queue and now-playing continuity across Navet's Media dashboard and card dialogs

### Multi-user

- [ ] Per-user dashboards
- [ ] User profile editing

### More Providers

- [ ] Hubitat
- [ ] SmartThings

## Notes

- Home Assistant is still the most mature provider experience.
- Homey and openHAB are supported paths today, but not at the same maturity level as Home
  Assistant.
- Navet Music Engine is planned work and is not included in current releases. Supported music
  services and playback targets will be documented as they are confirmed.
- Hubitat and SmartThings have planned provider contracts and registration entries, but full runtime
  support is not implemented yet.
