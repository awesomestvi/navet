# Home Assistant Integration Coverage

This document describes the current intended coverage strategy for Home Assistant-facing Navet work.

## Strategy

Navet should test documented Home Assistant boundaries, not attempt one test file per Home
Assistant integration.

Coverage should prioritize:

- entity-domain behavior
- REST, WebSocket, auth, panel, and Ingress behavior
- resource URL resolution and proxy behavior
- realistic fixtures for integrations whose payloads materially differ
- known fragile areas such as cameras, artwork, signed URLs, and runtime-mode differences

## High-Priority Domains

Current high-value domains for ongoing coverage:

- lights
- switches
- sensors and binary sensors
- climate and water heaters
- covers
- locks
- media players
- cameras
- weather
- vacuums
- calendars
- people and device trackers
- scenes, scripts, automations, and helpers where Navet exposes user-visible behavior

## Runtime Coverage

When behavior depends on runtime mode, cover:

- standalone OAuth-backed flow
- Home Assistant add-on through Ingress
- Home Assistant custom panel
- auth failure and recovery paths
- resource rewriting and same-origin behavior

## Fixture Tree

Primary fixture tree:

- `src/test/fixtures/home-assistant/entities/`
- `src/test/fixtures/home-assistant/integrations/`
- `src/test/fixtures/home-assistant/api/`
- `src/test/fixtures/home-assistant/auth/`
- `src/test/fixtures/home-assistant/resources/`

## Edge Cases

Important edge cases include:

- `unknown`
- `unavailable`
- missing attributes
- malformed-but-plausible attributes
- relative vs absolute URLs
- signed URLs
- Ingress-prefixed URLs
- panel same-origin behavior
