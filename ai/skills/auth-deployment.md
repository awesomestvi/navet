# Auth And Deployment

Read this file before changing auth, runtime detection, proxying, session handling, or deployment-specific behavior.

## Supported Modes

Navet must deliberately support:

- HACS custom panel
- Home Assistant add-on ingress
- standalone Docker
- localhost development

These modes must stay supported through the same core auth model, not through scattered one-off UI hacks.

## Architecture Rules

- Avoid separate hacks for each mode.
- Prefer one clean authentication abstraction over per-mode branching scattered through the UI.
- Do not reintroduce fragile long-lived-token flows unless a specific mode truly requires them.
- Do not break existing users without a migration path.
- Keep auth decisions in runtime, adapter, and infrastructure layers, not random feature components.
- Do not make components decide which deployment mode they are in unless the UI itself must visibly differ.

## Required Auth Coverage

Handle and test:

- Home Assistant auth
- OAuth or code flow where applicable
- WebSocket authentication
- ingress base paths
- relative URLs
- external Home Assistant URLs
- invalid tokens
- expired tokens
- logout and localStorage cleanup

Also verify:

- same-origin auth session storage for standalone Docker
- Home Assistant frontend token reuse for ingress when available
- panel mode without separate token bootstrap
- reconnect behavior after auth failure

## Change Policy

- Any auth change must include tests for every supported deployment mode.
- Runtime handling must preserve panel, ingress, Docker, and localhost behavior.
- Keep same-origin proxy and session behavior consistent with deployment constraints instead of special-casing UI components.

## What Not To Do

- Do not reintroduce manual token-entry login forms.
- Do not place access or refresh tokens in runtime config, bundled assets, or imported dashboard data.
- Do not add new auth flows directly in `LoginPage` without going through `src/auth/` and the auth session manager.
- Do not add deployment-specific URL rewriting inside feature components when it belongs in runtime or resource helpers.
- Do not assume `/api/websocket` auth behavior is identical across panel, ingress, and Docker.

## Known Navet Failure Modes To Guard Against

- reintroducing token-based login paths that the repo already removed
- leaking OAuth session data into frontend config or localStorage in the wrong mode
- breaking ingress base-path handling when adding standalone fixes
- fixing one mode by bypassing the shared auth abstraction
- leaving stale auth data behind on logout or malformed callback handling

## Required Routing

For changes in these areas, read this file first:

- `src/auth/adapters/`
- `src/auth/runtime.ts`
- `src/auth/homeAssistantDiscovery.ts`
- `src/app/infrastructure/home-assistant/auth/`
- `src/app/infrastructure/home-assistant/runtime/`
- `vite.config.ts`
- `docker/`
- `addons/`

If the change also touches media, camera, `entity_picture`, RSS, or proxied resources, also read `ai/skills/external-resources.md`.

## Relevant Repo Areas

- Auth adapters: `src/auth/adapters/`
- Auth runtime and discovery: `src/auth/`
- Session manager: `src/app/infrastructure/home-assistant/auth/`
- Runtime detection: `src/app/infrastructure/home-assistant/runtime/`
- Proxy and deployment config: `docker/`, `vite.config.ts`, `addons/`
- Security and proxy constraints: `docs/PUBLIC_LAUNCH_SECURITY.md`
