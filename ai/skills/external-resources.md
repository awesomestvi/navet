# External Resources

Read this file before changing cameras, artwork, entity pictures, RSS fetching, media URLs,
resource rewriting, or authenticated provider resources.

## Rules

- do not assume browser-direct URLs are valid across panel, Ingress, and standalone runtime modes
- keep provider-specific resource rewriting inside resolver and infrastructure seams
- treat resource URLs as potentially authenticated, signed, relative, proxied, or expired
- keep fallback UI behavior when resources fail

## Current Repo Areas

- `src/app/infrastructure/home-assistant/resources/`
- `src/app/infrastructure/home-assistant/media/`
- `src/app/utils/home-assistant-url.ts`
- `src/app/utils/home-assistant-connection-target.ts`
- `src/app/utils/url-security.ts`
- `src/app/features/security/components/camera-card/`
- `src/app/features/media/`
- `src/app/features/rss/`

## Required Coverage

When resource behavior changes, cover:

- relative and absolute URLs
- signed and authenticated URLs
- panel and Ingress path behavior
- standalone proxy behavior
- missing or broken resource fallback
