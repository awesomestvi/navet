# Changelog

## 0.1.1-beta.1 - 2026-05-19

Navet adds a Home Assistant sidebar panel, new dashboard views, and better boiler support.

## ✨ New features

- You can now open Navet directly from the Home Assistant sidebar.
- You can now add Navet to HACS as a custom repository.
- You can now control Home Assistant water heaters from the climate card.
- Media, security, and device pages now have dedicated dashboard views.

## ⚡ Improvements

- Dashboard pages adapt better across screen sizes.
- Navet works better when opened inside Home Assistant.
- Login and error messages are clearer when your Home Assistant connection needs attention.
- The public demo uses fresher links and screenshots.
- Home Assistant add-on package information is up to date for this release.

## 📝 Documentation

- Added setup guidance for the Home Assistant sidebar panel.
- Updated release and add-on notes for this beta.

## 🚧 In progress

- HACS custom repository support is ready for testing and will continue to improve.

## 0.1.0-beta.4 - 2026-05-17

Changes since `v0.1.0-beta.3`.

### Authentication and Home Assistant Connections

- Polished the Navet login experience so hosted and authenticated startup flows are clearer.
- Hardened Home Assistant connection target detection for hosted, Docker, and ingress-based deployments.
- Improved runtime configuration handling for Home Assistant URLs, access tokens, and browser session state.
- Added test coverage for Home Assistant connection setup, URL handling, runtime config, and session persistence.

### Dashboard and Cards

- Fixed dashboard card interactions for locks, covers, RSS feeds, and slide actions.
- Hardened HVAC cards with more reliable mode controls, entity synchronization, and temperature/status labels.
- Added cover and lock card interaction coverage to guard against dashboard control regressions.
- Expanded RSS feed handling and empty-state behavior for deployed dashboard cards.

### Media and Demo Experience

- Fixed authenticated media artwork loading, including album art and Home Assistant-protected artwork URLs.
- Allowed demo album artwork and bundled demo security camera imagery to load correctly.
- Fixed GitHub Pages and demo asset paths for sidebar imagery, theme assets, RSS images, and hosted base paths.
- Added media artwork and display-field tests for protected and demo artwork scenarios.

### Docker and Home Assistant Add-on

- Added dashboard profile and session synchronization so Docker and add-on deployments can persist dashboard state across browser sessions.
- Fixed Home Assistant add-on ingress routing for Navet internal endpoints, including dashboard profile/session APIs and RSS proxying.
- Fixed runtime Docker credential loading so deployed containers receive the expected Home Assistant connection settings.
- Added a development Home Assistant add-on entry that tracks the `dev` image tag.
- Refreshed add-on installation documentation and added the Home Assistant install badge.

### Release and Publishing

- Restored dev app image publishing from `main`.
- Restored Home Assistant add-on dev image publishing from `main`.
- Enabled GitHub Pages setup for the demo and Storybook publishing flow.
- Clarified release publishing workflows for prerelease app images, add-on images, and manual developer image runs.
- Expanded release-maintenance documentation and agent instructions for preparing future release work.

### Verification Notes

Before tagging the release, run:

- `pnpm test`
- `pnpm check`
- `pnpm typecheck`

Manual release checks should cover login, Home Assistant hosted/add-on ingress, HVAC controls, lock and cover cards, media artwork, demo/GitHub Pages asset loading, and Docker runtime config loading.
