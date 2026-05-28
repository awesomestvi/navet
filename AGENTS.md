# Navet

Navet is a smart-home dashboard frontend with a multi-backend architecture. Today it runs as a standalone Docker app, a Home Assistant add-on through ingress, and a Home Assistant custom panel, with Home Assistant as the most mature backend and Homey support already present in the codebase.

## Required Reading

Before making changes, read [`/ai/agents.md`](ai/agents.md).

For architecture, state, integration, provider, or large refactor work, also read [`/docs/technical/multi-backend-migration-guide.md`](docs/technical/multi-backend-migration-guide.md).

Also read the relevant skill file for the area you are touching:

- Home Assistant entity behavior: [`/ai/skills/home-assistant-integration.md`](ai/skills/home-assistant-integration.md)
- Tests and test cleanup: [`/ai/skills/testing-architecture.md`](ai/skills/testing-architecture.md)
- Mock entities and fixtures: [`/ai/skills/entity-fixtures.md`](ai/skills/entity-fixtures.md)
- Authentication and deployment modes: [`/ai/skills/auth-deployment.md`](ai/skills/auth-deployment.md)
- Cameras, media, entity pictures, RSS, external URLs: [`/ai/skills/external-resources.md`](ai/skills/external-resources.md)
- UI/UX and dashboard behavior: [`/ai/skills/navet-ux.md`](ai/skills/navet-ux.md)
- Performance and Raspberry Pi or kiosk constraints: [`/ai/skills/performance.md`](ai/skills/performance.md)

## Non-Negotiable Rules

- Home Assistant official documentation is the source of truth for integration behavior.
- Home Assistant documentation governs Home Assistant adapter behavior, not Navet's overall architecture.
- Treat Home Assistant as one backend adapter, not the application architecture.
- New architecture work must prefer Navet-owned contracts, provider abstractions, and backend-agnostic UI/state.
- Do not add new UI dependencies on `HassEntity` or other backend raw types unless the work is adapter-internal.
- Prefer `src/app/core/`, provider/runtime abstractions, and integration-layer seams before adding backend-specific conditionals.
- Do not use Navet's current implementation as the source of truth for Home Assistant behavior.
- Do not change tests just to match the current implementation.
- Implementation-mirroring tests are low-value. Rewrite or delete them unless they protect a real regression, a documented contract, or a user-facing behavior.
- If Home Assistant-facing tests fail, assume Navet is wrong first.
- Follow [`docs/agents/commands.md`](docs/agents/commands.md) before running repo commands.
