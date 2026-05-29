# Navet

Navet is a smart-home dashboard frontend with a package architecture direction built around
provider-neutral core and UI layers, provider packages, and an official app-composition layer.
Today it runs as a standalone Docker app, a Home Assistant add-on through Ingress, and a Home
Assistant custom panel. Home Assistant is the reference adapter today. Homey support exists in the
codebase. openHAB, Hubitat, and SmartThings are planned providers, with openHAB the first intended
second proof after Home Assistant and Homey.

## Required Reading

Before making changes, read [`/ai/agents.md`](ai/agents.md).

For architecture, state, provider, integration, auth/runtime, or larger refactor work, also read:

- [`/docs/agents/architecture.md`](docs/agents/architecture.md)
- [`/docs/architecture/package-boundaries.md`](docs/architecture/package-boundaries.md)
- [`/docs/architecture/provider-neutral-ui.md`](docs/architecture/provider-neutral-ui.md)
- [`/docs/architecture/provider-contract.md`](docs/architecture/provider-contract.md)
- [`/docs/architecture/home-assistant-decoupling-audit.md`](docs/architecture/home-assistant-decoupling-audit.md)
- [`/docs/testing/provider-testing-strategy.md`](docs/testing/provider-testing-strategy.md)
- [`/docs/roadmap/provider-platform-roadmap.md`](docs/roadmap/provider-platform-roadmap.md)

Read the relevant skill file for the area you are touching:

- Home Assistant entity behavior: [`/ai/skills/home-assistant-integration.md`](ai/skills/home-assistant-integration.md)
- Tests and test cleanup: [`/ai/skills/testing-architecture.md`](ai/skills/testing-architecture.md)
- Mock entities and fixtures: [`/ai/skills/entity-fixtures.md`](ai/skills/entity-fixtures.md)
- Authentication and deployment modes: [`/ai/skills/auth-deployment.md`](ai/skills/auth-deployment.md)
- Cameras, media, entity pictures, RSS, external URLs: [`/ai/skills/external-resources.md`](ai/skills/external-resources.md)
- UI/UX and dashboard behavior: [`/ai/skills/navet-ux.md`](ai/skills/navet-ux.md)
- Performance and kiosk constraints: [`/ai/skills/performance.md`](ai/skills/performance.md)

## Non-Negotiable Rules

- Home Assistant official documentation is the source of truth for Home Assistant adapter behavior.
- Home Assistant documentation does not define Navet's overall architecture.
- Treat Home Assistant as one provider adapter inside Navet, not as the application architecture.
- Navet uses a package architecture direction with `@navet/core`, `@navet/ui`, provider packages,
  and `@navet/app`.
- Prefer Navet-owned contracts, provider/runtime abstractions, and normalized state for shared UI
  and shared feature work.
- `@navet/ui` must not import provider-specific code.
- `@navet/core` must not import provider-specific code, React, provider SDKs, or API clients.
- Provider-specific code belongs in provider packages or migration seams that are explicitly being
  extracted toward those packages.
- Do not add new shared-UI dependencies on `HassEntity` or other backend raw types unless the code
  is explicitly adapter-internal.
- Do not expose Home Assistant service payloads as the public UI command model.
- Prefer provider-neutral entities and commands before adding backend-specific conditionals.
- Do not use Navet's current implementation as the source of truth for Home Assistant behavior.
- Do not change tests just to match the current implementation.
- Treat `IntegrationProviderId`, `NavetDevice`, `NavetRoom`, `NavetRoomDescriptor`,
  `NavetProviderSnapshot`, `SmartHomeProviderAdapter`, `NavetEntity`, `NavetCommand`,
  `CommandResult`, provider-scoped IDs, canonical IDs, runtime, snapshot, contract, and resource
  resolution as the current architecture vocabulary.
- Prefer incremental extraction over a rewrite.
- Follow [`docs/agents/commands.md`](docs/agents/commands.md) before running repo commands.
