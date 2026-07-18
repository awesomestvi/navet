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
- Homey is implemented through the cloud OAuth flow; standalone uses environment variables and the
  Home Assistant add-on exposes corresponding optional client settings
- openHAB is implemented through the base-URL and username/password flow and can be added from
  provider management when the browser can reach the server
- Hubitat and SmartThings are planned provider packages with contract + registration entries, but full runtime support is not implemented yet
- standalone auth state can retain multiple implemented provider sessions; selected provider
  collections may be aggregated while one provider remains active for single-provider operations

## Rules

- keep auth and runtime orchestration in `packages/app/src/auth/` and provider runtime registrations
- keep deployment-specific URL rewriting out of feature components
- preserve same-origin session and proxy constraints for standalone and add-on flows
- keep Home Assistant-specific runtime assumptions inside Home Assistant-owned seams
- do not reintroduce manual token-entry login paths
- Home Assistant Ingress must reuse the parent `hass` runtime bridge instead of opening a second Home Assistant websocket

## Current Repo Areas

- `packages/app/src/auth/`
- `packages/app/src/infrastructure/home-assistant/`
- `packages/app/src/runtime/`
- `packages/provider-homeassistant/`
- `packages/provider-homey/`
- `packages/provider-openhab/`
- `docker/`
- `platform/home-assistant/addons/`

## Follow-Through

If auth or deployment behavior changes, update:

- `README.md`
- `docs/HOME_ASSISTANT.md`
- relevant add-on or custom-component docs
