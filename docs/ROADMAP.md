---
title: Product roadmap
description: Current Navet product direction and planned provider expansion.
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
- addable widgets for info summaries, RSS, photos, notes, battery and UPS status, live energy,
  action buttons, maps, and generic provider entities
- entity-card families for lights, switches, fans, climate and HVAC, humidifiers, covers, locks,
  alarm panels, cameras, media, weather, calendars, people, sensors, sensor groups, scenes, helpers,
  vacuums, and lawn mowers
- task automation details, dependency summaries, and habit-suggested routine creation for providers
  that expose the automation creation capability
- custom sidebar extensions with embedded pages and up to five quick actions
- dashboard profile presets for standard and wall-display setups, including kiosk mode and kiosk
  navigation
- sensor history sparklines and dedicated energy charts when the connected provider exposes the
  required statistics
- PWA install support, themes, localization, and public demo and Storybook publishing

Provider capabilities are not equal: Home Assistant currently supplies the advanced climate,
media, camera, energy, calendar, weather, notification, task, history, security, and administration
services. Homey and openHAB currently supply rooms, lighting, switches, sensors, and realtime state.

## Likely Next

### Layout And Navigation

- [ ] Multiple dashboards
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
- Hubitat and SmartThings have planned provider contracts and registration entries, but full runtime
  support is not implemented yet.
