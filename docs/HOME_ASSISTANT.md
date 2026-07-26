---
title: Home Assistant
description: Install Navet as a Home Assistant custom panel, add-on, or standalone application.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/HOME_ASSISTANT.md
---

Use this guide when you want Navet to connect to Home Assistant.

To explore the interface without connecting a provider, use the public demo at
[`demo.navet.app`](https://demo.navet.app/). The demo is a separate static deployment and contains
sample data only.

## Overview

Navet currently supports three Home Assistant deployment paths:

- custom panel via HACS
- add-on
- standalone Docker connected to Home Assistant

To test frequently updated development builds, see [Install Navet Dev](/install/navet-dev/). Published Dev
builds are available for the add-on and Docker; HACS remains stable-only.

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
- The shell module is served by the Navet integration at `/api/navet/static/navet-ha-shell.js`

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
4. Install `Navet` for stable releases or `Navet Dev` for the published development channel.
5. If you want native Home Assistant chrome hiding in add-on mode, also install the Navet HACS integration so Home Assistant can serve `/api/navet/static/navet-ha-shell.js` to the parent frontend.
6. Start the add-on and open Navet from the Home Assistant sidebar.
7. Optional but recommended for native Home Assistant chrome hiding in the add-on: add Navet's shell module under `frontend.extra_module_url`:

```yaml
frontend:
  extra_module_url:
    - /api/navet/static/navet-ha-shell.js
```

8. Restart Home Assistant after updating `configuration.yaml`.

Optional multi-provider add-on settings:

- `homey_client_id` and `homey_client_secret` enable the Homey OAuth connection flow
- `homey_redirect_uri` overrides the inferred Homey callback URL when the public Ingress URL
  differs
- openHAB needs no add-on secret; connect it from **Settings -> System** with its browser-reachable
  base URL, username, and password

### What To Expect

- Navet runs behind Home Assistant Ingress
- the Home Assistant frontend session is reused through the parent `hass` runtime bridge
- Navet does not open its own Home Assistant websocket while running inside Ingress
- If `navet-ha-shell.js` is loaded through `frontend.extra_module_url`, Navet can hide the Home Assistant header and sidebar while the add-on is open
- That shell module is served by the Navet HACS integration, not by the add-on ingress app
- the add-on is Ingress-only and does not publish a direct host port
- trusted Home Assistant user headers are accepted only on this Ingress-only deployment path
- use standalone Docker when you need direct browser access and per-browser Home Assistant OAuth

### Troubleshooting

- Do not expose the add-on's internal port through a separate host proxy. That would bypass the
  Ingress-only trust boundary. Install standalone Docker instead when direct access is required.
- The add-on cannot inject host-shell code into Home Assistant by itself. Native Home Assistant chrome hiding in add-on mode requires both the global `frontend.extra_module_url` entry above and the Navet HACS integration that serves `/api/navet/static/navet-ha-shell.js`.

## Standalone Docker

### When To Choose It

Use standalone Docker when you want Navet to run as its own app while still connecting to Home
Assistant.

### Prerequisites

- Docker
- a Home Assistant instance reachable from both the browser and the Navet container; OAuth token
  exchange and authenticated proxy requests now run through Navet's server-side session
- for HTTPS Home Assistant URLs, a certificate chain trusted by the Navet container

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
- every browser profile gets an independent Home Assistant OAuth session, even when several
  panels use the same Navet container and Home Assistant instance
- an opaque `HttpOnly`, `SameSite=Lax` cookie selects that browser's server-side session; HTTPS
  deployments also mark it `Secure`
- OAuth state and callback processing are bound to the browser that started the login
- the Home Assistant proxy discards caller-supplied authorization and injects only the token from
  that browser's session
- signing out removes only the current browser's OAuth session
- if the stored OAuth session becomes invalid during token refresh, Navet clears it and returns to login

OAuth credentials and dashboard profile data have different scopes. The OAuth files under
`/data/navet-auth-sessions` belong to individual browser sessions; they are not copied between
phones or wall panels. Shared dashboard configuration can still synchronize through Navet's
profile store without causing one panel to inherit another panel's Home Assistant account.

Navet's public session-status response contains only sanitized metadata such as the Home Assistant
URL, expiry, and a non-secret public session ID. Access and refresh tokens are never returned by
that `GET` response. Home Assistant's WebSocket protocol does require an access token in its
opening authentication message, so Navet performs a separate same-session, binding-checked
credentials handoff for the connected app.

Home Assistant exposes its current-user identity through WebSocket rather than a server-verifiable
REST endpoint. The standalone Nginx runtime therefore leaves `userId` and `userName` unset and does
not accept browser-supplied identity. Account-scoped preferences remain local in standalone mode
for now, while the shared dashboard profile still synchronizes across authenticated browsers.
Add-on Ingress can synchronize account preferences because Supervisor supplies verified
`X-Remote-User-*` headers on its Ingress-only route.

When upgrading from a version that stored one global `navet-auth-session.json`, Navet deliberately
discards that ambiguous session instead of assigning its credentials to whichever device connects
first. Sign in once on each browser profile after the upgrade.

## Automation And Habit Insights

Home Assistant is currently the provider path that supports native automation details and
habit-suggested automation creation.

In the Tasks section, Navet can inspect Home Assistant automation config to show triggers,
conditions, actions, diagnostics, and dependent entity states. In Habits, creating a suggested
routine writes a Home Assistant automation with a `navet_` config key when the rule maps to a safe
turn-on or turn-off action. Notify-only habit rules are not created as native Home Assistant
automations yet.

## Home Assistant Feature Scope

Home Assistant is currently Navet's broadest provider runtime. In addition to normalized rooms,
entities, lighting, switches, sensors, and realtime updates, it registers provider services for:

- climate controls
- media playback, browse, search, source selection, artwork, and speaker grouping
- camera snapshots, WebRTC/HLS stream resolution, and camera accessories
- locks, covers, and alarm panels
- energy configuration, live energy, statistics, and entity history
- calendars and weather forecasts
- persistent notifications, update installation, and restart actions
- automation details, triggering, dependency summaries, and supported habit-created automations
- room creation/deletion and entity room/name administration

In standalone mode, a Home Assistant session can remain connected alongside Homey or openHAB.
Shared dashboard collections can include selected providers together; provider-specific features
continue to use the provider that owns the entity or the active provider's feature service.

### Troubleshooting

- If Navet repeatedly returns to login, verify that the saved Home Assistant URL still matches your current instance URL.
- If you recently changed reverse-proxy, TLS, hostname, or port settings for Home Assistant, sign in again so Navet can obtain a fresh OAuth session.
- If OAuth reaches Home Assistant but fails after returning to Navet, verify the Home Assistant URL
  from inside the Navet container. Browser-only `.local` names and private certificates that the
  container cannot resolve or trust will prevent the server-side token exchange.
- If the Home Assistant authorization was revoked or the refresh token became invalid, sign in again to recreate the stored session under `/data`.
- If OAuth returns to a different browser or fails after a reverse-proxy change, verify that the
  proxy preserves the public `Host` and `X-Forwarded-Proto` values. The callback must return to the
  same browser cookie jar that started login.
- Browser profiles, private-browsing windows, and separate installed PWAs intentionally have
  separate OAuth sessions. Logging in on one does not log in the others.
