# Navet

A smart-home dashboard frontend for wall panels, tablets, phones, and desktop screens.

![Navet dashboard demo on iPad frame](docs/marketing/assets/use-cases/navet-ipad-frame-dashboard.jpg)

[Live demo](https://awesomestvi.github.io/navet/demo/) ·
[Storybook](https://awesomestvi.github.io/navet/storybook/) ·
[Security notes](SECURITY.md) ·
[Security policy](SECURITY.md) ·
[Code of conduct](CODE_OF_CONDUCT.md)

## Supported Platforms

<table>
  <tr>
    <td align="center" width="33%">
      <img src="packages/app/src/assets/providers/home-assistant.svg" alt="Home Assistant" height="48"><br>
      <strong>Home Assistant</strong><br>
      custom panel, add-on, standalone
    </td>
    <td align="center" width="33%">
      <img src="packages/app/src/assets/providers/homey.png" alt="Homey" height="48"><br>
      <strong>Homey</strong><br>
      standalone OAuth flow
    </td>
    <td align="center" width="33%">
      <img src="packages/app/src/assets/providers/openhab.svg" alt="openHAB" height="48"><br>
      <strong>openHAB</strong><br>
      standalone URL-session flow
    </td>
  </tr>
</table>

## At A Glance

![Supported providers](https://img.shields.io/badge/Supported%20providers-3-f97316?style=for-the-badge)
![Home Assistant modes](https://img.shields.io/badge/Home%20Assistant%20modes-3-0f766e?style=for-the-badge)
![Device card types](https://img.shields.io/badge/Device%20card%20types-14-1d4ed8?style=for-the-badge)
![Custom widgets](https://img.shields.io/badge/Custom%20widgets-9-7c3aed?style=for-the-badge)

## What Navet Is

Navet turns supported smart-home platforms into a dedicated control surface.

It currently supports:

- Home Assistant across custom panel, add-on, and standalone modes
- Homey through the standalone login flow
- openHAB through the standalone URL-session flow

Hubitat and SmartThings have package scaffolding in the repo, but they are not available runtime
options yet.

## What You Get

- a room-driven Home dashboard plus dedicated `energy`, `climate`, `security`, `lights`, `media`,
  `tasks`, and `settings` sections
- cards for lights, switches, fans, climate, covers, locks, cameras, media players, weather,
  calendars, people, sensors, scenes, and vacuums
- dashboard editing with ordering, resizing, locking, visibility, room assignment, and import or
  export
- custom widgets including info, RSS, photo, note, battery, UPS, energy-now, button, and map
- themes, localization, PWA install support, and persistence for standalone and add-on deployments

## How To Get Started

Choose your platform first, then open the matching setup guide:

### Home Assistant

- [Home Assistant Custom Panel](docs/HOME_ASSISTANT.md#home-assistant-custom-panel)
- [Home Assistant Add-on](docs/HOME_ASSISTANT.md#home-assistant-add-on)
- [Standalone Docker](docs/HOME_ASSISTANT.md#standalone-docker)

### Homey

- [Standalone Docker](docs/HOMEY.md)

### openHAB

- [Standalone Docker](docs/OPENHAB.md)


## Development

Prerequisites:

- Node.js `^20.19.0` or `>=22.12.0`
- pnpm 11 from the pinned `packageManager`

Install and start:

```bash
pnpm install
pnpm dev
```

Open the local Vite URL, usually `http://localhost:5173`.

For local testing:

- Home Assistant: enter the Home Assistant base URL in Navet and complete OAuth
- Homey: use the Homey option from the login screen with the required OAuth environment variables
- openHAB: use the openHAB option from the login screen and provide the base URL, username, and password

## Repo Shape

Navet now has real package surfaces:

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

The repo still contains `src/` implementation paths, but the package split is real and is the
right mental model for contributors.

## Commands

Core commands:

```bash
pnpm dev
pnpm test
pnpm test:tier1
pnpm test:tier2
pnpm test:tier3
pnpm test:coverage
pnpm storybook
pnpm storybook:build
pnpm build:demo
pnpm build:website
pnpm docker:build
pnpm docker:smoke
pnpm check:stories
pnpm check:ui-kit
pnpm check:docker
pnpm build:ha-panel
pnpm release:check
pnpm release:version-sync
```

Per repo policy, `pnpm typecheck` and `pnpm check` are user-run gates rather than default
agent-run commands.

## Docs

Start with [docs/README.md](docs/README.md).

Useful entry points:

- [docs/HOME_ASSISTANT.md](docs/HOME_ASSISTANT.md)
- [docs/HOMEY.md](docs/HOMEY.md)
- [docs/OPENHAB.md](docs/OPENHAB.md)
- [docs/WIDGETS.md](docs/WIDGETS.md)
- [SECURITY.md](SECURITY.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/release-workflow.md](docs/release-workflow.md)
- [docs/rollback.md](docs/rollback.md)
- [docs/agents/architecture.md](docs/agents/architecture.md)

## Screenshots

| Home | Energy | Security |
|---|---|---|
| ![Navet home dashboard on iPad](docs/marketing/assets/screenshots/navet-ipad-landscape-home.jpg) | ![Navet energy dashboard on iPad](docs/marketing/assets/screenshots/navet-ipad-landscape-energy.jpg) | ![Navet security dashboard on iPad](docs/marketing/assets/screenshots/navet-ipad-landscape-security.jpg) |

| Tablet | Mobile home | Mobile controls |
|---|---|---|
| ![Navet tablet portrait dashboard](docs/marketing/assets/screenshots/navet-tablet-portrait-home.jpg) | ![Navet mobile PWA home dashboard](docs/marketing/assets/screenshots/navet-mobile-pwa-home.jpg) | ![Navet mobile PWA media or lights dashboard](docs/marketing/assets/screenshots/navet-mobile-pwa-media-or-lights.jpg) |
