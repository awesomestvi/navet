---
title: openHAB
description: Connect a standalone Navet installation to openHAB.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/OPENHAB.md
---

Use this guide when you want Navet to connect to openHAB as the primary provider in standalone
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
- the Navet container or add-on can reach openHAB

## Prerequisites

You need:

- an openHAB server reachable from the Navet container or add-on
- the base URL for that openHAB server, for example `http://openhab.local:8080`
- an openHAB username and password that can access the REST API
- openHAB Basic auth or API Security enabled in `Settings -> API Security` (`org.openhab.restauth`)

## Setup Steps

### 1. Prepare the openHAB URL

Navet expects the server base URL, not a deeper path.

Valid examples:

- `http://openhab.local:8080`
- `https://openhab.example.com`

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

For a fresh installation, inspect `docker compose logs navet` and open Navet once with the printed
`#navet_pairing=<64-character-key>` fragment. Navet removes the fragment immediately and keeps the
key only in browser memory until the enrollment request is accepted. Reloading before you connect
requires reopening the pairing URL. The key can be recovered later with:

```bash
docker exec navet cat /data/navet-installation-key
```

As an alternative, `NAVET_OPENHAB_URL` hard-pins one exact normalized openHAB base URL. A pin
cannot be overridden by another URL, even with the pairing key.

### 3. Sign in

1. Open Navet.
2. Choose `openHAB` on the provider screen.
3. Enter the openHAB base URL.
4. Enter your openHAB username and password.
5. Continue into the dashboard.

## What To Expect

- Navet's server-side proxy connects to the openHAB URL you provide.
- a fresh, unpinned target requires the installation pairing fragment; Navet never returns the key
  in HTTP content or forwards it to openHAB
- There is no separate cloud redirect step.
- Navet stores the username and password in that browser's server-side provider session and
  authenticates allowlisted REST and WebSocket requests with Basic auth.
- Navet loads item state from the openHAB REST API and listens for updates over the openHAB
  WebSocket API at `/ws`.
- Local HTTP targets must use a private-network address, single-label hostname, or `.local`
  hostname. Public DNS targets require HTTPS.
- The current openHAB runtime contributes rooms, realtime entities, lighting, switches, and
  sensors. Climate, media, cameras, energy, calendar, weather, notifications, tasks, history,
  security, and provider-administration feature services are not registered for openHAB yet.
- openHAB can stay connected alongside Home Assistant or Homey in standalone Navet; selected
  providers are combined in shared dashboard collections.
- repeated credential verification is throttled per direct client source. A `429` response includes
  `Retry-After`; wait for that interval before trying again.

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
  `allow_insecure_provider_tls` add-on option disables provider verification for all configured
  HTTPS providers and should be used only on a trusted network.
- Remove trailing-path guesses such as `/rest` or `/basicui`; Navet expects the server base URL and
  will call the REST and WebSocket endpoints itself.
- If Navet says the URL is invalid, make sure you entered a full absolute URL including `http://`
  or `https://`.
- If Navet reports an openHAB authentication failure, verify the username and password in openHAB
  and confirm Basic auth or API Security is enabled in `Settings -> API Security`.
- If Navet returns `403` with an operator-pairing message, reopen the startup pairing fragment or
  configure the exact `NAVET_OPENHAB_URL` pin. If it returns `429`, wait for the `Retry-After`
  interval instead of retrying immediately.
