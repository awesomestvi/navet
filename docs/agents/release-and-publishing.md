# Release And Publishing

This file defines release workflow constraints and publishing behavior for Navet.

## Release Command Rules

- For release work, do not run any `pnpm` command yourself.
- List the required `pnpm` commands for the user, wait for the reported results, and continue from there.
- For HACS or Home Assistant custom panel releases, include `pnpm build:ha-panel` in the user-run release commands before the release commit or tag.

## Publishing Rules

- CI checks run on branch pushes and pull requests.
- GitHub Pages deploys the demo at `/navet/demo/` and Storybook at `/navet/storybook/`.
- Pushes to `main` publish only developer app images: `ghcr.io/awesomestvi/navet:dev` and `sha-*`.
- Manual Publish workflow runs are for developer hardware testing and default to the `dev` app image tag.
- Standalone app images publish the exact tag, `beta`, `latest`, and `sha-*` for every `v*` tag.
- Home Assistant add-on images publish `dev` and `sha-*` on `main` pushes or dev-channel manual workflow runs.
- Versioned add-on publishes emit the configured add-on version and `sha-*`.
- Prerelease tags also update `beta` and `latest`.
- There is no stable channel yet. Treat `latest` as the current public beta compatibility tag because existing users already consume it.

## Related Guidance

- Command restrictions and commit rules live in [commands.md](commands.md).
