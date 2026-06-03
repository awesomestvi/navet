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

This is the recommended setup for Home Assistant users.

What to expect:

- the Home Assistant frontend session is reused
- there is no separate Navet login screen

Setup:

1. Add `https://github.com/awesomestvi/navet-hacs` as a custom HACS repository with category
   `Integration`.
2. Install `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Open Navet from the Home Assistant sidebar.

## Home Assistant Add-on

What to expect:

- Navet runs behind Home Assistant Ingress
- the Home Assistant frontend session is reused
- the direct host port is off by default
- Homey login can be enabled by setting `homey_client_id` and `homey_client_secret` in the add-on options
- openHAB connections are stored and proxied through the add-on runtime
- if you expose the app outside Ingress, Navet falls back to the standalone-style OAuth flow

Use this when you want Home Assistant to own installation, lifecycle, and sidebar access.

Setup:

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet`.
4. Install `Navet` for stable releases or `Navet Dev` for the development surface.

Migration note:

- If you previously added `https://github.com/awesomestvi/navet` to HACS, remove that custom
  repository and add `https://github.com/awesomestvi/navet-hacs` with category `Integration`.
- If you use the Home Assistant add-on repository, keep using
  `https://github.com/awesomestvi/navet`.

## Standalone Docker

Standalone Docker runs Navet as its own nginx-hosted app and persists state in `/data`.

What to expect:

- Home Assistant login uses OAuth
- dashboard/profile state is stored through same-origin runtime endpoints under `/data`

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

## Returning Users

Navet no longer uses manual Home Assistant long-lived token entry in normal use.

During startup, it clears old browser auth keys such as `ha_auth_config`, `ha-dashboard-config`,
and `navet-auth-config` so stale values do not keep steering the app.

Dashboard import is separate from authentication. If you want to restore an existing dashboard into
a fresh browser or a new `/data` volume, use an exported dashboard config together with
`dashboard_config_url` or `NAVET_DASHBOARD_CONFIG_URL`.

For release validation and rollback guidance, see
[release-workflow.md](release-workflow.md) and [rollback.md](rollback.md).
