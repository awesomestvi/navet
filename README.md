# Navet

A smart-home dashboard frontend for wall panels, tablets, phones, and desktop screens.

![Navet dashboard demo on iPad frame](docs/marketing/assets/use-cases/navet-ipad-frame-dashboard.jpg)

[Live demo](https://awesomestvi.github.io/navet/demo/) ·
[Storybook](https://awesomestvi.github.io/navet/storybook/) ·
[Security notes](docs/PUBLIC_LAUNCH_SECURITY.md)

Current release: `0.3.0`

## Summary

Navet turns supported smart-home providers into a dedicated control surface. It is strongest on
Home Assistant today, includes implemented Homey support through the standalone runtime path, and
uses provider-scoped architecture rather than Home Assistant-first UI contracts.

Current runtime surfaces:

- Home Assistant custom panel through HACS
- Home Assistant add-on through Ingress
- standalone Docker or hosted standalone app
- localhost development

Current provider reality:

- Home Assistant: implemented and most mature
- Homey: implemented through standalone OAuth-backed flows
- openHAB: planned, not shipped

## What Navet Includes

- room-driven Home dashboard plus dedicated `energy`, `climate`, `security`, `lights`, `media`,
  `tasks`, and `settings` sections
- entity cards for common Home Assistant domains such as lights, switches, fans, climate, covers,
  locks, cameras, media players, weather, calendars, people, sensors, scenes, and vacuums
- dashboard editing with card ordering, resizing, locking, visibility, room assignment, and Home
  overview layout control
- custom widgets including info, RSS, photo frame, note, battery, UPS, energy now, button, and map
- localization, theme selection, PWA install support, kiosk-friendly behavior, and shared
  dashboard/profile persistence for Docker and add-on deployments

## Architecture Direction

Navet is a multi-provider frontend built around Navet-owned contracts and provider/runtime seams.

The canonical architecture reference is
[docs/technical/multi-backend-migration-guide.md](docs/technical/multi-backend-migration-guide.md).
In current repo terms, shared work should build on:

- `src/app/core/`
- `src/app/platform/`
- `src/app/stores/`
- `src/app/hooks/`
- `src/auth/`
- `src/app/features/`

Provider-specific behavior belongs primarily in:

- `src/app/infrastructure/home-assistant/`
- `src/app/services/`
- `src/app/stores/home-assistant-store.ts`

Current provider lifecycle and shared resource seams are centered in:

- `src/app/services/integration-registry.service.ts`
- `src/app/services/integration-bootstrap.service.ts`
- `src/app/services/integration-resource.service.ts`

## Install And Run

### Home Assistant custom panel

This is the recommended Home Assistant-native path for Home Assistant OS and Supervised users.

1. In HACS, add `https://github.com/awesomestvi/navet` as a custom repository with category
   `Integration`.
2. Download `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Open Navet from the Home Assistant sidebar.

Behavior:

- served by Home Assistant at `/navet`
- uses the injected Home Assistant frontend session
- does not show a separate Navet login screen

### Home Assistant add-on

Use the add-on when you specifically want Navet hosted as a Home Assistant add-on with Ingress.

1. Add the repository `https://github.com/awesomestvi/navet` to the Home Assistant add-on store.
2. Install `Navet`.
3. Optionally set `dashboard_config_url` to import an existing Navet dashboard config on first
   launch.
4. Start the add-on and open Navet from the sidebar through Ingress.

Behavior:

- uses the existing Home Assistant frontend session through Ingress
- keeps the direct host port disabled by default
- uses OAuth only when opened outside Ingress through an optional direct port

### Standalone Docker

For standalone deployments, create a `docker-compose.yml`:

```yaml
services:
  navet:
    image: ghcr.io/awesomestvi/navet:latest
    container_name: navet
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - navet-data:/data

volumes:
  navet-data:
```

Start it:

```bash
docker compose up -d
```

Open `http://localhost:8080`.

Standalone behavior:

- Home Assistant uses OAuth authorization-code login
- Homey support is also entered from the standalone login flow
- same-origin runtime endpoints store auth and shared dashboard profile state under `/data`

To enable Homey OAuth, add:

```yaml
services:
  navet:
    environment:
      NAVET_HOMEY_CLIENT_ID: your-athom-client-id
      NAVET_HOMEY_CLIENT_SECRET: your-athom-client-secret
```

Set `NAVET_HOMEY_REDIRECT_URI` only when Navet cannot infer the public callback URL correctly from
the incoming request path.

## Returning Users

Navet no longer uses manual Home Assistant long-lived token entry in the normal app flow.

Legacy browser auth entries such as `ha_auth_config`, `ha-dashboard-config`, and
`navet-auth-config` are removed during auth initialization so stale values do not keep controlling
runtime behavior.

Dashboard config is separate from authentication. If you want to restore an existing dashboard into
a new browser or a fresh `/data` volume, use Navet's exported dashboard config and restore it on
first launch with `dashboard_config_url` or `NAVET_DASHBOARD_CONFIG_URL`.

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

For local Home Assistant testing, enter the Home Assistant base URL in Navet and complete the OAuth
flow. For Homey testing, use the Homey option from the same login screen and provide the required
Homey OAuth environment configuration.

## Commands

Core commands:

```bash
pnpm dev
pnpm test
pnpm test:coverage
pnpm storybook
pnpm storybook:build
pnpm check:stories
pnpm check:ui-kit
pnpm check:docker
pnpm build:ha-panel
```

Per repo policy, `pnpm typecheck` and `pnpm check` are user-run gates rather than default agent-run
commands. See [docs/agents/commands.md](docs/agents/commands.md).

## Docs

- [docs/README.md](docs/README.md)
- [docs/technical/multi-backend-migration-guide.md](docs/technical/multi-backend-migration-guide.md)
- [docs/technical/REACT_ZUSTAND.md](docs/technical/REACT_ZUSTAND.md)
- [docs/DOCKER_HOME_ASSISTANT_ADDON.md](docs/DOCKER_HOME_ASSISTANT_ADDON.md)
- [docs/WIDGETS.md](docs/WIDGETS.md)
- [docs/STORYBOOK_WORKFLOW.md](docs/STORYBOOK_WORKFLOW.md)

## Screenshots

| Home | Energy | Security |
|---|---|---|
| ![Navet home dashboard on iPad](docs/marketing/assets/screenshots/navet-ipad-landscape-home.jpg) | ![Navet energy dashboard on iPad](docs/marketing/assets/screenshots/navet-ipad-landscape-energy.jpg) | ![Navet security dashboard on iPad](docs/marketing/assets/screenshots/navet-ipad-landscape-security.jpg) |

| Tablet | Mobile home | Mobile controls |
|---|---|---|
| ![Navet tablet portrait dashboard](docs/marketing/assets/screenshots/navet-tablet-portrait-home.jpg) | ![Navet mobile PWA home dashboard](docs/marketing/assets/screenshots/navet-mobile-pwa-home.jpg) | ![Navet mobile PWA media or lights dashboard](docs/marketing/assets/screenshots/navet-mobile-pwa-media-or-lights.jpg) |
