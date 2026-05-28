# Public Launch Security Checklist

Navet is a browser-executed smart-home control surface. Treat provider URLs, sessions, media
resources, camera snapshots, RSS feeds, and imported dashboard data as sensitive.

## Release Gates

- run dependency and deployment security checks before public release
- keep `pnpm typecheck` and `pnpm check` as user-run release gates per repo policy
- do not publish builds that contain real provider tokens, private URLs, or bundled credentials
- public demos must use `/demo` only and must not connect to live providers
- serve public deployments behind HTTPS

## Auth And Session Rules

- standalone runtime stores OAuth-backed session state behind same-origin endpoints, not in bundled
  runtime config
- do not reintroduce manual token-entry login paths
- do not place access or refresh tokens in imported dashboard config, static assets, or public demo
  content
- prefer least-privilege provider users for shared dashboard devices

## Proxy Rules

Current sensitive same-origin endpoints include:

- `/__navet_auth__/session`
- `/__navet_profile__/default`
- `/__navet_ha_proxy__/`
- `/__navet_rss_proxy__`

Rules:

- keep them scoped to the configured deployment and current provider/runtime behavior
- do not turn them into general-purpose arbitrary fetch or redirect endpoints
- keep URL validation and host restrictions in place
- do not leak provider tokens through query strings

## Resource Rules

- camera, media, artwork, and entity-picture handling must go through shared URL and resource
  resolution seams
- imported URLs, RSS links, photo-frame URLs, map resources, and notification links must be
  validated before use
- keep fallback UI behavior when authenticated or signed resources fail

## Deployment Rules

- nginx security headers in Docker and add-on builds must stay aligned with the current runtime
  behavior
- add HSTS only at a guaranteed HTTPS terminator
- do not weaken security constraints just to simplify localhost or LAN-only development
