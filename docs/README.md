# Navet Docs

Use this page as the map for the documentation set.

## Documentation Policy

- Keep one canonical document for each policy, architecture boundary, workflow, or user task.
- Prefer current behavior and durable decisions over implementation diaries, completed plans, and
  copied interfaces or file inventories.
- Delete superseded guidance after updating its active inbound links. Git history is the archive.
- Keep released changelogs intact even when their terminology is no longer current.
- Public pages are selected explicitly in `apps/docs/src/content.config.ts`; internal docs should
  not duplicate their user-facing instructions.

## Start Here

- If you want to run Navet: start with the provider setup guides.
- If you want to contribute code: start with [../CONTRIBUTING.md](../CONTRIBUTING.md).
- If you need maintainer or release guidance: jump to the maintainer section below.
- If you are updating AI guidance: use the `ai/` section after reading the contributor docs.

## User Docs

- [../README.md](../README.md)
  Product overview, support status, repo layout, and quick development basics.
- [HOME_ASSISTANT.md](HOME_ASSISTANT.md)
  Home Assistant deployment guide for the custom panel via HACS, add-on, and standalone paths.
- [NAVET_DEV.md](NAVET_DEV.md)
  Install and update Navet Dev through the add-on, Docker, or an advanced manual custom-panel build.
- [HOMEY.md](HOMEY.md)
  Homey standalone setup.
- [OPENHAB.md](OPENHAB.md)
  openHAB standalone setup.
- [WIDGETS.md](WIDGETS.md)
  Widget reference: types, sizes, placement, and limits.
- [integrations.md](integrations.md)
  Public provider status, capability matrix, and multi-provider behavior.
- [user-guide.md](user-guide.md)
  Current dashboard sections, editing, profiles, kiosk behavior, and provider availability.
- [ROADMAP.md](ROADMAP.md)
  Public roadmap.
- [../SECURITY.md](../SECURITY.md)
  Security and public deployment guidance.

## Contributor Docs

- [../CONTRIBUTING.md](../CONTRIBUTING.md)
  Onboarding, local setup, and validation flow.
- [agents/commands.md](agents/commands.md)
  Repo command policy and commit-message rules.
- [architecture/package-boundaries.md](architecture/package-boundaries.md)
  What belongs in `@navet/core`, `@navet/ui`, provider packages, and `@navet/app`.
- [architecture/provider-contract.md](architecture/provider-contract.md)
  Shared provider contract and responsibilities.
- [architecture/dashboard-profile-ownership.md](architecture/dashboard-profile-ownership.md)
  Multi-dashboard settings ownership, revision sync, recovery, and credential-session boundaries.
- [architecture/household-chores.md](architecture/household-chores.md)
  Chore domain ownership, authority, persistence, recovery, and provider boundaries.
- [architecture/media-dashboard-provider-limitations.md](architecture/media-dashboard-provider-limitations.md)
  Media dashboard contract, Home Assistant behavior, artwork handling, and current limits.
- [architecture/marketing-website.md](architecture/marketing-website.md)
  Website-specific structure and reuse rules.
- [design-system/README.md](design-system/README.md)
  Shared UI layers, import surfaces, and review model.
- [design-system/UI-GUIDELINES.md](design-system/UI-GUIDELINES.md)
  Visual and interaction rules.
- [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md)
  Story placement and review workflow.
- [testing/provider-testing-strategy.md](testing/provider-testing-strategy.md)
  Testing layers and boundary expectations.

## Maintainer Docs

- [release-workflow.md](release-workflow.md)
  Release lanes, artifact surfaces, and version alignment.
- [VERSIONING.md](VERSIONING.md)
  Release-line and versioning policy.

## AI And Agent Docs

- [../ai/agents.md](../ai/agents.md)
  Canonical agent framing for architecture, vocabulary, and repo layout.
- [../ai/skills/home-assistant-integration.md](../ai/skills/home-assistant-integration.md)
- [../ai/skills/auth-deployment.md](../ai/skills/auth-deployment.md)
- [../ai/skills/testing-architecture.md](../ai/skills/testing-architecture.md)
- [../ai/skills/entity-fixtures.md](../ai/skills/entity-fixtures.md)
- [../ai/skills/external-resources.md](../ai/skills/external-resources.md)
- [../ai/skills/navet-ux.md](../ai/skills/navet-ux.md)
- [../ai/skills/performance.md](../ai/skills/performance.md)

## Repo Map

Search `packages/` and `apps/` first. Do not assume a repo-root `src/` directory.

- `packages/app/src`: app composition, dashboard behavior, runtime wiring, services, tests, and stories
- `packages/core/src`: provider-neutral contracts, IDs, runtime semantics, and feature models
- `packages/ui/src`: target provider-neutral shared UI package boundary
- `packages/provider-homeassistant/src`: Home Assistant adapter behavior
- `packages/provider-homey/src`: Homey adapter behavior
- `packages/provider-openhab/src`: openHAB adapter behavior
- `apps/standalone/src`: standalone runtime entrypoint
- `apps/demo/src`: demo runtime entrypoint
- `apps/website/src`: website runtime entrypoint
- `apps/docs`: public documentation site; its content config explicitly selects publishable Markdown
- `apps/ha-panel`: Home Assistant panel wrapper/build surface
- `apps/storybook`: Storybook host app
- `platform/home-assistant/`: add-on and custom-component release surfaces

Shared UI reality check:

- `@navet/ui` is the target provider-neutral shared UI boundary.
- `packages/app/src/components/*` and `packages/app/src/ui-kit/*` are still current implementation
  and stable import surfaces.
- Docs should distinguish current implementation, stable imports, and target ownership.

## Design, Brand, Legal

- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
- [../SECURITY.md](../SECURITY.md)
- [branding/README.md](branding/README.md)
  Canonical brand foundations, voice, visual identity, product card grammar, assets, and governance.
- [branding/TRADEMARK_POLICY.md](branding/TRADEMARK_POLICY.md)
- [TERMS_OF_USE.md](TERMS_OF_USE.md)
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
