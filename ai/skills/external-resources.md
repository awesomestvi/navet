# External Resources

Read this file before changing any camera, artwork, image, stream, RSS, proxy, or authenticated resource handling.

## Applies To

- camera feeds
- camera snapshots
- album artwork
- media player images
- `entity_picture`
- RSS images
- proxied URLs
- Home Assistant media URLs
- any external or authenticated resource

## Core Rules

- Do not assume absolute URLs work.
- Do not assume the browser can access Home Assistant internal URLs directly.
- Handle ingress, add-on, standalone Docker, and localhost.
- Keep backend-specific resource rewriting and auth handling inside adapter-owned resolvers and helpers.
- Prefer Home Assistant-supported proxy or resource APIs when possible.
- Route URL rewriting through shared resolver or URL helpers, not ad hoc string manipulation inside cards.
- Treat any resource URL as potentially authenticated, signed, expired, ingress-prefixed, or same-origin sensitive.

## Required Considerations

Always consider:

- `/api/camera_proxy`
- `media_source` URLs
- authenticated resources
- CORS
- reverse-proxy base paths
- cache busting
- expired URLs
- broken images
- fallback UI

Also consider:

- stale `__navet_ha_proxy__` URLs that must be stripped or regenerated
- panel same-origin behavior
- Docker same-origin proxy behavior
- query-string signatures such as `authSig`
- object URL fallback and cleanup when fetching authenticated images
- RSS proxy host and content restrictions

## Required Test Coverage

Add or preserve tests for:

- relative URLs
- absolute URLs
- authenticated URLs
- missing URLs
- expired or broken URLs
- ingress-prefixed URLs
- external URLs blocked by CORS

If the code fetches or renders media directly, also cover:

- signed Home Assistant URLs
- stale proxy URL cleanup
- panel mode same-origin behavior
- Docker proxy behavior
- fallback UI when fetch returns non-image content or fails

## What Not To Do

- Do not concatenate Home Assistant URLs manually inside feature components when the resolver already owns that behavior.
- Do not bypass URL sanitization helpers for `img`, `video`, or link targets.
- Do not assume `entity_picture` is always safe to pass directly to the browser.
- Do not turn RSS or Home Assistant proxy endpoints into general-purpose fetch proxies.
- Do not leak tokens into query strings or persisted config.

## Known Navet Failure Modes To Guard Against

- media artwork that works in localhost but breaks in ingress or panel mode
- camera streams that assume direct internal Home Assistant URLs are reachable
- signed resource URLs losing their query-string signature during rewriting
- stale proxy paths surviving after runtime or mode changes
- broken artwork or snapshots causing blank UI instead of a fallback state

## Required Routing

Read this file before changing:

- `src/app/infrastructure/home-assistant/resources/`
- `src/app/infrastructure/home-assistant/media/`
- `src/app/utils/home-assistant-url.ts`
- `src/app/utils/home-assistant-connection-target.ts`
- `src/app/utils/url-security.ts`
- `src/app/features/security/components/camera-card/`
- `src/app/features/media/`
- `src/app/features/rss/components/rss-feed-card/`

These Home Assistant paths are current adapter-owned infrastructure. Do not treat them as the permanent global architecture for all providers.

## Relevant Repo Areas

- Resource resolver: `src/app/infrastructure/home-assistant/resources/`
- Camera media service: `src/app/infrastructure/home-assistant/media/camera-media-service.ts`
- Media artwork service: `src/app/infrastructure/home-assistant/media/media-artwork-service.ts`
- URL helpers: `src/app/utils/home-assistant-url.ts`, `src/app/utils/home-assistant-connection-target.ts`, `src/app/utils/url-security.ts`
- RSS fetching: `src/app/features/rss/components/rss-feed-card/`
- Camera UI: `src/app/features/security/components/camera-card/`
- Media UI: `src/app/features/media/`
- Security constraints: `docs/PUBLIC_LAUNCH_SECURITY.md`
