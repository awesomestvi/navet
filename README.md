# Navet

A smart-home dashboard frontend for wall panels, tablets, phones, and desktop screens.

![Navet dashboard demo on iPad frame](assets/reference/marketing/use-cases/navet-ipad-frame-dashboard.jpg)

[Live demo](https://navet.app/demo/) ·
[Storybook](https://navet.app/storybook/) ·
[Docs](docs/README.md) ·
[Security policy](SECURITY.md) ·
[Code of conduct](CODE_OF_CONDUCT.md)

## What Navet Is

Navet turns supported smart-home platforms into a room-first control surface with dedicated
`home`, `lights`, `media`, `energy`, `climate`, `security`, `tasks`, and `settings` sections.

It is built for people who want a cleaner daily control surface than the default admin-first smart
home UI.

## What You Get

- room-first dashboards for everyday household control
- dedicated views for lights, media, energy, climate, security, tasks, and settings
- cards for common smart-home device types such as lights, climate, cameras, locks, media players,
  weather, sensors, scenes, calendars, and vacuums
- built-in widgets such as RSS, photo, note, battery, UPS, energy-now, button, and map
- support for wall panels, tablets, phones, and desktop browsers
- PWA install support, themes, and localization

## Supported Today

|  | Provider | Status | Runtime modes |
|---|---|---|---|
| <img src="packages/app/src/assets/providers/home-assistant.svg" alt="Home Assistant" width="50"> | Home Assistant | implemented | custom panel via HACS, add-on, standalone |
| <img src="packages/app/src/assets/providers/homey.png" alt="Homey" width="50"> | Homey | implemented | standalone |
| <img src="packages/app/src/assets/providers/openhab.svg" alt="openHAB" width="50"> | openHAB | implemented | standalone |
| <img src="packages/app/src/assets/providers/hubitat.svg" alt="Hubitat" width="50"> | Hubitat | planned | contract + registration entry only |
| <img src="packages/app/src/assets/providers/smartthings-icon.svg" alt="SmartThings" width="50"> | SmartThings | planned | contract + registration entry only |

## Choose Your Setup

Most people should start with one of these guides:

- Home Assistant users: start with [docs/HOME_ASSISTANT.md](docs/HOME_ASSISTANT.md)
- Homey users: start with [docs/HOMEY.md](docs/HOMEY.md)
- openHAB users: start with [docs/OPENHAB.md](docs/OPENHAB.md)

## Need More Details?

Use these docs if you want more context:

- [Home Assistant setup](docs/HOME_ASSISTANT.md)
- [Homey setup](docs/HOMEY.md)
- [openHAB setup](docs/OPENHAB.md)
- [Widgets guide](docs/WIDGETS.md)
- [Public roadmap](docs/ROADMAP.md)
- [Full docs map](docs/README.md)

## Screenshots

| Home | Energy | Security |
|---|---|---|
| ![Navet home dashboard on iPad](assets/reference/marketing/screenshots/navet-ipad-landscape-home.jpg) | ![Navet energy dashboard on iPad](assets/reference/marketing/screenshots/navet-ipad-landscape-energy.jpg) | ![Navet security dashboard on iPad](assets/reference/marketing/screenshots/navet-ipad-landscape-security.jpg) |

| Tablet | Mobile home | Mobile controls |
|---|---|---|
| ![Navet tablet portrait dashboard](assets/reference/marketing/screenshots/navet-tablet-portrait-home.jpg) | ![Navet mobile PWA home dashboard](assets/reference/marketing/screenshots/navet-mobile-pwa-home.jpg) | ![Navet mobile PWA media or lights dashboard](assets/reference/marketing/screenshots/navet-mobile-pwa-media-or-lights.jpg) |

## For Contributors

If you want to work on the repo:

- start with [CONTRIBUTING.md](CONTRIBUTING.md)
- then use [docs/README.md](docs/README.md) for the full docs map

Short architecture note:

- Navet is organized around provider-neutral `@navet/core` and `@navet/ui`, provider packages,
  and an `@navet/app` composition layer
- `@navet/ui` is the target shared UI boundary
- much of the current shared UI implementation still lives in
  `packages/app/src/components/*` and `packages/app/src/ui-kit/*`

## Repo Layout

Reusable packages:

```text
packages/
  core/
  ui/
  provider-homeassistant/
  provider-homey/
  provider-openhab/
  provider-hubitat/
  provider-smartthings/
  app/
```

Deployable surfaces:

```text
apps/
  standalone/
  ha-panel/
  storybook/
  demo/
  website/
```

Home Assistant release surfaces and shared assets:

```text
platform/
  home-assistant/
    addons/
    custom_components/

assets/
  public/
  reference/
```
