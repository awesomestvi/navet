# Deployment Guide

This guide is for Home Assistant users.

Navet has three Home Assistant deployment paths:

- Home Assistant custom panel
- Home Assistant add-on
- standalone Docker connected to Home Assistant

Use the custom panel if you want the cleanest Home Assistant-native experience. Use the add-on if
you specifically want Navet packaged and managed as an add-on. Use standalone Docker when you want
Navet to run as its own app while still connecting to Home Assistant.

## Home Assistant Custom Panel

This is the recommended setup for Home Assistant users who want Navet in the Home Assistant
sidebar through HACS.

Setup:

1. Add `https://github.com/awesomestvi/navet-hacs` as a custom HACS repository with category
   `Integration`.
2. Install `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Open Navet from the Home Assistant sidebar.

Migration note:

- If you previously added `https://github.com/awesomestvi/navet` to HACS, remove that custom
  repository and add `https://github.com/awesomestvi/navet-hacs` with category `Integration`.

## Home Assistant Add-on

What to expect:

- Navet runs behind Home Assistant Ingress
- the Home Assistant frontend session is reused through the parent `hass` runtime bridge
- Navet does not open its own Home Assistant websocket while running inside Ingress
- the direct host port is off by default
- if you expose the app outside Ingress, Navet falls back to the standalone-style OAuth flow


Setup:

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet` as an Add-on Store repository.
4. Install `Navet` for stable releases or `Navet Dev` for the development surface.
5. Start the add-on and open Navet from the Home Assistant sidebar.

## Standalone Docker


What to expect:

- Home Assistant login uses OAuth
- dashboard/profile state is stored through same-origin runtime endpoints under `/data`
- if the stored OAuth session becomes invalid during token refresh, Navet clears it and returns to login

Troubleshooting:

- if Navet repeatedly returns to login, verify that the saved Home Assistant URL still matches your current instance URL
- if you recently changed reverse-proxy, TLS, hostname, or port settings for Home Assistant, sign in again so Navet can obtain a fresh OAuth session
- if the Home Assistant authorization was revoked or the refresh token became invalid, sign in again to recreate the stored session under `/data`

Example `docker-compose.yml`:

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

Start it with:

```bash
docker compose up -d
```

Then open `http://localhost:8080`.
