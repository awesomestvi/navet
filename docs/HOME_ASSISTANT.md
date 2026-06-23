# Home Assistant

Use this guide when you want Navet to connect to Home Assistant.

## Overview

Navet currently supports three Home Assistant deployment paths:

- custom panel via HACS
- add-on
- standalone Docker connected to Home Assistant

## Which Path Should You Choose?

| Path | Best when | Notes |
|---|---|---|
| Custom panel | you want Navet in the Home Assistant sidebar through HACS | Home Assistant-hosted experience |
| Add-on | you want Home Assistant to package and manage Navet | runs behind Ingress |
| Standalone Docker | you want Navet as its own app while still connecting to Home Assistant | uses OAuth and stores app state under `/data` |

## Home Assistant Custom Panel

### When To Choose It

Use the custom panel if you want Navet in the Home Assistant sidebar through HACS with the most
integrated Home Assistant experience.

### Prerequisites

- Home Assistant
- HACS

### Setup Steps

1. Add `https://github.com/awesomestvi/navet-hacs` as a custom HACS repository with category
   `Integration`.
2. Install `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Optional but recommended for native Home Assistant chrome hiding in the custom panel and add-on: add Navet's shell module under `frontend.extra_module_url`:

```yaml
frontend:
  extra_module_url:
    - /api/navet/static/navet-ha-shell.js
```

6. Restart Home Assistant after updating `configuration.yaml`.
7. Open Navet from the Home Assistant sidebar.

### What To Expect

- Navet appears in the Home Assistant sidebar
- Home Assistant remains the host environment
- If `navet-ha-shell.js` is loaded through `frontend.extra_module_url`, Navet can hide the Home Assistant header and sidebar while the custom panel or add-on is open

### Troubleshooting

- If you previously added `https://github.com/awesomestvi/navet` to HACS, remove that custom
  repository and add `https://github.com/awesomestvi/navet-hacs` with category `Integration`.

## Home Assistant Add-on

### When To Choose It

Use the add-on if you want Navet packaged and managed from Home Assistant itself.

### Prerequisites

- Home Assistant with add-on support

### Setup Steps

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet` as an Add-on Store repository.
4. Install `Navet` for stable releases or `Navet Dev` for the nightly development surface.
5. Start the add-on and open Navet from the Home Assistant sidebar.
6. Optional but recommended for native Home Assistant chrome hiding in the add-on: add Navet's shell module under `frontend.extra_module_url`:

```yaml
frontend:
  extra_module_url:
    - /api/navet/static/navet-ha-shell.js
```

7. Restart Home Assistant after updating `configuration.yaml`.

### What To Expect

- Navet runs behind Home Assistant Ingress
- the Home Assistant frontend session is reused through the parent `hass` runtime bridge
- Navet does not open its own Home Assistant websocket while running inside Ingress
- If `navet-ha-shell.js` is loaded through `frontend.extra_module_url`, Navet can hide the Home Assistant header and sidebar while the add-on is open
- the direct host port is off by default
- if you expose the app outside Ingress, Navet falls back to the standalone-style OAuth flow

### Troubleshooting

- If the add-on opens outside Ingress, expect standalone-style OAuth behavior instead of the
  parent-session bridge.
- The add-on cannot inject host-shell code into Home Assistant by itself. Native Home Assistant chrome hiding in add-on mode requires the global `frontend.extra_module_url` entry above.

## Standalone Docker

### When To Choose It

Use standalone Docker when you want Navet to run as its own app while still connecting to Home
Assistant.

### Prerequisites

- Docker
- a Home Assistant instance reachable from the browser that will open Navet

### Setup Steps

Use this `docker-compose.yml`:

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

Then open `http://localhost:8080`.

### What To Expect

- Home Assistant login uses OAuth
- dashboard and profile state are stored through same-origin runtime endpoints under `/data`
- if the stored OAuth session becomes invalid during token refresh, Navet clears it and returns to login

### Troubleshooting

- If Navet repeatedly returns to login, verify that the saved Home Assistant URL still matches your current instance URL.
- If you recently changed reverse-proxy, TLS, hostname, or port settings for Home Assistant, sign in again so Navet can obtain a fresh OAuth session.
- If the Home Assistant authorization was revoked or the refresh token became invalid, sign in again to recreate the stored session under `/data`.
