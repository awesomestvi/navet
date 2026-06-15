# Homey

Use this guide when you want Navet to connect to Homey in standalone mode.

## Overview

Navet uses the Homey cloud OAuth flow. You run Navet yourself, configure an Athom Web API client,
and sign in through the provider picker.

## When To Choose This Path

Choose this path when:

- you want Navet in standalone mode
- you use Homey as the provider
- you are comfortable creating an Athom Web API client

## Prerequisites

You need:

- a Homey Cloud app or client from Athom
- the generated client ID and client secret for that app

Start here:

- [Homey Developer Tools](https://tools.developer.homey.app/)
- [Homey Web API documentation](https://api.developer.homey.app/)

## Setup Steps

### 1. Create the Homey API client

1. Sign in to the Homey Developer Tools with the Athom account you want to use for Navet.
2. Create a new Web API client.
3. Set the client name to something recognizable such as `Navet`.
4. Set the redirect URL to the exact Navet callback URL that should receive the OAuth callback.
   Example: `http://localhost:8080/__navet_homey__/callback` for local Docker,
   `https://navet.example.com/__navet_homey__/callback` for a hosted deployment.
5. Save the client.
6. Copy the generated client ID and client secret.

### 2. Configure Navet

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
    environment:
      NAVET_HOMEY_CLIENT_ID: your-athom-client-id
      NAVET_HOMEY_CLIENT_SECRET: your-athom-client-secret
      # Optional: set this only if Navet cannot infer the public callback URL correctly.
      NAVET_HOMEY_REDIRECT_URI: https://your-navet-url.example.com/__navet_homey__/callback

volumes:
  navet-data:
```

Set `NAVET_HOMEY_REDIRECT_URI` only when Navet cannot infer the public callback URL correctly,
such as when Navet sits behind a reverse proxy or the public callback URL differs from the browser
origin users open. Navet also supports a custom callback path if you register a different exact URL
with Athom, such as `https://navet.example.com/callback`.

### 3. Start Navet

```bash
docker compose up -d
```

### 4. Sign in

1. Open Navet.
2. Choose `Homey` on the provider screen.
3. Continue to Athom sign-in.
4. Return to Navet after the OAuth redirect.
5. If your Athom account has more than one Homey, choose the one this dashboard should use.

## What To Expect

- Navet stores the Homey session through same-origin runtime endpoints in the Navet app.
- Homey devices and zones load after sign-in.
- You do not need to enter a separate Homey base URL.
- If you sign out from Navet, the stored Homey session is cleared from the Navet side.

## Troubleshooting

- If the `Homey` option does not appear on the login screen, check that
  `NAVET_HOMEY_CLIENT_ID` and `NAVET_HOMEY_CLIENT_SECRET` are set in the running Navet container.
- If sign-in returns to the wrong URL, set `NAVET_HOMEY_REDIRECT_URI` to the exact callback URL
  registered in your Athom Web API client.
- If Navet keeps asking you to choose a Homey again, confirm the selected Homey is still available
  to the signed-in Athom account.
