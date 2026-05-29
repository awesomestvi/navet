# Release And Publishing

Internal maintainer reference. This file is for release operators and agent workflows, not normal
user documentation.

This file defines release workflow constraints and publishing behavior for Navet.

## Release Command Rules

- For release work, do not run any `pnpm` command yourself.
- List the required `pnpm` commands for the user, wait for the reported results, and continue from
  there.
- For HACS or Home Assistant custom panel releases, include `pnpm build:ha-panel` in the user-run
  release commands before the release commit or tag.

## Automated Workflow Expectations

- CI now splits testing into:
  - Tier 1 release-critical validation
  - Tier 2 blocking app-contract validation
  - Tier 3 broad regression visibility
- Tier 1 validation runs as a distinct workflow or job and covers:
  - focused provider/runtime/auth/resource tests
  - provider boundary enforcement
  - Docker validation
- Publish and release workflows should require Tier 1 validation before shipping.
- Home Assistant ingress and custom-panel behavior remain partly manual release checks unless a
  real automation path is added later.

## Publishing Rules

- GitHub Pages deploys the demo at `/navet/demo/` and Storybook at `/navet/storybook/`.
- Pushes to `main` publish only developer app images: `ghcr.io/awesomestvi/navet:dev` and `sha-*`.
- Manual Publish workflow runs are for developer hardware testing and default to the `dev` app
  image tag.
- Standalone app images publish the exact tag, `beta`, `latest`, and `sha-*` for every `v*` tag.
- Home Assistant add-on images publish `dev` and `sha-*` on `main` pushes or dev-channel manual
  workflow runs.
- Versioned add-on publishes emit the configured add-on version and `sha-*`.
- Prerelease tags also update `beta` and `latest`.
- There is no stable channel yet. Treat `latest` as the current public beta compatibility tag
  because existing users already consume it.

## Related Guidance

- Command restrictions and commit rules live in [commands.md](commands.md).
- Provider release validation details live in [../PROVIDER_RELEASE_VALIDATION.md](../PROVIDER_RELEASE_VALIDATION.md).
