# Contributing To Navet

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- pnpm 11 from the pinned `packageManager`
- Git

## Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/navet.git
cd navet
pnpm install
pnpm dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

For live Home Assistant testing, enter the Home Assistant base URL in Navet and complete the OAuth
flow. For Homey testing, configure `NAVET_HOMEY_CLIENT_ID` and `NAVET_HOMEY_CLIENT_SECRET`, then
use the Homey login option. For openHAB testing, use the openHAB login option with a
browser-reachable base URL plus username/password.

## Workflow

1. Create a branch from `main`.
2. Make changes using existing architecture, feature, and shared-UI patterns.
3. Update docs when behavior, architecture, commands, or public setup changes.
4. Run the relevant fast checks for the area you changed.
5. Open a pull request.

## Required Reading

Before changing code, read:

- [`AGENTS.md`](AGENTS.md)
- [`ai/agents.md`](ai/agents.md)

Then read the relevant focused docs for the area you are touching.

For user-facing setup and deployment docs, start with [`docs/README.md`](docs/README.md).

## Checks

Common commands:

```bash
pnpm dev
pnpm preview
pnpm test
pnpm test:tier1
pnpm test:tier2
pnpm test:tier3
pnpm storybook
pnpm website:dev
pnpm website:build
pnpm storybook:build
pnpm check:stories
pnpm check:ui-kit
pnpm check:provider-boundaries
pnpm check:bundle-budget
pnpm check:docker
pnpm check:lockfile
pnpm test:coverage
pnpm release:check
pnpm build:ha-panel
pnpm sync:hacs
```

Per repo policy, `pnpm typecheck` and `pnpm check` are user-run gates rather than default
agent-run commands. See [`docs/agents/commands.md`](docs/agents/commands.md).

## Architecture Rules

- treat Home Assistant as one provider adapter, not as the whole app architecture
- prefer Navet-owned contracts and provider/runtime seams in shared UI
- keep provider-specific auth, transport, resource resolution, and action translation in
  provider-specific layers
- do not use current implementation drift as the source of truth for Home Assistant behavior

## Tests

- prefer realistic fixtures and contract-focused assertions
- do not update tests only to match the current implementation
- read `ai/skills/testing-architecture.md` and `docs/agents/testing.md` for testing work
