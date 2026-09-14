---
title: Homey
description: Connect a standalone Navet installation to Homey.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/HOMEY.md
---

Use this guide to connect Navet to Homey in standalone mode.
The same OAuth client settings can enable Homey as an additional provider in the Home Assistant
App.

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

Open Navet and choose Homey, or choose **Connect** under Homey in **Settings -> System**
to add it to an existing dashboard. Sign in with your Athom account.

### 4. Sign in

1. Open Navet.
2. Choose `Homey` on the provider screen.
3. Continue to Athom sign-in.
4. Return to Navet after the OAuth redirect.
5. If your Athom account has more than one Homey, choose the one this dashboard should use.

## What To Expect

- Navet stores the Homey session through same-origin runtime endpoints in the Navet app.
- Homey devices and zones load after sign-in.
- Homey contributes rooms, lights, switches, fans, sensors, locks, covers, thermostats, speakers, people,
  and notifications to Navet.
- Lock cards show the device's locked or unlocked state. Lock and unlock actions use Homey's
  writable `locked` capability.
- Blinds, curtains, and sunshades use cover cards. Devices with a writable position capability
  support percentage adjustments and open/close actions. Movement-only devices offer their
  supported open, close, and stop controls. Stop is enabled only when Homey exposes that command;
  tilt controls are unavailable through this adapter.
- Thermostat cards show target and current temperatures, follow the device's temperature range,
  and support target changes and available operating modes. Speakers provide playback, volume,
  mute, and other controls when Homey exposes writable capabilities. Media browsing and speaker
  grouping are not available through this adapter.
- Manually runnable Flows and Advanced Flows, along with Moods, are available as scene cards.
- Under **Settings → System → Providers**, open Homey's menu and choose **Browse and manage**
  to view devices, zones, Flows, Moods, people, notifications, apps, your available Homeys, and
  Insights. Your Homey account name and email appear in provider details. Device controls
  follow Homey's writable capabilities. Favorite changes update the signed-in Homey user's
  favorite devices and Flows; these are separate from Navet's dashboard favorites.
- You can change your own presence and sleep status. Other household members are read-only.
- Insights can show the last 24 hours, 7 days, or 31 days. Device sensor history is available when
  Homey exposes a matching Insights log. This does not provide Home Assistant-style energy
  configuration or statistics.
- Hiding a Homey notification in Navet leaves the notification in Homey. App updates and hub
  restarts remain managed in Homey.
- Availability depends on your Homey version and the permissions granted to the OAuth client.
  An unavailable resource category shows an error while devices remain usable.
- Dedicated camera, calendar, weather, Assist, task, security, and provider room
  administration services are not registered for Homey.
- In a standalone installation, Homey can stay connected alongside Home Assistant or openHAB;
  selected providers are combined in shared dashboard collections.
- You do not need to enter a separate Homey base URL.
- If you sign out from Navet, the stored Homey session is cleared from the Navet side.

## Troubleshooting

- If the `Homey` option does not appear on the login screen, check that
  `NAVET_HOMEY_CLIENT_ID` and `NAVET_HOMEY_CLIENT_SECRET` are set in the running Navet container.
- If sign-in returns to the wrong URL, set `NAVET_HOMEY_REDIRECT_URI` to the exact callback URL
  registered in your Athom Web API client.
- If Navet keeps asking you to choose a Homey again, confirm the selected Homey is still available
  to the signed-in Athom account.
