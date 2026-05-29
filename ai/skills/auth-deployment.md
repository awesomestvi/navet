# Auth And Deployment

Read this before changing auth, runtime detection, proxy behavior, session persistence, or
deployment-mode handling.

## Runtime Surfaces

Navet currently runs in:

- Home Assistant custom panel
- Home Assistant add-on through Ingress
- standalone Docker or hosted standalone mode
- localhost development

## Provider Reality

- Home Assistant is implemented across panel, add-on, and standalone flows
- Homey is implemented through the standalone cloud OAuth flow
- openHAB is implemented through the standalone URL-session flow
- Hubitat and SmartThings have scaffolding, but they are not available runtime providers yet

## Rules

- keep auth and runtime orchestration in `src/auth/` and provider runtime registrations
- keep deployment-specific URL rewriting out of feature components
- preserve same-origin session and proxy constraints for standalone and add-on flows
- keep Home Assistant-specific runtime assumptions inside Home Assistant-owned seams
- do not reintroduce manual token-entry login paths

## Current Repo Areas

- `src/auth/`
- `src/app/infrastructure/home-assistant/`
- `src/app/runtime/`
- `src/providers/homeassistant/`
- `src/providers/homey/`
- `src/providers/openhab/`
- `packages/provider-homeassistant/`
- `packages/provider-homey/`
- `packages/provider-openhab/`
- `docker/`
- `addons/`

## Follow-Through

If auth or deployment behavior changes, update:

- `README.md`
- `docs/DOCKER_HOME_ASSISTANT_ADDON.md`
- relevant add-on or custom-component docs
