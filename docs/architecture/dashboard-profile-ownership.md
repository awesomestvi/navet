# Dashboard Profile Ownership

Navet treats a dashboard installation, a signed-in account, a browser or wall panel, and an
authentication session as different owners. They must not share one undifferentiated local-storage
or server file.

## Identity Layers

| Layer | Example | Owns |
|---|---|---|
| Installation workspace | Navet on a Raspberry Pi | Shared dashboard profile, revisions, history, and registered clients |
| Provider account | A Home Assistant user | Language, units, notification visibility, default view, and interaction preference |
| Dashboard client | Kitchen panel or Vishal's phone | Kiosk/panel mode, keep-awake, local density, effects quality, and camera transport preference |
| Credential session | One browser's Home Assistant OAuth grant | Access and refresh tokens for that browser only |

A dashboard client has a random browser-local ID and a user-editable display name. It is useful for
activity attribution; it is not authentication. The server accepts user attribution only from
server-controlled identity data. Today that means trusted Home Assistant Ingress headers;
standalone OAuth sessions remain intentionally unattributed because their token response does not
contain a server-verifiable Home Assistant user ID. The server never trusts a caller-supplied user
ID.

Device preferences are keyed by that stable dashboard-client ID, not by the replaceable OAuth
session, so signing in again does not turn the same panel into a new device. Forgetting a dashboard
removes its registry entry and saved device preferences. It deliberately does not alter revision
history, sign the dashboard out, or revoke its provider credentials.

## Shared Profile

The installation has one default shared profile today. It contains the household-facing dashboard
definition: theme, cards, layouts, room organization, weather presentation, and shared custom
actions that pass export security filtering. Camera transport and presentation preferences remain
device-owned because panel capabilities differ.

The server stores:

- installation and workspace identity
- a monotonically increasing revision
- the client and authenticated principal that produced the revision
- changed JSON paths
- a bounded recoverable history
- an explicit reset marker

Clients write against the revision they loaded. A stale write receives a precondition failure
instead of silently replacing a newer dashboard.

The production Nginx runtime uses one event-driven worker because the local profile store performs
its revision check and atomic file replacement synchronously. This keeps concurrent browser writes
serialized without reducing the number of WebSocket or HTTP connections the worker can serve.

## Reconciliation

Every client keeps the last common server profile as its merge base.

1. A clean client applies a newer remote revision in place and shows a short attributed update.
2. Independent local and remote fields are merged automatically and saved as a new revision.
3. Only overlapping fields produce a conflict choice.
4. **Keep mine** rebases the local fields over the latest remote revision.
5. **Load remote** discards the pending local fields and applies the server revision.

An empty server is not automatically destructive. An uninitialized workspace may be seeded from a
configured local dashboard. An explicit reset or a missing profile without a reset marker preserves
local state and exposes recovery/history instead of clearing the browser.

## Preferences And Secrets

Settings use one exhaustive classification:

- `shared`: serialized in the shared profile
- `account`: stored in an authenticated account preference document when the runtime provides a
  server-verifiable user identity
- `device`: stored in a client preference document and kept locally on that browser
- `secret`: never exported or copied to another client
- `legacy` or `ephemeral`: migration/runtime-only values

Standalone Home Assistant OAuth does not include a user identity in its token response. Home
Assistant exposes the current user through its authenticated WebSocket protocol, but the standalone
Nginx session runtime has no server-side WebSocket client. Navet therefore keeps standalone
`userId` and `userName` unset instead of trusting a browser assertion. Account preference endpoints
remain unavailable in standalone mode for now; account-classified settings stay local, while the
shared household profile still syncs between authenticated standalone clients. Add-on Ingress may
sync account preferences because Supervisor supplies the verified `X-Remote-User-*` identity.

Credential-bearing URLs, raw camera stream URLs, usernames, email addresses, and provider tokens
are excluded from the shared profile.

## Deployment Modes

- Standalone Docker and development use a per-browser opaque `HttpOnly` cookie. The OAuth state,
  callback, refresh token, access token, and proxy requests are bound to that one server session.
- Home Assistant add-on Ingress may use the official `X-Remote-User-*` identity headers only in the
  explicit Ingress handler.
- The Home Assistant custom panel has no Navet profile-store endpoint and remains local-only until a
  provider-owned server persistence seam exists.

The normal standalone profile route never trusts Ingress headers and never accepts anonymous
profile access.
