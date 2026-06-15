# openHAB

Use this guide when you want Navet to connect to openHAB in standalone mode.

## Overview

Navet connects directly to the openHAB server URL you provide. The current flow is URL-based and
uses username and password authentication.

## When To Choose This Path

Choose this path when:

- you want Navet in standalone mode
- you use openHAB as the provider
- you can reach openHAB from the same browser device that opens Navet

## Prerequisites

You need:

- an openHAB server reachable from the browser device that will run Navet
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

volumes:
  navet-data:
```

Then run:

```bash
docker compose up -d
```

### 3. Sign in

1. Open Navet.
2. Choose `openHAB` on the provider screen.
3. Enter the openHAB base URL.
4. Enter your openHAB username and password.
5. Continue into the dashboard.

## What To Expect

- Navet connects directly to the openHAB URL you provide.
- There is no separate cloud redirect step.
- Navet authenticates REST calls with Basic auth using the username and password you enter.
- Navet loads item state from the openHAB REST API and listens for updates over the openHAB
  WebSocket API at `/ws`.
- The URL is validated as an absolute URL before Navet saves the session.

## API Security Requirements

- If your openHAB instance disables the implicit LAN user role, Navet needs valid credentials for
  both REST and WebSocket access.
- openHAB REST Basic auth must be enabled under `Settings -> API Security`
  (`org.openhab.restauth`) for username/password login to work.
- If you have not enabled that setting yet, turn it on before trying to connect Navet.
- API token login is not exposed in the UI today.

## Troubleshooting

- Use the exact browser-reachable base URL for openHAB. If `http://openhab.local:8080` does not
  load from the same device that opens Navet, Navet will not be able to use it either.
- If openHAB sits behind a reverse proxy, enter the public URL exposed by that proxy rather than an
  internal-only hostname.
- Remove trailing-path guesses such as `/rest` or `/basicui`; Navet expects the server base URL and
  will call the REST and WebSocket endpoints itself.
- If Navet says the URL is invalid, make sure you entered a full absolute URL including `http://`
  or `https://`.
- If Navet reports an openHAB authentication failure, verify the username and password in openHAB
  and confirm Basic auth or API Security is enabled in `Settings -> API Security`.
