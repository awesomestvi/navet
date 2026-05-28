# Docker And Home Assistant Add-on

This guide documents the currently implemented packaging and runtime model for Navet.

## Supported Packaging Surfaces

- Home Assistant custom panel through `custom_components/navet`
- standalone Docker container
- Home Assistant add-on through Ingress

## Runtime Model

Navet is a Vite-built frontend with runtime-specific session handling:

- custom panel: uses the injected Home Assistant frontend session
- add-on through Ingress: uses the authenticated Home Assistant Ingress session
- standalone Docker or standalone dev app: uses OAuth-backed provider login
- standalone Homey access: enters through the same standalone login flow

Current provider support in these flows:

- Home Assistant: implemented across panel, add-on, and standalone
- Homey: implemented through the standalone runtime path
- openHAB: planned, not implemented

## Home Assistant Custom Panel

The custom panel is packaged as the `custom_components/navet` integration.

Current behavior:

- registers a sidebar panel at `/navet`
- serves bundled frontend assets from `/api/navet/static/`
- loads `navet-panel.js`
- uses the current Home Assistant frontend session

Build command:

```bash
pnpm build:ha-panel
```

The build writes panel assets into `custom_components/navet/frontend/`.

## Standalone Docker

Standalone Docker serves the app with nginx and generates runtime config at startup.

Important current behavior:

- auth and shared profile state are persisted through same-origin endpoints under `/data`
- RSS proxy requests are handled through the nginx `njs` layer
- Home Assistant runs through OAuth-backed standalone login
- Homey also uses the standalone login flow

Useful runtime environment variables:

- `NAVET_HASS_URL`
- `NAVET_DASHBOARD_CONFIG_URL`
- `NAVET_HOMEY_CLIENT_ID`
- `NAVET_HOMEY_CLIENT_SECRET`
- `NAVET_HOMEY_REDIRECT_URI` only when auto-inferred callback URLs are not correct

Example:

```yaml
services:
  navet:
    image: ghcr.io/awesomestvi/navet:latest
    ports:
      - "8080:80"
    volumes:
      - navet-data:/data
    environment:
      NAVET_HOMEY_CLIENT_ID: your-athom-client-id
      NAVET_HOMEY_CLIENT_SECRET: your-athom-client-secret

volumes:
  navet-data:
```

## Home Assistant Add-on

The add-on is the Ingress-hosted packaging surface under `addons/navet/`.

Current behavior:

- runs behind Home Assistant Ingress
- uses the current authenticated Home Assistant frontend session
- does not require manual `hass_url` or token entry
- keeps the direct host port disabled by default
- can optionally import a dashboard config on first launch through `dashboard_config_url`
- falls back to standalone-style OAuth only when opened outside Ingress through an optional direct
  port

## Returning Users And Legacy Token Options

Navet no longer uses manual Home Assistant long-lived token entry in the normal Docker, add-on, or
dev flow.

Legacy browser auth keys are cleared during auth initialization so stale values do not keep
controlling runtime behavior. Existing stored add-on options such as old `hass_url` or `token`
values may still be tolerated during upgrade, but Navet does not use them.

## Local Validation

For Docker packaging validation:

```bash
pnpm check:docker
```

This validates the generated runtime nginx and `njs` configuration through the real container
entrypoint.

## Release Notes

- `latest` is the public standalone image release tag
- `dev` and `sha-*` images are used for development and workflow-driven testing
- the custom panel ships from the repository source and requires `pnpm build:ha-panel`
- the add-on pulls prebuilt images published by CI
