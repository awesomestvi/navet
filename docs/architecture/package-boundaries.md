# Package Boundaries

This is the practical ownership guide for Navet's package layout.

## Package Map

```text
packages/
  core/
  ui/
  provider-homeassistant/
  provider-homey/
  provider-openhab/
  app/
```

These package surfaces are the live runtime layout. Contributors should think in terms of package
ownership first, with `@navet/app` acting as the assembly layer that wires provider bridges,
runtime registration, settings, and persistence together.

Deployable and published host surfaces live separately under `apps/`. Those workspaces should stay
thin and consume package entry surfaces rather than owning shared feature logic.

## Ownership

| Area | Owner |
|---|---|
| shared contracts, IDs, adapter semantics | `@navet/core` |
| shared dashboard UI and view-model rendering | `@navet/ui` |
| Home Assistant runtime, mapping, auth, transport | `@navet/provider-homeassistant` |
| Homey runtime and mapping | `@navet/provider-homey` |
| openHAB runtime and mapping | `@navet/provider-openhab` |
| runtime selection, provider registration, settings, persistence | `@navet/app` |

Compatibility types like `NavetDevice`, `NavetRoom`, and `NavetProviderSnapshot` still exist, but
they are app-internal support code. Do not treat them as the preferred shared surface.

## Allowed Dependencies

- `@navet/ui` may depend on `@navet/core`
- provider packages may depend on `@navet/core`
- `@navet/app` may depend on every Navet package

## Forbidden Dependencies

- `@navet/core` importing React, provider SDKs, auth flows, or backend clients
- `@navet/ui` importing provider packages or raw backend payload types
- provider packages importing app services, stores, auth runtimes, or infrastructure directly
- provider packages importing app-internal compatibility code as their main input model
- new shared code importing deep provider internals when a package entry already exists

`pnpm check:provider-boundaries` enforces production package direction for literal imports,
type imports, re-exports, dynamic imports, and `require`, including relative paths across
packages. Core cannot import React, and core/UI cannot import the Home Assistant SDK.
The check discovers package source directories so newly added provider packages are covered.
Tests and stories remain free to assemble cross-package fixtures. Computed module names,
arbitrary new path aliases, and cycles within a package are not covered by this check.

## Shared Runtime Policy

Pure chore occurrence/calendar, resource-host, and credential rules live in `packages/core/src`.
`node scripts/build-runtime-policies.mjs` emits their deployment artifacts under `docker/njs`
and `docker/shared`; `pnpm check:runtime-policies` rejects stale artifacts in scoped validation
and provider CI. Edit the TypeScript source rather than generated JavaScript.

The native nginx JavaScript engine has a smaller language surface than browsers or Node.
Generated modules use default exports and avoid runtime imports and destructuring. A successful
Node test alone does not establish native runtime compatibility.
Run `node scripts/check-native-runtime-policies.mjs --njs=/path/to/njs` with a PCRE-enabled
native CLI to exercise shared vectors and policy operations. This does not replace
`pnpm check:docker` for nginx HTTP, filesystem, and persisted-restart validation.

`docker/shared/dashboard-profile-policy.js` owns profile sanitization, settings ownership,
legacy layout normalization, equality, and patch policy for both Vite and nginx. Its declaration
file supplies the TypeScript interface. Filesystem access, identity, locking, revision handling,
and HTTP responses stay in the existing runtime stores. Python remains the Home Assistant chore
authority, with shared conformance vectors checking agreement rather than a second JavaScript
runtime embedded in Home Assistant. Persisted schemas and migration reads remain compatible.

Host Vite configurations compose plugins from `scripts/vite-*-plugin*.ts`; host aliases and
build metadata use `scripts/vite-host-conventions.ts`. Build-time modules use resolvable relative
paths when importing core policy because app aliases do not exist while Vite loads its config.

RSS requires an authenticated provider session. The Ingress handler trusts forwarded identity
only behind the existing Supervisor-only nginx listener. Development and production share a Node
requester that validates all DNS answers and pins connections while retaining hostname verification.
Production nginx uses an internal subrequest to a private Unix socket owned by nginx. Credentials
and forwarded identity are stripped at that boundary; the shared transport applies public-host
filtering, verified HTTPS, bounded responses and redirect rejection. The container supervises nginx
and the transport together. See [RSS transport ownership](rss-transport.md).

## Runtime Flow

1. `@navet/app` selects the runtime mode and active provider.
2. Each connected provider package exposes normalized provider state and command execution.
3. `@navet/app` keeps provider-scoped collections and merges the selected provider collections for
   shared dashboard consumption.
4. `@navet/ui` renders from normalized entities and view models.
5. UI interactions emit generic `NavetCommand` values or call an optional provider feature
   service when the interaction needs a richer contract.
6. The matching provider package translates that work into provider-native requests.

## Provider Status

| Provider | Status | Notes |
|---|---|---|
| Home Assistant | implemented | first stable provider |
| Homey | implemented | standalone OAuth flow |
| openHAB | implemented | standalone base-URL and username/password flow |
| Hubitat | planned | catalog metadata only; no adapter package |
| SmartThings | planned | catalog metadata only; no adapter package |

Feature-service support is narrower than implementation status. Home Assistant registers the
advanced climate, media, camera, energy, calendar, weather, notification, task, conversation,
history, security, and administration services. Homey and openHAB currently register rooms, realtime entities,
lighting, switches, and sensors.

## Working Rule

If you are not sure where code belongs, ask two questions:

1. Is it generic across providers?
2. Does it need runtime, auth, transport, or raw payload knowledge?

If it is generic, it probably belongs in `@navet/core` or `@navet/ui`. If it needs provider
knowledge, it belongs in a provider package or in `@navet/app` wiring.
