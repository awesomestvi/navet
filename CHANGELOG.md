# Changelog

## 0.1.3 - 2026-05-21

Navet fixes dashboard navigation and media artwork issues while making cards easier to control and edit.

## New

- Cover cards can now be adjusted by dragging the position line directly.
- Cards can now be locked so they stay visible without reacting to accidental taps.
- Custom card names can now be changed from the dashboard.

## Fixed

- Media artwork now appears correctly when Navet runs in Docker.
- The dashboard no longer intermittently refreshes back to the unassigned room tab.
- Fahrenheit values no longer get converted again when they are already in Fahrenheit.
- Dialogs can be dragged closed reliably again.
- Switch card dialogs no longer refer to a light icon.

## Improved

- Cover, light, and slide-to-unlock card dialogs are easier to read and use.
- Scrollbars behave better in dashboard areas that overflow.

## Documentation

- Add-on setup guidance no longer tells users to rely on a login URL and token when that is not the recommended setup path.

## 0.1.2 - 2026-05-20

Navet keeps release publishing aligned for custom panel and add-on users.

## 🐛 Bug fixes

- Add-on release images now publish for stable version tags as well as beta tags.

## ⚡ Improvements

- Home Assistant setup guidance now explains when to use the HACS custom panel and when to use the add-on.

## 0.1.1 - 2026-05-20

Navet stabilizes the Home Assistant custom panel release with better update metadata, more reliable panel loading, and expanded localization.

## ✨ New features

- You can now use Navet in Chinese, Italian, and Portuguese (Brazil).
- Home Assistant add-on users now see a clear reminder to move to the HACS custom panel setup.

## 🐛 Bug fixes

- HACS updates now use the `0.1.1` release version instead of showing the latest branch commit as the available version.
- The Home Assistant update dialog can point release announcements at a real GitHub release tag instead of a commit link.
- Media artwork now loads more reliably in the Home Assistant custom panel.
- The custom panel now loads its styles before showing the dashboard.
- The custom panel works better inside Home Assistant by running in its own frame.
- Panel notifications and other live updates work better when Home Assistant provides a websocket connection.
- Home Assistant now receives a fresh panel bundle after custom panel updates.
- The dashboard no longer gets stuck on "Loading devices..." for affected users.
- Celsius/Fahrenheit and 12-hour/24-hour settings now update displayed units and time formats correctly.

## ⚡ Improvements

- Room navigation now scrolls when there are too many rooms to fit in the available space.
- Dashboard cards, colors, and Home Assistant panel URLs are more polished.
- HACS setup guidance and Navet brand assets are easier to find.
- App dependencies are refreshed for this release.

## 0.1.1-beta.3 - 2026-05-20

Navet improves HACS update metadata so Home Assistant can point users to release versions.

## 🐛 Bug fixes

- HACS updates now avoid showing the latest branch commit as the available version.
- The Home Assistant update dialog can point release announcements at a real GitHub release tag instead of a commit link.

## 0.1.1-beta.2 - 2026-05-20

Navet improves the Home Assistant custom panel experience and makes media artwork more reliable.

## ✨ New features

- You can now use Navet in Chinese, Italian, and Portuguese (Brazil).
- Home Assistant add-on users now see a clear reminder to move to the HACS custom panel setup.

## 🐛 Bug fixes

- Media artwork now loads more reliably in the Home Assistant custom panel.
- The custom panel now loads its styles before showing the dashboard.
- The custom panel works better inside Home Assistant by running in its own frame.
- Panel notifications and other live updates work better when Home Assistant provides a websocket connection.
- Home Assistant now receives a fresh panel bundle after custom panel updates.
- The dashboard no longer gets stuck on "Loading devices..." for affected users.
- Celsius/Fahrenheit and 12-hour/24-hour settings now update displayed units and time formats correctly.

## ⚡ Improvements

- Dashboard cards, colors, and Home Assistant panel URLs are more polished.
- Room navigation now scrolls when there are too many rooms to fit in the available space.
- HACS setup guidance and Navet brand assets are easier to find.
- App dependencies are refreshed for this beta.

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
