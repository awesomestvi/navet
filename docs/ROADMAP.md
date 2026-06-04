# Product Roadmap

This is the public roadmap for Navet. It is meant to answer a simple question: what is in the app
today, and what is likely next.

## Today

Navet already ships:

- Home Assistant support across custom panel, add-on, and standalone modes
- Homey support through the standalone OAuth flow
- openHAB support through the standalone base-URL and username/password flow
- dedicated `home`, `lights`, `media`, `energy`, `climate`, `security`, `tasks`, and `settings`
  sections
- dashboard editing with card ordering, sizing, locking, visibility, and import/export
- custom widgets including RSS, photo, note, battery, UPS, energy-now, button, and map
- cards for lights, switches, fans, climate, covers, locks, cameras, media, weather, calendars,
  people, sensors, scenes, and vacuums
- PWA install support, themes, localization, and public demo/Storybook publishing

## Next Up

### Layout And Navigation

- [ ] Multiple dashboards
- [ ] Multiple views per dashboard
- [ ] Full-width panel mode
- [ ] Per-view column count
- [ ] Stack cards and more flexible section layout
- [ ] Reordering and customizing top-level navigation
- [ ] Better mobile gesture navigation

### Cards And Widgets

- [ ] History graphs
- [ ] Statistics graphs
- [ ] Conditional cards
- [ ] Entity filter cards
- [ ] Floor plan cards
- [ ] Logbook cards
- [ ] Gauge cards
- [ ] Badge rows
- [ ] Alarm panel cards
- [ ] Timer cards
- [ ] Todo and shopping list cards
- [ ] Template sensor cards

### Multi-user

- [ ] Per-user dashboards
- [ ] User profile editing

### More Providers

- [ ] Hubitat
- [ ] SmartThings

## Notes

- Home Assistant is still the most mature provider experience.
- Homey and openHAB are real supported paths, but not at the same maturity level as Home
  Assistant.
- Hubitat and SmartThings have planned provider contracts and registration entries, but full runtime
  providers are not implemented yet.
