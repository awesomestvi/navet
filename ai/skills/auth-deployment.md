# Auth And Deployment

Read this file before changing auth, runtime detection, proxy behavior, session persistence, or
deployment-mode handling.

## Supported Runtime Surfaces

Current runtime surfaces:

- Home Assistant custom panel
- Home Assistant add-on through Ingress
- standalone Docker or hosted standalone app
- localhost development

Current provider reality:

- Home Assistant is implemented across panel, add-on, and standalone flows
- Homey is implemented through the standalone runtime path
- openHAB remains planned

## Rules

- keep auth and runtime ownership in `src/auth/` and provider-specific infrastructure seams
- do not reintroduce manual token-entry login paths
- do not push deployment-specific URL rewriting into feature components
- preserve same-origin session and proxy constraints for standalone Docker and add-on flows
- keep Home Assistant-specific runtime assumptions inside the Home Assistant adapter boundary

## Current Repo Areas

- `src/auth/`
- `src/app/infrastructure/home-assistant/auth/`
- `src/app/infrastructure/home-assistant/runtime/`
- `src/app/runtime/`
- `docker/`
- `addons/`

## Required Follow-Through

Auth or runtime changes should update tests and the relevant deployment docs in `README.md`,
`docs/DOCKER_HOME_ASSISTANT_ADDON.md`, and add-on or custom-component READMEs when behavior changed.
