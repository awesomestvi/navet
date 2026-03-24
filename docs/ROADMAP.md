# Navet Roadmap

Planned and in-progress features. Check off items as they ship. Add new ideas to the relevant section.

---

## Planned

### Views & Layout

- [ ] **Multiple dashboards** — support creating and switching between separate named dashboards
- [ ] **Multiple views per dashboard** — tabbed views within a single dashboard (beyond room tabs)
- [ ] **Panel mode** — full-width single-card view, useful for floor plans and map
- [ ] **Per-view column count control** — let users set column count per view instead of auto grid
- [ ] **Stack cards** — vertical and horizontal manual card composition

### Cards

- [ ] **History graph card** — entity state history over a configurable time window
- [ ] **Statistics graph card** — long-term statistics with mean/min/max bands
- [ ] **Conditional card** — show/hide a card based on entity state, template, or logged-in user
- [ ] **Entity filter card** — dynamically list entities matching a state condition (e.g. all lights that are on)
- [ ] **Floor plan card** — interactive controls overlaid on a custom image
- [ ] **Map card** — render `device_tracker` and `person` entities on a live map
- [ ] **Logbook card** — recent entity state change history feed
- [ ] **Gauge card** — radial gauge for numeric sensor entities
- [ ] **Badges** — compact row of entity states at the top of a view, no full card footprint

### Energy

- [ ] **Energy history** — per-device and per-source consumption over time with drill-down to individual appliances

### Multi-user

- [ ] **Per-user dashboard** — show different dashboards or hide cards based on logged-in user
- [ ] **User profile editing** — change display name, avatar from within Navet

### Customization

- [ ] **Time-based light/dark schedule** — switch theme automatically by time of day
- [ ] **Section reordering** — drag sidebar sections into a custom order
- [ ] **Custom navigation section creation** — user-defined top-level sidebar sections beyond the built-in ones
- [ ] **Per-section customization** — background, column count, or grouping mode per section
- [ ] **Gesture navigation** — swipe between rooms on mobile
- [ ] **Advanced accessibility settings** — font size, reduced motion, high contrast overrides
- [ ] **Widget marketplace** — community-contributed widget types beyond RSS/Photo/Note

### Integrations

- [ ] **OpenHAB backend** — connect to OpenHAB via its WebSocket API as an alternative to Home Assistant; items map to the same device types (lights, switches, climate, media); requires a `BackendService` abstraction layer and OpenHAB-specific state/command adapters for each device type

### Smart Home

- [ ] **Automations management** — view, trigger, and edit Home Assistant automations
- [ ] **Camera / video feed card** — live stream from `camera.*` entities; MJPEG streaming and recording controls
- [ ] **Light group card** — control a group of lights as one unit (brightness, color, on/off)
- [ ] **Alarm panel card** — arm, disarm, and show state of `alarm_control_panel.*` entities
- [ ] **Timer card** — start, pause, and cancel Home Assistant timers from the dashboard
- [ ] **Todo / shopping list card** — view and check off items from `todo.*` list entities
- [ ] **Template sensor card** — display the output of a Home Assistant template expression
- [ ] **Climate schedule card** — set and visualize thermostat schedules directly from the dashboard
- [ ] **Media queue card** — show upcoming tracks / queue for an active media player

---

## Shipped

- [x] **Zone-based Home screen layout** — Home view organises all devices into Overview, Quick Actions, Status, and Analytics zone bands; per-card zone overrides persist to localStorage and YAML export; `hero` card size (6×3) available for weather, calendars, photo, and RSS in the Overview zone; responsive 12-column grid via CSS custom property aligned with Tailwind breakpoints
- [x] **Custom accent color picker** — custom color input alongside 8 built-in accent presets in Settings → Appearance
- [x] **Widget settings** — RSS Feed, Quick Note, and Photo Frame widgets support post-creation configuration (feed URLs, note content, photo URLs)
- [x] **Configuration UI with setup wizard** — in-app onboarding and login screen
- [x] **Multi-language interface** — English, Swedish, German, French, Spanish with locale-aware formatting
- [x] **Room ordering** — rooms display in their natural Home Assistant area order
- [x] **Export / import dashboard config** — YAML backup and restore of layout and preferences
- [x] **PWA install** — manifest, service worker, offline shell, install prompt
- [x] **Page zoom setting** — scale the whole dashboard without browser zoom
- [x] **Entity visibility control** — add/remove entities from the dashboard per room
- [x] **Card resizing** — `extra-small` / `small` / `medium` / `large` per card type
- [x] **All view grouping modes** — custom, room, type, or flat grouping in the All view
- [x] **Search with entity id queries** — filter by domain (`light.`) or full id
- [x] **Calendar card** — calendar entities with week/month view and event details
- [x] **Weather card** — weather entities with forecast and solar data
- [x] **Person card** — `person.*` entities with profile image and presence text
- [x] **Vacuum card** — live vacuum entity state and controls
- [x] **Media player card** — playback, local mute memory, artwork, remaining time
- [x] **Media player large card** — expanded large-size card with more playback controls and metadata
- [x] **Scene management** — view and activate Home Assistant scenes from the dashboard
- [x] **Button card** — a fully customizable tap-to-call-service card for any HA service or script
- [x] **HVAC card** — unified climate entity card
- [x] **Cover card** — cover entity controls
- [x] **Lock card** — lock entity controls
- [x] **Helper and script support** — helpers and scripts via sensor/switch card paths
- [x] **Persistent notifications** — repairs, updates, and markdown-formatted messages
- [x] **RSS Feed widget** — custom card showing a live RSS feed
- [x] **Photo Frame widget** — cycling image display widget
- [x] **Quick Note widget** — freeform text note card
- [x] **Battery overview** — dashboard widget listing all low-battery devices sorted by charge level
- [x] **Presence overview** — dashboard widget showing who is home across all `person.*` entities
- [x] **Low-power mode** — reduced-effects mode for RPi-class hardware
- [x] **Deferred / batched room rendering** — offscreen rooms defer and visible rooms hydrate in batches
- [x] **OS appearance auto-follow** — optional "Follow system appearance" mode switches between light and dark using `prefers-color-scheme`
- [x] **Energy dashboard** — dedicated energy section with live stats, solar/battery/grid flow diagram, trend charts, storage gauges, top consumers, cost projection, heating breakdown, smart insights, and node drill-down; backed by custom zero-bundle SVG chart primitives (bar chart, area chart, semi-circle gauge, segmented quality bar, Catmull-Rom sparkline)
- [x] **Energy live HA wiring** — setup panel with auto-detect from HA `energy/get_prefs`, per-device power sensor mapping, datalist autocomplete; live entity state reading via `useEnergyHaData`; today's kWh via `recorder/statistics_during_period` polled every 5 min; conditional display hides unconfigured solar/battery gauges; bathroom/toilet and device-level energy breakdowns
- [x] **Camera card** — snapshot display for `camera.*` entities via HA camera proxy; manual refresh; unavailable placeholder; dark card with name/room overlay
- [x] **Section resize actions** — −/+ buttons resize by rendered-column units at the current breakpoint; the row neighbor compensates automatically and stacked descendant sections in the same column update together; controls appear only when two or more sections share the same row
- [x] **Media player grouping controls** — media cards support attaching and detaching compatible players in a speaker group directly from the dialog (`join` / `unjoin`)
- [x] **Home section creation (sectioned layout)** — Home Dashboard Builder supports adding, renaming, and removing user-defined sections in `sectioned` mode
