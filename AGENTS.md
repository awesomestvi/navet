# Navet

Navet is a smart-home dashboard frontend with a provider-scoped architecture. Today it runs as a
standalone Docker app, a Home Assistant add-on through Ingress, and a Home Assistant custom panel.
Home Assistant is the most mature provider. Homey support exists in the codebase. openHAB remains
planned.

## Required Reading

Before making changes, read [`/ai/agents.md`](ai/agents.md).

For architecture, state, provider, integration, auth/runtime, or larger refactor work, also read
[`/docs/technical/multi-backend-migration-guide.md`](docs/technical/multi-backend-migration-guide.md).

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
- Prefer Navet-owned contracts, provider/runtime abstractions, and normalized state for shared UI
  and shared feature work.
- Do not add new shared-UI dependencies on `HassEntity` or other backend raw types unless the code
  is explicitly adapter-internal.
- Prefer `src/app/core/`, `src/app/platform/`, `src/app/stores/`, provider/runtime hooks, and
  provider-specific infrastructure seams before adding backend-specific conditionals.
- Do not use Navet's current implementation as the source of truth for Home Assistant behavior.
- Do not change tests just to match the current implementation.
- Treat `IntegrationProviderId`, `NavetDevice`, `NavetRoom`, `NavetRoomDescriptor`,
  `NavetProviderSnapshot`, `NavetProviderContract`, provider-scoped IDs, canonical IDs, runtime,
  snapshot, contract, and resource resolution as the current architecture vocabulary.
- Follow [`docs/agents/commands.md`](docs/agents/commands.md) before running repo commands.
