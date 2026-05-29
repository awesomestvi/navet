# Navet Docs

This folder is split by audience. If you are trying to get Navet running, start with the user
docs. If you are changing the codebase, use the contributor docs.

## User Docs

- [../README.md](../README.md)
  Overview, supported providers, install options, and development basics.
- [DOCKER_HOME_ASSISTANT_ADDON.md](DOCKER_HOME_ASSISTANT_ADDON.md)
  Deployment guide for Home Assistant panel, Home Assistant add-on, and standalone Docker.
- [WIDGETS.md](WIDGETS.md)
  What Navet widgets exist today and how they behave.
- [PUBLIC_LAUNCH_SECURITY.md](PUBLIC_LAUNCH_SECURITY.md)
  Security checklist for public or shared deployments.
- [ROADMAP.md](ROADMAP.md)
  Product roadmap.

## Contributor Docs

- [agents/architecture.md](agents/architecture.md)
  Short architecture overview for contributors.
- [architecture/package-boundaries.md](architecture/package-boundaries.md)
  What belongs in `@navet/core`, `@navet/ui`, provider packages, and `@navet/app`.
- [architecture/provider-contract.md](architecture/provider-contract.md)
  Shared provider contract and responsibilities.
- [architecture/provider-neutral-ui.md](architecture/provider-neutral-ui.md)
  Rules for shared UI and view models.
- [testing/provider-testing-strategy.md](testing/provider-testing-strategy.md)
  Testing layers and fixture guidance.
- [testing/test-tier-inventory.md](testing/test-tier-inventory.md)
  Current test tiers, grouped by subsystem.
- [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md)
  Story placement and visual review workflow.

## Maintainer And Historical Docs

These are useful when you are operating the repo or reading older architecture context, but they
are not the normal starting point:

- `ai/*`
- `docs/agents/*`
- [architecture/home-assistant-decoupling-audit.md](architecture/home-assistant-decoupling-audit.md)
- [roadmap/provider-platform-roadmap.md](roadmap/provider-platform-roadmap.md)
- [PROVIDER_RELEASE_VALIDATION.md](PROVIDER_RELEASE_VALIDATION.md)
- [VERSIONING.md](VERSIONING.md)

## Design, Brand, Legal

- [../design-system/README.md](../design-system/README.md)
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)
- [branding/BRANDING.md](branding/BRANDING.md)
- [branding/BRANDING_ASSETS.md](branding/BRANDING_ASSETS.md)
- [branding/TRADEMARK_POLICY.md](branding/TRADEMARK_POLICY.md)
- [TERMS_OF_USE.md](TERMS_OF_USE.md)
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
