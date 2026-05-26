# Home Assistant Integration Coverage for Navet

Navet should be tested against Home Assistant’s documented contracts, not against Navet’s current implementation. The source baseline for this strategy is:

- [Integrations index](https://www.home-assistant.io/integrations/)
- [Entity base contract](https://developers.home-assistant.io/docs/core/entity/)
- [Light entity](https://developers.home-assistant.io/docs/core/entity/light)
- [Climate entity](https://developers.home-assistant.io/docs/core/entity/climate/)
- [Media player entity](https://developers.home-assistant.io/docs/core/entity/media-player)
- [Weather entity](https://developers.home-assistant.io/docs/core/entity/weather)
- [Vacuum entity](https://developers.home-assistant.io/docs/core/entity/vacuum)
- [Camera building block](https://www.home-assistant.io/integrations/camera)
- [WebSocket API](https://developers.home-assistant.io/docs/api/websocket)
- [REST API](https://developers.home-assistant.io/docs/api/rest)
- [Authentication API](https://developers.home-assistant.io/docs/auth_api/)
- [Creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels)
- [Add-on presentation / ingress behavior](https://developers.home-assistant.io/docs/add-ons/presentation/)
- Representative integration docs: [Hue](https://www.home-assistant.io/integrations/hue/), [Shelly](https://www.home-assistant.io/integrations/shelly/), [MQTT](https://www.home-assistant.io/integrations/mqtt), [ESPHome](https://www.home-assistant.io/integrations/esphome), [Z-Wave JS](https://www.home-assistant.io/integrations/zwave_js), [Matter](https://www.home-assistant.io/integrations/matter), [UniFi Network](https://www.home-assistant.io/integrations/unifi/)

## Integration Coverage Strategy
Navet will not create one test file per Home Assistant integration. Home Assistant has thousands of integrations, and Navet mostly renders or controls them through stable entity-domain and platform contracts. One-file-per-integration coverage would be expensive, shallow, and brittle while still missing the shared behaviors users actually depend on.

Navet coverage should target:

- entity domains
- platform contracts and supported features
- REST / WebSocket / auth / session behavior
- resource URL resolution
- selected high-value integration fixtures
- known fragile areas: camera feeds, album artwork, ingress URLs, signed paths, OAuth / panel / ingress auth

The rule is simple: test the documented HA boundary first, then add integration-specific fixtures only where real-world payloads or media/action behavior materially differ.

## Coverage Matrix
| Domain / platform | Example integrations | Navet feature area | Important states | Important attributes | Important services/actions | Resource URL behavior | Test priority | Existing coverage | Missing coverage | Test files to add or update |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `light` | Hue, IKEA, Shelly, Matter | Lighting cards, dashboard add-card, button widgets | `on`, `off`, `unavailable`, `unknown` | `supported_color_modes`, `brightness`, `color_temp`, `effect_list` | `light.turn_on`, `light.turn_off`, brightness/effect payloads | Optional image URLs, grouped-light behavior | P0 | `use-light-card-controller`, `light-card`, `ha-entity-service` | Doc-backed grouped-light and malformed attribute fixtures | Update light-card tests; add `src/test/fixtures/home-assistant/entities/light.ts` |
| `switch` | Shelly, MQTT, ESPHome | Generic switch cards, widgets | `on`, `off`, `unavailable`, `unknown` | `icon`, `friendly_name` | `switch.turn_on`, `switch.turn_off`, `switch.toggle` | None beyond generic image handling | P0 | `use-switch-metric-formatters`, `ha-entity-service` | Contract fixtures for generic switches and availability transitions | Add fixture-backed switch mapping tests |
| `sensor` | MQTT, ESPHome, Z-Wave JS, energy | Sensor groups, dashboard widgets, energy | numeric states, `unknown`, `unavailable` | `device_class`, `unit_of_measurement`, `state_class` | Usually read-only; statistics fetches | Signed/person/image URL edge cases for sensor-adjacent widgets | P0 | `map-sensor-device`, energy tests, `ha-entity-utils` | Realistic malformed and mixed-unit payloads | Rewrite sensor mapper and utils tests |
| `binary_sensor` | Hue motion, Zigbee2MQTT, ESPHome | Security/presence summaries, sensor groups | `on`, `off`, `unknown`, `unavailable` | `device_class` | Read-only | None beyond generic image handling | P0 | `use-ha-devices`, sensor summaries | Doc-backed motion/door/moisture variants | Rewrite sensor mapping tests |
| `climate` | Tado, Netatmo, ESPHome | HVAC card, settings dialog | `heat`, `cool`, `heat_cool`, `off`, `unknown`, `unavailable` | `temperature`, `current_temperature`, `hvac_modes`, `hvac_action`, `fan_modes` | `climate.set_hvac_mode`, `climate.set_temperature`, fan/preset actions | None | P0 | `map-climate-device`, `use-hvac-card-controller`, `ha-entity-service` | Range targets, malformed modes, optional attributes from docs | Rewrite climate mapper/controller tests |
| `cover` | Shelly, Z-Wave JS | Cover card | `open`, `closed`, `opening`, `closing`, `unknown`, `unavailable` | `current_position`, `current_tilt_position`, `supported_features` | `cover.open_cover`, `close_cover`, `set_cover_position` | None | P0 | `cover-card`, `map-cover-device` | Tilt, partial position, malformed position values | Rewrite cover tests |
| `lock` | Z-Wave JS, SwitchBot | Security card | `locked`, `unlocked`, `jammed`, `unknown`, `unavailable` | `changed_by`, `code_format` | `lock.lock`, `lock.unlock` | None | P0 | `lock-card` | Contract fixture coverage and unavailable handling | Add fixture-backed lock tests |
| `camera` | Reolink, ONVIF, Frigate | Camera card, security dashboard | `streaming`, `recording`, `idle`, `unknown`, `unavailable` | `entity_picture`, stream capabilities, access token quirks | `camera.play_stream`, snapshot/stream requests via WS/service | Snapshot URLs, HLS URLs, ingress proxying, signed URLs | P0 | `camera-stream-player`, `camera-view-mode`, URL tests, `ha-entity-service` | Snapshot fallback, unknown/unavailable, documented signed-path and ingress cases | Add `resource-resolver.test.ts`; update camera tests |
| `media_player` | Sonos, Spotify, Plex, Jellyfin, Samsung TV, Google Cast | Media card, dialog, remote controls | `playing`, `paused`, `idle`, `off`, `buffering`, `unavailable`, `unknown` | `entity_picture`, `media_title`, `media_artist`, `source`, `source_list`, `group_members`, `supported_features` | play/pause/seek/source/select/group services | Media proxy URLs, signed artwork URLs, external artwork | P0 | `use-media-artwork-resolution`, `use-media-playback`, `media-capability-panel`, `ha-entity-service` | Signed artwork, external artwork, integration-specific media payloads | Update artwork tests and media fixtures |
| `weather` | Met.no, Netatmo | Weather card | conditions, `unknown`, `unavailable` | `temperature`, `humidity`, `wind_speed`, `forecast` | Read-only | Optional icon/image behavior | P0 | `map-weather-device`, weather card utils | Real forecast contract coverage | Rewrite weather mapper tests |
| `vacuum` | Roborock, Dreame | Vacuum card | `cleaning`, `returning`, `docked`, `paused`, `error`, `unknown`, `unavailable` | `battery_level`, `fan_speed`, `fan_speed_list`, vendor extras | start/pause/return/locate/fan controls | Map/image URLs where vendors expose them | P0 | `use-vacuum-control`, vacuum metrics | Vendor fixture variance and fallback handling | Rewrite vacuum tests |
| `person` / `device_tracker` | UniFi Network, companion app | Presence, maps, household summaries | `home`, zone names, `not_home`, `unknown`, `unavailable` | `latitude`, `longitude`, `entity_picture`, `source_type`, `battery_level` | Read-only | `entity_picture`, signed image URLs | P0 | map image URL tests, generic store/device tests | Real person/device_tracker fixtures and image contract coverage | Add fixture-backed presence tests |
| `alarm_control_panel` | Manual alarm, integrations | Security summary | `disarmed`, `armed_home`, `armed_away`, `triggered`, `unknown`, `unavailable` | `changed_by`, code flags | arm/disarm services | None | P0 | Minimal roadmap-only context | No direct contract tests | Add new mapper/rendering tests when UI exists |
| `scene` | Hue scenes, HA scenes | Button widgets, tasks/actions | activation only, sometimes `unknown` | `friendly_name` | `scene.turn_on`, Hue scene activate action | None | P0 | `button-widget`, service parser tests | Fixture-backed scene domain and Hue special action | Rewrite button widget tests |
| `script` | HA scripts | Tasks section, action buttons | `on`, `off`, `unavailable`, `unknown` | `mode`, `current`, `last_triggered` | `script.turn_on`, `script.turn_off` | None | P0 | `tasks-section`, `map-automation-tasks` | Real script fixtures and optional metadata coverage | Rewrite tasks tests |
| `automation` | HA automations | Tasks section | `on`, `off`, `unavailable`, `unknown` | `last_triggered`, `mode`, `current`, `description` | trigger, turn on/off | None | P0 | `tasks-section`, `map-automation-tasks` | Contract-driven optional metadata and state variants | Rewrite tasks tests |
| `calendar` | Google Calendar, waste collection | Calendar section | active/inactive, all-day, timed, `unknown`, `unavailable` | `message`, `all_day`, `start_time`, `end_time` | Read-only | None | P0 | `calendar-event-visibility` | Fixture-backed all-day/timed/documented event shapes | Rewrite calendar tests |
| `todo` | HA Todo | Tasks section | count/summary, `unknown`, `unavailable` | `items`, `supported_features` | item create/update/complete if surfaced | None | P0 | Limited tasks coverage | No fixture-backed todo coverage | Add todo mapping/rendering tests |
| `button` | ESPHome restart, config buttons | Widgets, tasks/actions | usually `unknown` | `device_class` | `button.press` | None | P0 | `button-widget`, service parser tests | Fixture-backed button entity behavior | Rewrite button widget tests |
| `input_boolean` | Helpers | Toggles, widgets | `on`, `off`, `unknown`, `unavailable` | `editable` | `input_boolean.turn_on`, `turn_off`, `toggle` | None | P0 | Indirect generic coverage only | Explicit helper contract tests | Add new helper-domain tests |
| `input_select` | Helpers | Select UIs | option states, `unknown`, `unavailable` | `options`, `editable` | `input_select.select_option` | None | P0 | Indirect generic coverage only | Explicit helper contract tests | Add new helper-domain tests |
| `number` | Helpers, thermostats | Number controls | numeric, `unknown`, `unavailable` | `min`, `max`, `step`, `unit_of_measurement` | `number.set_value` | None | P0 | Indirect coverage only | Explicit number contract tests | Add new helper-domain tests |
| `select` | Helpers, devices | Select controls | selected option, `unknown`, `unavailable` | `options` | `select.select_option` | None | P0 | Indirect coverage only | Explicit select contract tests | Add new helper-domain tests |
| `fan` | ESPHome, generic fans | Fan cards | `on`, `off`, `unknown`, `unavailable` | `percentage`, `percentage_step`, `preset_modes` | `fan.turn_on`, `fan.set_percentage`, `fan.set_preset_mode` | None | P1 | `fan-card`, `map-fan-device`, `use-ha-devices` | Documented percentage/preset edge cases | Rewrite fan tests |
| `humidifier` | Climate-adjacent integrations | Climate-like controls | `on`, `off`, `unknown`, `unavailable` | humidity targets, modes | turn on/off, set humidity | None | P1 | No direct coverage | No domain contract tests | Add mapper/controller tests when UI exists |
| `lawn_mower` | Smart mower integrations | Generic entity fallback unless special UI added | active states, `unknown`, `unavailable` | battery/status/vendor extras | start/pause/dock | Optional image URLs | P1 | No direct coverage | Generic fallback contract coverage | Add fallback tests |
| `siren` | Alarm integrations | Security/fallback | `on`, `off`, `unknown`, `unavailable` | tone/volume options | `siren.turn_on`, `turn_off` | None | P1 | No direct coverage | Generic fallback + service mapping | Add fallback tests |
| `update` | UniFi Network, device updates | Settings, notifications | `on`, `off`, `unknown`, `unavailable` | `installed_version`, `latest_version`, `in_progress` | `update.install`, skip/clear if surfaced | None | P1 | Energy/settings-adjacent only | Real update fixtures | Add update mapping tests |
| `event` | Assist, integration events | Generic rendering / task/event surfaces | timestamp-like states | event metadata | read-only or trigger-specific | None | P1 | No direct coverage | Generic event fallback | Add fallback tests |
| `image` | Frigate, cameras | Image widgets, event images | timestamps, `unknown`, `unavailable` | `entity_picture`, content type | read-only | signed image paths, image serve URLs | P1 | map image URL utility tests | Domain fixtures and signed image handling | Add image domain tests |
| `conversation` | Assist | Assist surfaces / generic fallback | state changes, `unknown`, `unavailable` | exposure/assistant metadata | conversation actions via REST/WS if surfaced | auth/session sensitive | P1 | No direct coverage | Generic fallback and API-boundary fixtures | Add fallback/API tests |
| `assist_satellite` | Assist hardware | Assist surfaces / fallback | availability states | pipeline/device metadata | assist actions | auth/session sensitive | P1 | No direct coverage | Generic fallback and runtime coverage | Add fallback/API tests |
| `water_heater` | Boilers, Tado | Climate card compatibility | operation states, `unknown`, `unavailable` | `temperature`, `current_temperature`, `operation_list` | set operation mode, set temperature | None | P1 | `map-climate-device`, `ha-entity-service` | Broader documented water heater fixture coverage | Rewrite climate mapper tests |
| `remote` | Samsung TV, Android TV | Media remote UI | `on`, `off`, `unknown`, `unavailable` | activities/commands | send command, turn on/off | None | P1 | TV remote command unit tests | HA remote domain contract coverage | Add remote-domain tests |
| `zone` | Core zones | Presence/map UI | count states, `unknown`, `unavailable` | lat/lon/radius/passive | Read-only | None | P1 | Map image URL and presence-adjacent logic | Explicit zone fixture coverage | Add zone tests |
| `light groups` | Hue grouped lights | Lighting cards | `on`, `off`, `unavailable`, `unknown` | grouped-light attributes | normal light services plus Hue scene interactions | optional image URLs | P1 | Light tests cover single devices only | Grouped-light fixture and service assumptions | Add grouped-light tests using Hue fixtures |
| `energy entities` | Solar/grid/utility integrations | Energy dashboard | numeric states, `unknown`, `unavailable` | energy prefs, stats ids, power sensors | statistics fetches, no direct entity actions | None | P1 | `energy-ha-service`, `use-energy-ha-data` | Fixture-backed prefs and mixed-source payloads | Add energy fixture-backed service tests |
| `generic fallback / unknown domain` | any unsupported integration | Generic dashboard rendering | any state including malformed | minimal `friendly_name`, weird attributes | no special service assumptions | external or missing image URLs | P2 | Limited generic device coverage | Unknown domain and malformed attribute fallback | Add fallback rendering tests |

## Priority Model
### P0
Must work for Navet to be trusted.

Includes:
- light
- switch
- sensor
- binary_sensor
- climate
- cover
- lock
- camera
- media_player
- weather
- vacuum
- person
- device_tracker
- alarm_control_panel
- scene
- script
- automation
- calendar
- todo
- button
- input_boolean
- input_select
- number
- select

### P1
Important but not always first-screen critical.

Includes:
- fan
- humidifier
- lawn_mower
- siren
- update
- event
- image
- conversation
- assist_satellite
- water_heater
- remote
- light groups
- zones
- energy-related entities

### P2
Support through generic entity rendering unless Navet has a special UI for it.

### Promotion Rule
Any domain with special URL, streaming, or auth behavior is promoted to at least `P1` even if its UI is generic.

## Important Real-World Integrations
| Integration | Main domains/platforms | Why it matters to Navet | Coverage class | Notes |
| --- | --- | --- | --- | --- |
| Philips Hue | light, sensor, scene, grouped lights | Common lighting setup; grouped lights and scenes affect first-screen controls. | `special fixture coverage`; `special service/action handling` | Cover grouped lights, scene activation, and sensor availability quirks. |
| IKEA Tradfri / Dirigera | light, switch, button | Common lighting payloads with vendor-specific attribute variance. | `special fixture coverage` | Use fixtures for color-temp and helper-like payload differences. |
| Shelly | switch, light, cover, sensor | Common relay and blind devices with dual-domain behavior. | `special fixture coverage` | Cover switch-vs-light relay shape and cover tilt support. |
| Zigbee2MQTT | many generic domains | Navet should mainly rely on domain contracts, but Z2M adds MQTT-style attribute variance. | `generic domain support only`; `special fixture coverage` | Cover extra attributes such as `linkquality` and battery metadata. |
| Z-Wave JS | lock, sensor, cover, climate | Common lock and infrastructure presence data. | `special fixture coverage` | Cover node-status sensors and device-class variance. |
| Matter | light, switch, sensor, climate | Increasingly common local device path. | `special fixture coverage` | Cover simple, standards-oriented payloads without vendor-specific assumptions. |
| ESPHome | sensor, button, switch, fan | Real-time state updates are common in dashboard setups. | `generic domain support only`; `special fixture coverage` | Emphasize websocket/state update coverage. |
| MQTT | switch, sensor, light, binary_sensor | Broad payload variance and discovery-driven shapes. | `special fixture coverage` | Cover sparse attributes and discovery-oriented naming. |
| UniFi Network | device_tracker, update, switch, sensor | Presence and network-health dashboards are common. | `special fixture coverage` | Cover router-based presence and update entities. |
| Reolink | camera | Common camera source with stream URLs. | `special URL/media handling` | Cover snapshot URLs, HLS URLs, ingress proxying. |
| ONVIF | camera | Common camera protocol path. | `special URL/media handling` | Cover absolute HA HLS URLs and camera proxy behavior. |
| Frigate | camera, image | Common security/event media path. | `special URL/media handling`; `special UI handling` | Cover image entities, event snapshots, and camera media surfaces. |
| Sonos | media_player | Grouping and source behavior are user-visible. | `special service/action handling` | Cover grouping/join semantics and source selection. |
| Spotify | media_player | Album artwork and metadata changes are fragile. | `special fixture coverage`; `special URL/media handling` | Cover media proxy artwork and refresh behavior. |
| Plex | media_player | Artwork and media-type variance matter. | `special fixture coverage`; `special URL/media handling` | Cover absolute artwork URLs and media type attributes. |
| Jellyfin | media_player | Similar to Plex, often with signed/absolute artwork. | `special fixture coverage`; `special URL/media handling` | Cover signed artwork URLs. |
| Samsung TV | media_player, remote | Common TV control surface. | `special service/action handling` | Cover source lists and remote commands. |
| Android TV / Google Cast | media_player, remote | Common casting control path. | `special service/action handling` | Cover app/source metadata and remote command surfaces. |
| Volvo / car integrations | device_tracker, sensor, binary_sensor | Mostly generic status tiles unless Navet adds vehicle-specific UI. | `generic domain support only` | Stay generic unless a vehicle-specific card is added. |
| Roborock | vacuum | Common advanced vacuum payloads. | `special fixture coverage`; `special UI handling` | Cover vendor-specific cleaning status and fan modes. |
| Dreame | vacuum | Similar vendor-specific vacuum extensions. | `special fixture coverage`; `special UI handling` | Cover water tank and mode/status extras. |
| SwitchBot | lock, cover, sensor | Usually generic domain support is enough. | `generic domain support only` | Only add more if a SwitchBot-specific UI appears. |
| Tado | climate, water_heater | Common thermostat path. | `special fixture coverage` | Cover thermostat presets and climate state variance. |
| Netatmo | climate, weather | Common climate/weather path. | `special fixture coverage` | Cover both thermostat and weather payloads. |
| Google Calendar | calendar | Important end-user scheduling surface. | `special fixture coverage` | Cover timed and all-day event shapes. |
| Waste collection integrations | calendar, sensor | Practical household dashboards often surface them. | `special fixture coverage` | Cover all-day calendar/task style entries. |
| Weather integrations | weather | Forecast rendering is directly user-visible. | `special fixture coverage` | Cover forecast arrays and optional fields. |
| Energy / grid / solar integrations | sensor, energy prefs, statistics | Energy dashboard trust depends on them. | `special fixture coverage`; `special UI handling` | Cover energy prefs, solar/grid stats, and live power association. |

## Test Fixture Plan
Use shared, realistic Home Assistant fixtures under:

- `src/test/fixtures/home-assistant/entities/*.ts`
- `src/test/fixtures/home-assistant/integrations/*.ts`
- `src/test/fixtures/home-assistant/api/rest.ts`
- `src/test/fixtures/home-assistant/api/websocket.ts`
- `src/test/fixtures/home-assistant/auth/*.ts`
- `src/test/fixtures/home-assistant/resources/*.ts`

Each fixture module should export:

- normal state
- unavailable state
- unknown state
- missing optional attributes
- malformed but possible attributes
- realistic Home Assistant relative URL variants where relevant
- ingress path variants where relevant
- external URL or signed-path variants where relevant

Initial fixture tree:

```text
src/test/fixtures/home-assistant/
  entities/
    light.ts
    switch.ts
    sensor.ts
    binary-sensor.ts
    climate.ts
    cover.ts
    lock.ts
    camera.ts
    media-player.ts
    weather.ts
    vacuum.ts
    person.ts
    device-tracker.ts
    alarm-control-panel.ts
    scene.ts
    script.ts
    automation.ts
    calendar.ts
    todo.ts
    button.ts
    input-boolean.ts
    input-select.ts
    number.ts
    select.ts
    fan.ts
    water-heater.ts
    zone.ts
    image.ts
    update.ts
  integrations/
    hue.ts
    ikea-dirigera.ts
    shelly.ts
    zigbee2mqtt.ts
    zwave-js.ts
    matter.ts
    esphome.ts
    mqtt.ts
    unifi-network.ts
    reolink.ts
    onvif.ts
    frigate.ts
    sonos.ts
    spotify.ts
    plex.ts
    jellyfin.ts
    samsung-tv.ts
    google-cast.ts
    roborock.ts
    dreame.ts
    switchbot.ts
    tado.ts
    netatmo.ts
    google-calendar.ts
    waste-collection.ts
    weather.ts
    energy.ts
  api/
    websocket.ts
    rest.ts
  auth/
    oauth.ts
    ingress.ts
    panel.ts
    signed-path.ts
  resources/
    urls.ts
```

Each entity fixture file exports a base entity factory plus named scenarios. Each integration fixture file exports one or more realistic entities and any associated service payloads, URLs, or WebSocket event shapes.

## Test Implementation Plan
### Phase 1
- Resource URL resolver tests in [`src/app/infrastructure/home-assistant/resources/__tests__/resource-resolver.test.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/infrastructure/home-assistant/resources/__tests__/resource-resolver.test.ts)
- URL resolution tests in [`src/app/utils/__tests__/home-assistant-url.test.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/utils/__tests__/home-assistant-url.test.ts)
- Camera image/stream tests in [`src/app/features/security/components/camera-card/__tests__/camera-stream-player.test.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/security/components/camera-card/__tests__/camera-stream-player.test.tsx)
- Media player artwork tests in [`src/app/features/media/components/media-card/__tests__/use-media-artwork-resolution.test.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/media/components/media-card/__tests__/use-media-artwork-resolution.test.tsx)
- Auth/session tests in [`src/api/__tests__/homeAssistantClient.test.ts`](/Users/vishal/Development/Github/Navet/Navet/src/api/__tests__/homeAssistantClient.test.ts), [`src/auth/__tests__/adapters.test.ts`](/Users/vishal/Development/Github/Navet/Navet/src/auth/__tests__/adapters.test.ts), and [`src/auth/__tests__/runtime.test.ts`](/Users/vishal/Development/Github/Navet/Navet/src/auth/__tests__/runtime.test.ts)

Focus:
- relative HA API/media/image URLs
- signed paths with `authSig`
- absolute HA URLs on same origin and foreign origin
- stale proxy URL stripping
- ingress-aware proxy rewriting
- panel same-origin behavior
- external URL pass-through
- unsafe URL rejection

### Phase 2
- Entity normalization tests in `use-ha-devices`, `ha-entity-utils`, and device mappers
- Domain rendering tests for climate, weather, vacuum, helpers, tasks, calendar, and generic fallback
- Service/action mapping tests in `ha-entity-service`, button widgets, and controller hooks
- State update tests from WebSocket events in `home-assistant-store` and HA-facing feature hooks

### Phase 3
- High-value integration fixtures for Hue, camera vendors, media vendors, vacuums, calendars, weather, and energy
- Regression tests for known user bugs tied to cameras, artwork, ingress, and auth
- Generic fallback rendering for unknown domains and malformed-but-plausible HA payloads
