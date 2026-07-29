---
title: Navet Dev
description: Install and update development builds through Home Assistant, Docker, or a manual panel build.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/NAVET_DEV.md
---

Navet Dev is the frequently updated development channel for testing changes before a stable
release. It can contain unfinished features and regressions. Keep a Home Assistant backup and a
copy of important Navet dashboard configuration before switching to it.

## Choose An Installation

| Installation | Published Dev channel | Best for |
|---|---|---|
| HACS custom panel | No | Stable, Home Assistant-hosted Navet |
| Home Assistant add-on | Yes: main-backed `Navet Dev` | Easiest Home Assistant development build |
| Standalone Docker | Yes: `dev`, `edge`, and exact branch versions | Independent app, testing, and rollback control |

Navet Dev publishes update the add-on and Docker images. They intentionally do not publish HACS
updates. If you need the current development build inside the Home Assistant custom panel, use the
advanced manual build below or choose the `Navet Dev` add-on instead.

Every named clean branch can publish an immutable exact Dev version. Only a publish sourced from
`main` advances the moving `dev` and `edge` tags or the Home Assistant Add-on Store metadata.

## Home Assistant Add-on

This is the recommended development installation for Home Assistant OS and Supervised users.

### Requirements

- Home Assistant with add-on support
- an `amd64` or `aarch64` system

### Install

1. In Home Assistant, open `Settings -> Add-ons -> Add-on Store`.
2. Open the store menu, choose `Repositories`, and add:

   ```text
   https://github.com/awesomestvi/navet
   ```

3. Reload the Add-on Store if the repository does not appear immediately.
4. Open `Navet Dev` and select `Install`.
5. Start the add-on.
6. Enable `Show in sidebar`, or select `Open Web UI`.

The add-on runs through Home Assistant Ingress and reuses the authenticated parent Home Assistant
session. It does not need a Home Assistant URL or long-lived access token in normal Ingress use.

The add-on is Ingress-only so its trusted Home Assistant user headers are never exposed on a
directly reachable port. Use the standalone Docker app when testing the direct-access OAuth flow.

To test Homey as an additional provider, set the add-on's `homey_client_id`,
`homey_client_secret`, and optional `homey_redirect_uri` options, restart it, then connect Homey in
**Settings -> System**. openHAB can be added there with its browser-reachable URL and credentials.

### Update

Each main-backed Navet Dev publish advances the version in the add-on repository. Home Assistant
will show an update when it refreshes that repository. An exact publish from another branch is not
offered by the Add-on Store until matching metadata lands on `main`.

1. Open `Settings -> Add-ons -> Navet Dev`.
2. Create a Home Assistant backup if the update is important to your setup.
3. Select `Update`, then restart the add-on.

If an update is not visible, reload the Add-on Store and check for updates again.

### Optional Home Assistant Chrome Hiding

The add-on cannot install Home Assistant frontend modules by itself. To let Navet hide the native
Home Assistant header and sidebar, also install the stable Navet HACS integration and add this to
`configuration.yaml`:

```yaml
frontend:
  extra_module_url:
    - /api/navet/static/navet-ha-shell.js
```

Restart Home Assistant after changing `configuration.yaml`. The shell module is supplied by the
HACS integration; the dashboard itself can still come from the `Navet Dev` add-on.

## Standalone Docker

The moving `dev` and `edge` tags point to the latest Navet Dev publication sourced from `main`. Use
`dev` unless you already standardize on `edge`. A publish from another branch is available only
through its exact immutable version.

### Requirements

- Docker with Compose support
- the credentials and browser-reachable URL required by the provider you want to test

### Install

Create `compose.yaml`:

```yaml
services:
  navet-dev:
    image: ghcr.io/awesomestvi/navet:dev
    container_name: navet-dev
    restart: unless-stopped
    ports:
      - "8081:80"
    environment:
      # Optional Home Assistant discovery hint.
      NAVET_HASS_URL: "http://homeassistant.local:8123"
      # Optional Homey OAuth client settings.
      NAVET_HOMEY_CLIENT_ID: "your-athom-client-id"
      NAVET_HOMEY_CLIENT_SECRET: "your-athom-client-secret"
    volumes:
      - navet-dev-data:/data

volumes:
  navet-dev-data:
```

Remove any environment variables for providers you are not testing. For Home Assistant, change
`NAVET_HASS_URL` to the browser-reachable instance URL or omit it and use first-run discovery. For
Homey, register the exact callback URL described in the [Homey guide](/install/homey/). openHAB
needs no container environment variable; choose it in Navet and enter its base URL and credentials.
Do not use a container-only hostname unless the browser can also resolve it.

Start Navet Dev:

```bash
docker compose up -d
```

Open `http://localhost:8081` and complete the provider login. Port `8081` lets this Dev
container run alongside a stable Navet container using port `8080`. Navet stores OAuth and dashboard
profile state in the `/data` volume.

### Update

```bash
docker compose pull
docker compose up -d
```

The named volume remains in place when the container is replaced.

### Pin Or Roll Back

Moving tags change with every main-backed Dev publish. For reproducible installations or testing a
non-main branch publish, replace `dev` with an exact version from a `navet-dev-*` GitHub prerelease,
for example:

```yaml
image: ghcr.io/awesomestvi/navet:0.8.0-dev.YYYYMMDDHHMMSS
```

Use a real published version in place of the example timestamp, then run:

```bash
docker compose pull
docker compose up -d
```

To return to stable Docker, change the image tag to `latest`.

The GitHub prerelease identifies the source branch and commit. Confirm those values before using an
exact branch build on a household dashboard.

## HACS Custom Panel

HACS installs the stable Navet custom-panel release from
`https://github.com/awesomestvi/navet-hacs`. The Navet Dev publish workflow does not update that
repository, so there is no supported `Navet Dev` HACS channel.

For the supported stable installation:

1. Add `https://github.com/awesomestvi/navet-hacs` to HACS as an `Integration` custom repository.
2. Install `Navet`.
3. Restart Home Assistant.
4. Add `Navet` from `Settings -> Devices & services`.

Do not add the main `awesomestvi/navet` monorepo to HACS. Its root is an add-on repository, not a
publishable HACS integration repository.

### Advanced: Build The Current Custom Panel Source

This path is for contributors who specifically need current source inside the Home Assistant custom
panel. It is a manual custom integration installation and will not be managed or updated by HACS.

Requirements:

- Git
- Node.js `^20.19.0` or `>=22.12.0`
- pnpm 11 through the repository's pinned package manager
- access to the Home Assistant `/config` directory

On a development machine:

```bash
git clone https://github.com/awesomestvi/navet.git
cd navet
corepack enable
pnpm install
pnpm build:ha-panel
```

Then:

1. Stop Home Assistant and back up any existing `/config/custom_components/navet` directory.
2. Copy the contents of `platform/home-assistant/custom_components/navet/` into
   `/config/custom_components/navet/`.
3. Start Home Assistant.
4. Add or reload `Navet` from `Settings -> Devices & services`.
5. Hard-refresh the browser if it still has an older panel bundle cached.

Repeat the build and copy steps to update. Installing or redownloading Navet from HACS can replace
this manual build with the latest stable release.

## Return To Stable

- Add-on: stop `Navet Dev`, install or start the stable `Navet` add-on, and verify its configuration.
- Docker: change `ghcr.io/awesomestvi/navet:dev` to `ghcr.io/awesomestvi/navet:latest`.
- Custom panel: install or redownload Navet from the `awesomestvi/navet-hacs` repository and restart
  Home Assistant.

Development and stable installations may not share the same storage location. Export important
dashboard configuration before switching rather than assuming it will appear in the other runtime.

## Troubleshooting

- Add-on missing: verify the main repository URL was added to the Add-on Store, then reload it.
- Exact branch release missing from the Add-on Store: this is expected until its metadata lands on
  `main`; use the exact standalone Docker image to test it.
- Docker cannot find Home Assistant: confirm `NAVET_HASS_URL` is reachable from both the browser and
  the Navet container; avoid `localhost` when Home Assistant runs on another host.
- OAuth loops after changing hostnames, TLS, reverse proxies, or ports: sign in again so Navet can
  create a session for the current Home Assistant URL.
- Custom panel still shows an older build: restart Home Assistant and hard-refresh the browser.
- HACS offers only stable versions: this is expected; use the add-on or Docker for published Dev
  builds.

For stable Home Assistant setup and runtime details, see the [Home Assistant guide](/install/home-assistant/).
