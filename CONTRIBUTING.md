# Contributing To Navet

Use this file for the shortest path from clone to productive work.

## Start Here

Before changing code, read:

- [`AGENTS.md`](AGENTS.md)
- [`ai/agents.md`](ai/agents.md)
- [`docs/README.md`](docs/README.md)

Then read the focused docs for the area you are touching.

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

Provider testing basics:

- Home Assistant: enter the Home Assistant base URL and complete OAuth
- Homey: set `NAVET_HOMEY_CLIENT_ID` and `NAVET_HOMEY_CLIENT_SECRET`, then use the Homey login option
- openHAB: use the openHAB login option with a browser-reachable base URL plus username/password

## Workflow

1. Create a branch from `main`.
2. Make changes using the current package architecture and shared UI conventions.
3. Update docs when behavior, commands, architecture, or setup guidance changes.
4. Run the smallest relevant validation surface for the area you changed.
5. Open a pull request.

## Command Policy

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
```

Important repo policy:

- `pnpm typecheck` and `pnpm check` are user-run gates rather than default agent-run commands
- release and packaging commands are maintainer workflows unless the task explicitly calls for them
- use [`docs/agents/commands.md`](docs/agents/commands.md) as the source of truth for command restrictions

## Architecture Rules

- treat Home Assistant as one provider adapter, not as the application architecture
- prefer Navet-owned contracts and provider/runtime seams in shared UI
- keep provider-specific auth, transport, resource resolution, and action translation in
  provider-specific layers
- `@navet/ui` is the target provider-neutral shared UI boundary
- `packages/app/src/components/*` and `packages/app/src/ui-kit/*` are still current implementation
  and stable import surfaces, not final ownership
- do not use current implementation drift as the source of truth for Home Assistant behavior

## Testing Rules

- prefer realistic fixtures and contract-focused assertions
- do not update tests only to match the current implementation
- use `ai/skills/testing-architecture.md` and `docs/agents/testing.md` for test work
