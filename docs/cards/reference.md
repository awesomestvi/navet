---
title: Card and configuration reference
description: Supported Navet Cards types, entity selections, and common configuration fields.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/reference.md
---

Choose a card in Home Assistant's **Add card** picker and select its entity or content.
For YAML, use the full custom type below. Replace sample entity IDs with entities in your installation.
Controls depend on the selected entity's capabilities.

## Card types

| Card type | Supported selection | Controls |
| --- | --- | --- |
| `custom:navet-light-card` | `light.*` | On/off, brightness presets, and color temperature when supported |
| `custom:navet-switch-card` | `switch.*`, `input_boolean.*` | On/off |
| `custom:navet-sensor-card` | `sensor.*`, `binary_sensor.*` | Value, unit, optional attribute |
| `custom:navet-room-card` | HA area ID or explicit entities | Room status, lazy direct controls, and entity details |
| `custom:navet-media-card` | `media_player.*` | Playback, volume, skip, mute, and source selection when supported |
| `custom:navet-climate-card` | `climate.*` | Current temperature, target temperature orb, steps, and heating mode when supported |
| `custom:navet-cover-card` | `cover.*` | Open/stop/close and position when supported |
| `custom:navet-number-card` | `number.*`, `input_number.*` | Value slider with native limits, step and unit |
| `custom:navet-select-card` | `select.*`, `input_select.*` | Advertised options |
| `custom:navet-navigation-card` | Local paths or room hashes | Named navigation buttons |
| `custom:navet-fan-card` | `fan.*` | Supported on/off and speed percentage with presets |
| `custom:navet-lock-card` | `lock.*` | State and slide to lock/unlock; code-protected locks use entity details |
| `custom:navet-vacuum-card` | `vacuum.*` | Supported start, pause and return to dock; battery when provided |
| `custom:navet-person-card` | `person.*`, `device_tracker.*` | Presence and entity picture |
| `custom:navet-weather-card` | `weather.*` | Condition, prominent temperature, feels-like reading and daily forecast when supplied |
| `custom:navet-scene-card` | `scene.*` | Run scene |
| `custom:navet-script-card` | `script.*` | Run script |
| `custom:navet-entity-card` | Any entity | State, unit, supported toggle, and entity details |
| `custom:navet-info-card` | `entities` list of sensors | Live grouped readings and entity details |
| `custom:navet-battery-card` | `entities` list of sensors | Battery readings, percentage bars and low-battery highlighting |
| `custom:navet-ups-card` | `entities` list of sensors | Selected UPS status and metrics |
| `custom:navet-energy-now-card` | `entities` list of sensors | Power/energy readings and a 24-hour power history chart |
| `custom:navet-media-stack-card` | `entities` list of media players | Selected-player speaker controls and entity details |
| `custom:navet-note-card` | `input_text.*`, `text.*`, or `content` | Save notes to a text helper or display configured text |
| `custom:navet-photo-card` | `image.*` or `image` URL | Single photo or gallery with an image description |
| `custom:navet-button-card` | Button, scene, script, or `tap_action` | Run an entity action, service, or local navigation |

## Common fields

| Field | Meaning | Default |
| --- | --- | --- |
| `entity` | Supported Home Assistant entity ID | Required on entity cards |
| `name` | Card title | Entity friendly name or area name |
| `icon` | Icon such as `mdi:lightbulb-outline` | A relevant icon for the card |
| `size` | `small` or `extra-small` | Switch footprint; defaults to `small` |
| `layout` | `compact`, `comfortable`, or `row` | `compact` |
| `show_state` | Show state or sensor value | `true` |
| `show_brightness` | Show supported brightness control | `true` on light cards |
| `appearance.accent` | Six-digit hex color | Theme variable, Navet orange, or the card family accent |
| `appearance.radius` | Corner radius, 0–48 pixels | 24 pixels |
| `appearance.preset` | `warm`, `neutral`, or `cool`; accent can override it | `warm` |
| `appearance.effects` | `low` uses opaque glass and simpler decoration; `high` enables glass blur | `low` |
| `panel_id` | Unique room hash such as `#kitchen` | Optional on room cards |
| `sub_controls` | Up to eight entity controls | Empty |
| `appearance.theme` | `auto`, `light`, `dark`, `black`, or `glass` | `auto` follows HA theme |
| `grid_options` | Home Assistant Sections placement | Card-specific sizing |

`appearance.theme` accepts `auto`, `light`, `dark`, `black`, or `glass`.
Entity cards generally need `entity`; rooms use `area` or `entities`; navigation uses `links`.
Grouped cards accept 1–24 supported IDs in `entities`.

## Group readings

```yaml
type: custom:navet-info-card
name: Kitchen readings
entities:
  - sensor.kitchen_temperature
  - sensor.kitchen_humidity
```

For Energy Now, put the power sensor first and the daily energy sensor second.
The chart reads the first sensor's previous 24 hours from Home Assistant history.
For UPS, choose your status, battery, load, and runtime sensors explicitly.
Media Stack selects one player from its configured media-player list.

## Notes and photos

Use a Home Assistant Text helper for an editable note:

```yaml
type: custom:navet-note-card
entity: input_text.kitchen_note
```

Select the note text to open its editor. Save follows the helper's native length limits;
Escape closes without saving. A failed save preserves your draft. Password helpers open
through entity details. For display-only text, use `content` without an entity.

```yaml
type: custom:navet-photo-card
name: Mountains
image: /local/mountains.jpg
alt: Mountain lake at sunrise
```

For a gallery, use `images` with 1–24 local paths or HTTP(S) URLs. Use `alt` for an image
description. An `image.*` entity can supply its entity picture. External servers must allow
your browser to load their images.

See [room configuration](/cards/rooms/), [appearance](/cards/appearance/), and
[actions and sub-controls](/cards/actions/) for additional examples.
