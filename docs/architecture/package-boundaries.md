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
  provider-hubitat/
  provider-smartthings/
  app/
```

These package surfaces are real. The repo still has `src/` implementation paths, but contributors
should think in terms of package ownership first.

## Ownership

| Area | Owner |
|---|---|
| shared contracts, IDs, adapter semantics | `@navet/core` |
| shared dashboard UI and view-model rendering | `@navet/ui` |
| Home Assistant runtime, mapping, auth, transport | `@navet/provider-homeassistant` |
| Homey runtime and mapping | `@navet/provider-homey` |
| openHAB runtime and mapping | `@navet/provider-openhab` |
| runtime selection, provider registration, settings, persistence | `@navet/app` |
| Hubitat and SmartThings package entry surfaces | `@navet/provider-hubitat`, `@navet/provider-smartthings` |

Compatibility types like `NavetDevice`, `NavetRoom`, and `NavetProviderSnapshot` still exist, but
they are app-internal support code. Do not treat them as the preferred shared surface.

## Allowed Dependencies

- `@navet/ui` may depend on `@navet/core`
- provider packages may depend on `@navet/core`
- `@navet/app` may depend on every Navet package

## Forbidden Dependencies

- `@navet/core` importing React, provider SDKs, auth flows, or backend clients
- `@navet/ui` importing provider packages or raw backend payload types
- provider packages importing app-internal compatibility code as their main input model
- new shared code importing deep provider internals when a package entry already exists

## Runtime Flow

1. `@navet/app` selects the runtime mode and active provider.
2. The provider package exposes normalized provider state and command execution.
3. `@navet/ui` renders from normalized entities and view models.
4. UI interactions emit generic `NavetCommand` values.
5. The provider package translates those commands into provider-native requests.

## Provider Status

| Provider | Status | Notes |
|---|---|---|
| Home Assistant | implemented | reference provider |
| Homey | implemented | standalone login flow |
| openHAB | implemented | standalone URL-session flow |
| Hubitat | not available yet | package scaffolding only |
| SmartThings | not available yet | package scaffolding only |

## Working Rule

If you are not sure where code belongs, ask two questions:

1. Is it generic across providers?
2. Does it need runtime, auth, transport, or raw payload knowledge?

If it is generic, it probably belongs in `@navet/core` or `@navet/ui`. If it needs provider
knowledge, it belongs in a provider package or in `@navet/app` wiring.
