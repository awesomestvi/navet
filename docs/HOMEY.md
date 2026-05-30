# Homey Setup

This guide is for Navet users connecting to Homey.

## Before You Start

You need:

- a running standalone Navet app
- a Homey Cloud app/client from Athom
- the client ID and client secret for that app

## Get Your Homey Client ID And Secret

Homey’s official Web API docs say you need to create your own Web API client to receive a client
ID and client secret.

Start here:

- [Homey Developer Tools](https://tools.developer.homey.app/)
- [Homey Web API documentation](https://api.developer.homey.app/)

Typical flow:

1. Sign in to the Homey Developer Tools with the Athom account you want to use for Navet.
2. Create a new Web API client.
3. Set the client name to something recognizable such as `Navet`.
4. Set the redirect URL to the public Navet URL that will receive the OAuth callback.
   Example: `http://localhost:8080` for a local Docker test, or `https://navet.example.com` for a hosted deployment.
5. Save the client.
6. Copy the generated client ID and client secret into your Navet Docker compose file as
   `NAVET_HOMEY_CLIENT_ID` and `NAVET_HOMEY_CLIENT_SECRET`.

Use the same public Navet URL for `NAVET_HOMEY_REDIRECT_URI` when you need to override Navet’s
automatic callback detection.

`docker-compose.yaml`

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
      NAVET_HOMEY_REDIRECT_URI: https://your-navet-url.example.com

volumes:
  navet-data:
```
Use `NAVET_HOMEY_REDIRECT_URI` only when Navet cannot infer the public callback URL correctly, for
example when it sits behind a reverse proxy or the public URL differs from the browser origin users
open.

Then run:

```bash
docker compose up -d
```

## Login Flow

1. Open Navet.
2. Choose `Homey` on the provider screen.
3. Continue to Athom sign-in.
4. Return to Navet after the OAuth redirect.
5. If your Athom account has more than one Homey, choose the one this dashboard should use.

## What To Expect

- Navet stores the Homey session through same-origin runtime endpoints in the Navet app.
- Homey devices and zones load after sign-in; no separate Homey URL entry is required.
- If you sign out from Navet, the stored Homey session is cleared from the Navet side.

## Troubleshooting

- If the `Homey` option does not appear on the login screen, check that
  `NAVET_HOMEY_CLIENT_ID` and `NAVET_HOMEY_CLIENT_SECRET` are set in the running Navet container.
- If sign-in returns to the wrong URL, set `NAVET_HOMEY_REDIRECT_URI` to the exact public Navet
  URL users open in the browser.
- If Navet keeps asking you to choose a Homey again, confirm the selected Homey is still available
  to the signed-in Athom account.
