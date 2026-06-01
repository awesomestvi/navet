# External Resources

Read this file before changing cameras, artwork, entity pictures, RSS fetching, media URLs,
resource rewriting, or authenticated provider resources.

## Rules

- do not assume browser-direct URLs are valid across panel, Ingress, and standalone runtime modes
- keep provider-specific resource rewriting inside resolver and provider adapter seams
- treat resource URLs as potentially authenticated, signed, relative, proxied, or expired
- keep fallback UI behavior when resources fail

## Current Repo Areas

- `packages/app/src/infrastructure/home-assistant/resources/`
- `packages/app/src/infrastructure/home-assistant/media/`
- `packages/provider-homeassistant/`
- `packages/app/src/utils/home-assistant-url.ts`
- `packages/app/src/utils/home-assistant-connection-target.ts`
- `packages/app/src/utils/url-security.ts`
- `packages/app/src/features/security/components/camera-card/`
- `packages/app/src/features/media/`
- `packages/app/src/features/rss/`

## Required Coverage

When resource behavior changes, cover:

- relative and absolute URLs
- signed and authenticated URLs
- panel and Ingress path behavior
- standalone proxy behavior
- missing or broken resource fallback
