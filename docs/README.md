# Navet Docs

This folder is split by audience. If you are trying to get Navet running, start with the user
docs. If you are changing the codebase, use the contributor docs.

## Setup Guides

- [Home Assistant custom panel](HOME_ASSISTANT.md#home-assistant-custom-panel)
- [Home Assistant add-on](HOME_ASSISTANT.md#home-assistant-add-on)
- [Home Assistant standalone Docker](HOME_ASSISTANT.md#standalone-docker)
- [Homey setup](HOMEY.md)
- [openHAB setup](OPENHAB.md)

## User Docs

- [../README.md](../README.md)
  Project overview, provider status, setup entry points, package architecture, and development basics.
- [HOME_ASSISTANT.md](HOME_ASSISTANT.md)
  Deployment guide for the Home Assistant custom panel, Home Assistant add-on, and standalone app mode.
- [HOMEY.md](HOMEY.md)
  Homey setup guide for standalone and Home Assistant add-on users.
- [OPENHAB.md](OPENHAB.md)
  openHAB setup guide for standalone and Home Assistant add-on users.
- [WIDGETS.md](WIDGETS.md)
  What Navet widgets exist today and how they behave.
- [../SECURITY.md](../SECURITY.md)
  Security policy and public deployment hardening guidance.
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
- [architecture/marketing-website.md](architecture/marketing-website.md)
  Marketing website structure, reuse rules, and content boundaries.
- [testing/provider-testing-strategy.md](testing/provider-testing-strategy.md)
  Testing layers and fixture guidance.
- [testing/test-tier-inventory.md](testing/test-tier-inventory.md)
  Current test tiers, grouped by subsystem.
- [release-workflow.md](release-workflow.md)
  Maintainer release lanes, artifact channels, and version alignment rules.
- [rollback.md](rollback.md)
  Operator rollback guidance for Docker, Home Assistant add-on, and custom panel surfaces.
- [STORYBOOK_WORKFLOW.md](STORYBOOK_WORKFLOW.md)
  Story placement and visual review workflow.

## Maintainer And Historical Docs

These are useful when you are operating the repo or reading older architecture context, but they
are not the normal starting point:

- `ai/*`
- `docs/agents/*`
- [architecture/home-assistant-decoupling-audit.md](architecture/home-assistant-decoupling-audit.md)
- [roadmap/provider-platform-roadmap.md](roadmap/provider-platform-roadmap.md)
- [VERSIONING.md](VERSIONING.md)

If you are trying to understand the product and current provider/runtime support first, start with
`../README.md` and the provider-specific setup guides above before reading the maintainer docs.

## Design, Brand, Legal

- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
- [../SECURITY.md](../SECURITY.md)
- [../design-system/README.md](../design-system/README.md)
- [../design-system/UI-GUIDELINES.md](../design-system/UI-GUIDELINES.md)
- [branding/BRANDING.md](branding/BRANDING.md)
- [branding/BRANDING_ASSETS.md](branding/BRANDING_ASSETS.md)
- [branding/TRADEMARK_POLICY.md](branding/TRADEMARK_POLICY.md)
- [TERMS_OF_USE.md](TERMS_OF_USE.md)
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
