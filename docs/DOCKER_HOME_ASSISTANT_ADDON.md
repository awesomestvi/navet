# Docker and Home Assistant Add-on

This guide documents the implemented packaging for Navet as:

- A Home Assistant custom panel integration installable through HACS
- A standalone Docker container
- A Home Assistant add-on with Ingress

## Current Status

Navet is currently a Vite-built single-page app with runtime-specific authentication:

- HACS/custom panel uses the Home Assistant frontend `hass` session.
- Home Assistant add-on Ingress uses the existing Home Assistant frontend session and an
  ingress-aware same-origin proxy.
- Standalone Docker uses Home Assistant OAuth authorization-code login.

This means:

- A native Home Assistant custom panel is supported through the `custom_components/navet`
  integration
- Docker is straightforward today
- A Home Assistant add-on is supported today
- Runtime config works without rebuilding the image

For Home Assistant OS and Supervised users, the HACS custom panel path is the recommended
Home Assistant-native setup. The add-on remains supported for users who specifically want a
separately hosted Navet instance through Ingress or direct port access. Existing add-on users can
switch to the custom panel when they want the normal Home Assistant sidebar panel experience.

## Returning Users: OAuth and Removed Token Options

Navet no longer uses manually entered Home Assistant long-lived access tokens in the default
Docker, add-on, or development flows. The legacy browser auth entries `ha_auth_config`,
`ha-dashboard-config`, `navet-auth-config`, and `navet_auth_session` are removed during auth
initialization so stale URLs or tokens do not keep controlling the app.

Expected behavior after updating:

- Custom panel users stay inside Home Assistant and use the injected Home Assistant frontend
  session. No separate Navet login is shown.
- Add-on users who open Navet through Ingress use the authenticated Home Assistant Ingress session.
  Existing saved `hass_url` and `token` add-on values are tolerated during upgrade but ignored.
- Add-on users who open direct port `8099`, and standalone Docker users, sign in once through Home
  Assistant OAuth. Navet asks for the Home Assistant root URL, redirects to Home Assistant for
  approval, then stores the OAuth token bundle behind the same-origin `__navet_auth__` endpoint
  backed by `/data`.

Dashboard configuration is not the same thing as Home Assistant auth. Existing local dashboard
layout keys are still local browser data, and Docker/add-on shared profile sync persists the current
dashboard profile under `/data`. If a returning user moves to a new browser, WebView, or data
volume, they should export their Navet dashboard config before updating and restore it with
`dashboard_config_url`, `NAVET_DASHBOARD_CONFIG_URL`, or the first-run import flow.

The custom panel deployment path is:

1. Install the Navet integration through HACS or by copying `custom_components/navet`
2. Restart Home Assistant
3. Add the Navet integration from Settings -> Devices & services
4. Open the Navet sidebar panel at `/navet`

The Docker and add-on runtime model is:

1. CI builds the Vite app into static assets
2. The published container image serves those assets with `nginx`
3. The entrypoint generates `/config.js` for optional dashboard/profile metadata
4. The runtime is exposed directly or through Home Assistant Ingress depending on the deployment surface

For local Docker packaging validation before deploying, run:

```bash
pnpm check:docker
```

This builds the standalone image and runs `nginx -t` through the real container entrypoint so
generated `njs` and nginx config issues fail locally instead of after the container boots.

## Option 1: Home Assistant Custom Panel

### HACS Install Flow

1. In HACS, open the three-dot menu and choose **Custom repositories**.
2. Add `https://github.com/awesomestvi/navet` with category **Integration**.
3. Download **Navet**.
4. Restart Home Assistant.
5. Add **Navet** from **Settings -> Devices & services -> Add integration**.
6. Open **Navet** from the Home Assistant sidebar.

### Current Behavior

The integration:

- Registers a Home Assistant custom panel at `/navet`
- Serves bundled static assets from `/api/navet/static/`
- Loads `navet-panel.js` as the panel module
- Ships local Home Assistant brand assets from `custom_components/navet/brand/`
- Uses the current Home Assistant frontend session through the injected `hass` object, so the
  Navet login page is not shown in the custom panel.

## Option 2: Standalone Docker

### Files in This Repo

- `Dockerfile`
- `docker/nginx.main.conf`
- `docker/nginx.conf`
- `docker/njs/rss-proxy.js`
- `docker/config.js.template`
- `docker/30-navet-config.sh`
- `docker-compose.yml`
- `.github/workflows/publish.yml`

### Runtime Environment Variables

The production container writes `/config.js` from optional runtime metadata:

- `NAVET_HASS_URL`
- `NAVET_DASHBOARD_CONFIG_URL`

Standalone Docker tries to suggest the Home Assistant base URL from `NAVET_HASS_URL` or common local
hostnames, then lets the user edit it before completing the Home Assistant OAuth authorization-code
flow. Long-lived tokens are not part of the default Docker setup.
If `NAVET_DASHBOARD_CONFIG_URL` is set, a fresh browser imports that Navet dashboard YAML export
before showing onboarding.

Direct RSS URLs also flow through the same-origin `/__navet_rss_proxy__` path. nginx handles those
requests directly through its embedded `njs` runtime so the browser avoids CORS issues without a
separate Node process in the runtime image.
OAuth/profile sync uses same-origin njs endpoints and stores shared state under `/data`:

- `/__navet_auth__/session` stores the Home Assistant OAuth token bundle for this Navet instance
- `/__navet_profile__/default` stores the shared dashboard profile

### Local Run Example

```bash
cp .env.example .env
# optional: set NAVET_DASHBOARD_CONFIG_URL

docker compose up --build -d
```

Then open `http://localhost:8080`.

`docker-compose.yml` builds the image from this repository (`Dockerfile`) and tags it as
`navet:local`. Compose also loads optional runtime variables from a repo-root `.env` file via
`env_file`.

Standalone container builds disable the bundled `/demo` experience by default with
`NAVET_ENABLE_DEMO=false` so the image does not ship the large demo screenshots and sample media.
Normal non-Docker builds still keep the public demo enabled unless you explicitly override that
flag.

### Release Pipeline

The GitHub Actions publish workflow publishes multi-arch app images to GitHub Container Registry:

- pushes to `main`: `ghcr.io/<owner>/navet:dev` and `ghcr.io/<owner>/navet:sha-<commit>`
- version tags (`v*`): exact tag, `beta`, `latest`, and `sha-*`
- manual workflow runs: the requested developer tag, defaulting to `dev`, plus `sha-*`

`latest` is the current public release compatibility tag for the standalone app image. It is updated
by version tags, not by ordinary `main` pushes.

### GHCR Deployment

If the published GHCR image is public, deployment hosts can pull it directly:

```bash
docker pull ghcr.io/<owner>/navet:latest
```

If you publish the image from a fork or private registry, use the matching owner and registry
authentication policy for that environment.

## Option 3: Optional Home Assistant Add-on

Use this option when you specifically want Navet hosted as a Home Assistant add-on with Ingress.
For the normal Home Assistant sidebar panel experience, use the HACS custom panel integration
instead. New Home Assistant OS and Supervised installs should prefer the custom panel for the
simplest Home Assistant-native setup. Optional direct port access can be enabled manually when you
need standalone OAuth behavior.

### Files in This Repo

- `repository.yaml`
- `addons/navet/config.yaml`
- `addons/navet-dev/config.yaml`
- `addons/navet/Dockerfile`
- `addons/navet/run.sh`
- `addons/navet/rootfs/etc/nginx/nginx.conf`
- `addons/navet/rootfs/etc/nginx/http.d/default.conf`
- `docker/njs/rss-proxy.js`
- `addons/navet/CHANGELOG.md`
- `addons/navet/icon.png`
- `addons/navet/logo.png`
- `addons/navet/README.md`
- `addons/navet-dev/README.md`
- `.github/workflows/publish-addon.yml`

### Current Behavior

The add-on:

- Pulls a prebuilt add-on image from GHCR
- Builds that image from repo root in CI
- Serves Navet with `nginx`
- Handles direct RSS proxy requests through nginx `njs`
- Uses `ingress: true`
- Keeps direct browser access optional; host port `8099` is disabled by default to avoid Ingress
  start loops from port conflicts
- Generates `/config.js` for optional dashboard import metadata
- Uses Home Assistant Ingress authentication; no add-on URL/token fields are required
- Proxies Home Assistant API and WebSocket requests through `/__navet_ha_proxy__/`
- Optionally imports a shared dashboard YAML export on first launch

When direct port access is enabled manually, the add-on behaves like the standalone container for
auth: the user enters the Home Assistant root URL and completes the OAuth authorization-code flow.

The repository also includes **Navet Dev**, a separate add-on entry with slug `navet_dev`. It uses
the same published add-on image name as the regular add-on, but sets `version: "dev"` so Home
Assistant pulls `ghcr.io/awesomestvi/{arch}-navet-addon:dev`.

### Add-on Options

- `dashboard_config_url`: optional Navet dashboard YAML export to import on first launch.

### Local Add-on Development

Typical flow:

1. Push changes to the repository
2. Merge or push to `main`, or manually run **Publish Home Assistant Add-on**, and wait for it to publish the `dev` image
3. In Home Assistant, open Settings -> Add-ons -> Add-on Store
4. Refresh the custom add-on repository
5. Open the `Navet Dev` add-on
6. Optionally set `dashboard_config_url`
7. Install, rebuild, or reinstall the add-on image for the current `dev` tag
8. Open Navet through the Ingress panel entry

### Update Flow

For Home Assistant add-on updates:

1. Update files in this repo
2. Bump `addons/navet/config.yaml` version
3. Merge to `main` and wait for the workflow to publish the `dev` add-on image for testing
4. Push a version tag and wait for the workflow to publish the matching add-on image tag
5. Refresh the add-on repository in Home Assistant
6. Rebuild or reinstall the add-on

For standalone Docker users:

1. Push changes to `main` or run the `Publish` workflow manually
2. Pull the updated image from GHCR on your deployment host
3. Restart the container (for example `docker compose up -d` if your deployment compose file references the GHCR image tag)

## Runtime Auth Resolution

The app resolves Home Assistant authentication by runtime:

1. Custom panel: Home Assistant frontend `hass` session
2. Add-on Ingress: Home Assistant Ingress/frontend session
3. Standalone Docker/direct port: OAuth authorization-code flow

## Shared Dashboard Profile

Docker and Home Assistant add-on deployments expose same-origin OAuth/profile endpoints:

- `GET /__navet_auth__/session`
- `PUT /__navet_auth__/session`
- `DELETE /__navet_auth__/session`
- `GET /__navet_profile__/default`
- `PUT /__navet_profile__/default`

The frontend imports the shared profile on authenticated startup when it is newer than the local
profile, then saves completed dashboard changes back every few seconds. This lets a dashboard created
in one browser become available in another browser or Home Assistant companion-app WebView.

Standalone Docker deployments should mount `/data` to keep the profile across container recreates.
The included `docker-compose.yml` uses a named `navet-data` volume for this.

## Current Performance Work

The current dashboard build includes a few runtime-focused optimizations:

- Lazy-loaded settings, add-card dialog, widgets, and media dialog
- Deferred rendering for offscreen room groups in the All view
- Zustand-backed search result state to reduce context fan-out
- Stable device-map reuse to avoid rerendering unchanged cards
- Drag reordering uses local state during a drag; the global store is written once on drop, eliminating per-event re-renders and localStorage writes
- Onboarding-based dashboard visibility with add/remove entity curation
- Local dashboard config YAML export/import for layout and preference backup, including first-run import from onboarding
- Configurable entity card interaction styles with a live preview in Settings
- Optional lower visual quality for slower devices such as Raspberry Pi deployments

## CI Pipeline

The CI workflow runs on all branch pushes and pull requests. It currently:

1. Installs dependencies with the pinned `pnpm`
2. Runs `pnpm check`
3. Runs `pnpm check:stories`
4. Runs `pnpm check:ui-kit`
5. Runs `pnpm typecheck`
6. Runs `pnpm test`
7. Runs `pnpm build`

## Public Release Notes

- Keep Docker and add-on image tags aligned with `package.json` and `addons/navet/config.yaml`
- Keep the HACS/custom panel manifest version aligned with `package.json` for tagged releases
- Prefer documented release tags for public users over asking them to track `main`
- Keep token-based login out of Docker and add-on default flows

## Notes Specific to This Repo

- `vite.config.ts` controls the local development host and port
- A local hostname such as `navet.local` may require a hosts-file entry
- Local development host settings do not affect Docker packaging
- `index.html` now loads `/config.js` before the app bootstraps
- Home Assistant OAuth credentials are persisted through the same-origin auth endpoint
- Dashboard config export/import intentionally excludes connection URL and auth data
- Development builds log slow dashboard renders with `[Navet][RenderProfiler]`
