# Public Launch Security Checklist

Navet is a browser-executed control surface for Home Assistant. A public launch must treat Home
Assistant URLs, access tokens, entity state, camera snapshots, and media URLs as sensitive.

## Release Gates

- Run `pnpm audit --prod` before every public release and resolve any production advisory that can
  affect the browser bundle, Docker image, nginx, or Home Assistant add-on.
- Ask a reviewer to run `pnpm typecheck` and `pnpm check` before release. The project instructions
  intentionally keep those commands as user-run gates.
- Do not publish a static hosted build that contains a real `NAVET_HASS_TOKEN`, long-lived access
  token, or private Home Assistant URL.
- Public demos must use `/demo` and demo data only. They must not connect to a real Home Assistant
  instance with bundled credentials.
- Serve production deployments over HTTPS when they are reachable outside a trusted local network.

## Credentials

- Browser-entered Home Assistant tokens are stored in `localStorage` for local/self-hosted use. Any
  XSS in the app would expose those tokens, so CSP and URL sanitization are release blockers.
- `NAVET_HASS_TOKEN` may be injected into Docker runtime config so Docker deployments can start
  without the login form. It must never be included in a public static build, Vite client
  environment variable, checked-in file, or demo deployment.
- Prefer least-privilege Home Assistant users/tokens for dashboard deployments. Avoid using an owner
  account token on shared tablets or public networks. Treat Docker instances with runtime tokens as
  authenticated Home Assistant clients.

## Proxies

- `/__navet_rss_proxy__` is a same-origin feed proxy, not a general fetch proxy. It must allow only
  HTTPS feeds, reject local/private hosts, reject non-XML content types, cap response size, and avoid
  following redirects.
- `/__navet_ha_proxy__/` must stay scoped to the configured Home Assistant origin. Do not add support
  for arbitrary absolute target URLs.
- `/__navet_session__/default` is a same-origin deployment session store. Treat access to this path
  as access to the shared Home Assistant credentials for that Navet deployment.
- `/__navet_profile__/default` is a same-origin deployment profile store. Treat access to this path
  as access to modify the shared Navet dashboard for that deployment.
- If a reverse proxy or ingress sits in front of Navet, keep these paths protected by the same origin
  and do not expose them as unauthenticated general-purpose proxy endpoints.

## Headers

- Docker and add-on nginx include a baseline CSP, `X-Content-Type-Options`, frame protection,
  `Referrer-Policy`, and `Permissions-Policy`.
- Add HSTS only at an HTTPS terminator that is guaranteed to serve Navet over HTTPS. Do not enable
  HSTS on plain local HTTP development or LAN-only defaults.

## Remote Content

- RSS article links, notification links, photo-frame URLs, imported wallpapers, and Home Assistant
  media/image URLs must go through shared URL validation before they reach `href`, `window.open`, or
  `img src`.
- Dashboard YAML import intentionally excludes Home Assistant connection URL and token. Imported
  cards and persisted records are validated before being written to stores or `localStorage`.
