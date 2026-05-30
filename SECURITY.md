# Security Policy

## Reporting A Vulnerability

If you believe you found a security vulnerability in Navet, do not open a public GitHub issue.

Report it privately to:

- `security@navet.app`

Please include:

- a description of the issue
- affected versions or deployment modes if known
- reproduction steps or proof of concept
- impact you believe the issue could have
- any suggested mitigation if you have one

We will try to acknowledge reports promptly and follow up as we validate and triage the issue.

## Scope

Security reports are especially relevant for:

- authentication and session handling
- provider proxies and resource rewriting
- imported dashboard data
- RSS, media, camera, and external URL handling
- Docker and Home Assistant add-on deployment behavior

## Public Deployment Hardening

Use this checklist when Navet is reachable outside a private local network.

Navet is a smart-home control surface. Treat provider sessions, camera and media URLs, imported
dashboard data, and external feeds as sensitive.

### Basic Rules

- serve Navet behind HTTPS
- do not ship real provider credentials in static assets, demo content, or exported configs
- use least-privilege provider accounts where possible
- keep public demos on `/demo` only
- validate release and deployment changes before publishing

### Authentication

- standalone runtime stores session state behind same-origin endpoints, not in bundled config
- do not reintroduce manual token-entry login flows
- do not put access or refresh tokens into dashboard exports
- do not expose provider secrets in public files or logs

### Sensitive Runtime Endpoints

Important same-origin endpoints include:

- `/__navet_auth__/session`
- `/__navet_profile__/default`
- `/__navet_ha_proxy__/`
- `/__navet_rss_proxy__/`

Keep them tightly scoped:

- validate target URLs and hosts
- avoid token leakage in query strings
- prevent arbitrary proxying or redirects
- keep resource rewriting and signing in place

### External Resources

Pay extra attention to:

- camera snapshots and streams
- media artwork and entity pictures
- RSS feeds and links
- imported photo URLs
- map tiles and tracker resources
- notification links

If a resource can no longer be resolved safely, fail closed or fall back to a neutral placeholder.

### Deployment Notes

- keep nginx security headers aligned across Docker and add-on deployments
- enable HSTS only at a real HTTPS terminator
- do not weaken production security just to simplify localhost development

### Release Gates

Before a public release:

- run the provider validation flow
- run Docker validation with `pnpm check:docker`
- keep `pnpm typecheck` and `pnpm check` as user-run gates per repo policy

If a deployment change might weaken auth, proxying, or resource handling, treat that as a release
blocker until reviewed.

## Disclosure

Please give the maintainers reasonable time to investigate, fix, and coordinate disclosure before
sharing details publicly.

If a report is confirmed, the fix will be shipped through the normal Navet release process and the
relevant release notes.
