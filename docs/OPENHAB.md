---
title: openHAB
description: Connect a standalone Navet installation to openHAB.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/OPENHAB.md
---

Use this guide to connect Navet to openHAB in standalone
mode. The same URL and credential flow can add openHAB from **Settings -> System** in another
Navet runtime that exposes provider management.

## Overview

Navet's same-origin server proxy connects to the openHAB server URL you provide. The current flow
is URL-based and uses username and password authentication without returning the saved credentials
to browser JavaScript.

## When To Choose This Path

Choose this path when:

- you want Navet in standalone mode
- you use openHAB as the provider
- the Navet container or Home Assistant App can reach openHAB

## Prerequisites

You need:

- an openHAB server reachable from the Navet container or Home Assistant App
- the base URL for that openHAB server, for example `http://openhab.local:8080`
- an openHAB username and password that can access the REST API
- openHAB Basic auth or API Security enabled in `Settings -> API Security` (`org.openhab.restauth`)

## Setup Steps

### 1. Prepare the openHAB URL

Navet expects the server base URL, not a deeper path.

Valid examples:

- `http://openhab.local:8080`
- `https://openhab.example.com`

For local development, `http://localhost:8080` is supported when Navet and openHAB run on the
same host. In Docker, `localhost` refers to the Navet container; use a hostname or LAN address
that the container can reach instead.

Do not enter paths such as:

- `/rest`
- `/basicui`
- `/habpanel`

Navet builds the REST and WebSocket endpoints from the base URL you provide.

### 2. Start Navet

Use this `docker-compose.yaml`:

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
    # Optional: hard-pin the only openHAB URL this installation may enroll.
    # environment:
    #   NAVET_OPENHAB_URL: "http://openhab.local:8080"

volumes:
  navet-data:
```

Then run:

```bash
docker compose up -d
```

Open Navet and connect using your openHAB URL, username, and password.
`NAVET_OPENHAB_URL` optionally restricts this installation to one exact normalized openHAB base URL.

### 3. Sign in

1. Open Navet.
2. Choose `openHAB` on the provider screen, or choose **Connect** under openHAB in
   **Settings -> System** when adding it to an existing dashboard.
3. Enter the openHAB base URL.
4. Enter your openHAB username and password.
5. Continue into the dashboard.

## What To Expect

- Navet's server-side proxy connects to the openHAB URL you provide.
- Your openHAB credentials authorize the connection.
- There is no separate cloud redirect step.
- Navet stores the username and password in that browser's server-side provider session and
  authenticates allowlisted REST and WebSocket requests with Basic auth.
- Navet loads item state from the openHAB REST API and listens for updates over the openHAB
  WebSocket API at `/ws`.
- Local HTTP targets must use a private-network address, single-label hostname, or `.local`
  hostname. Public DNS targets require HTTPS.
- openHAB contributes rooms, lights, switches, fans, covers, locks, speakers, climate setpoints,
  and sensors to the shared dashboards. Measurements retain their units and decimal precision.
- openHAB can stay connected alongside Home Assistant or Homey in standalone Navet; selected
  providers are combined in shared dashboard collections.
- repeated credential verification is throttled per direct client source. A `429` response includes
  `Retry-After`; wait for that interval before trying again.

## Devices And Measurements

Navet uses openHAB item types, semantic tags, categories, and location groups to identify devices
and place them in rooms. Semantic equipment groups associate controls with their measurements.
Related item names such as `RadiatorTarget` and `RadiatorTemperature`, or `Speaker_State` and
`Speaker_Volume`, also associate controls when equipment metadata is unavailable.

- **Lighting and switches:** Switch, Dimmer, and Color items provide the appropriate controls.
  Color lights support brightness and hue/saturation. Related power, energy, voltage, and current
  measurements appear on switch cards and remain available to the dashboards.
- **Climate:** Temperature items tagged `Setpoint` provide a target-temperature control. A related
  temperature measurement supplies the current reading. Fan-category Dimmer items provide speed
  controls. Temperature, humidity, pressure, air quality, and outdoor measurements appear as sensors.
- **Security:** Contact items and Switch items tagged `Status` supply opening, motion, occupancy,
  leak, and safety readings. Lock items provide lock/unlock controls, and battery measurements
  appear in the shared battery overview. Roller shutter items provide movement and position controls.
- **Media:** Sound-volume-category String items provide playback state and play/pause controls.
  A related sound-volume-category Dimmer supplies the speaker volume control.
- **Energy and utilities:** Power and energy readings contribute device measurements. Water and gas
  meters retain their volume units; cumulative readings are not presented as today's consumption
  without history. Wind, rainfall, illuminance, and DateTime items remain available as sensors.

Read-only items provide readings without writable controls. An undefined item state is shown as
unknown rather than a clear safety reading. openHAB does not currently provide Navet with camera,
calendar, weather-forecast, notification, task, media-browser, alarm-panel, energy-statistics,
history, or provider-administration services.

## API Security Requirements

- If your openHAB instance disables the implicit LAN user role, Navet needs valid credentials for
  both REST and WebSocket access.
- openHAB REST Basic auth must be enabled under `Settings -> API Security`
  (`org.openhab.restauth`) for username/password login to work.
- If you have not enabled that setting yet, turn it on before trying to connect Navet.
- API token login is not exposed in the UI today.
- Keep openHAB's own authentication enabled and use upstream network or reverse-proxy access
  control when Navet is reachable outside a trusted LAN. Navet's bounded login throttle is
  defense-in-depth, not a replacement for provider access control.

## Troubleshooting

- Use the exact container-reachable base URL for openHAB. If `http://openhab.local:8080` resolves
  only on the browser device but not inside the Navet container, use a container-reachable LAN
  hostname or private address instead.
- If openHAB sits behind a reverse proxy, enter the public URL exposed by that proxy rather than an
  internal-only hostname. Public DNS targets must use HTTPS with a trusted certificate. Plain HTTP
  is accepted only for private IP addresses, single-label hostnames, and `.local` hostnames;
  loopback, link-local/metadata, public literal-IP, malformed, and path-traversal targets are
  rejected.
- TLS certificate validation is enabled by default. For a private installation with a self-signed
  provider certificate, install the relevant CA in the container when possible. The explicit
  `NAVET_ALLOW_INSECURE_PROVIDER_TLS=true` standalone option or
  `allow_insecure_provider_tls` Home Assistant App option disables provider verification for all configured
  HTTPS providers and should be used only on a trusted network.
- Remove trailing-path guesses such as `/rest` or `/basicui`; Navet expects the server base URL and
  will call the REST and WebSocket endpoints itself.
- If Navet says the URL is invalid, make sure you entered a full absolute URL including `http://`
  or `https://`.
- If Navet reports an openHAB authentication failure, verify the username and password in openHAB
  and confirm Basic auth or API Security is enabled in `Settings -> API Security`.
- If a configured `NAVET_OPENHAB_URL` differs from your URL, update that configuration or use the
  configured address. If Navet returns `429`, wait for the `Retry-After` interval before retrying.
