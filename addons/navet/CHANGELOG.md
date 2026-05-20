# Changelog

## 0.1.12

- Updated Navet to `0.1.2`
- Published add-on images for stable version tags as well as beta tags
- Clarified when to use the HACS custom panel and when to use the add-on

## 0.1.11

- Updated Navet to `0.1.1`
- Published the current Navet release as a stable GitHub release for HACS users
- Fixed HACS update metadata so Home Assistant uses release versions instead of branch commit SHAs
- Fixed release announcement links opening a missing GitHub commit-based release page
- Included the custom panel loading, media artwork, localization, unit, time format, and room navigation fixes from the beta line

## 0.1.10

- Updated Navet to `0.1.1-beta.3`
- Fixed HACS update metadata so Home Assistant uses release versions instead of branch commit SHAs
- Fixed release announcement links opening a missing GitHub commit-based release page

## 0.1.9

- Updated Navet to `0.1.1-beta.2`
- Fixed media artwork loading in the Home Assistant custom panel
- Fixed dashboards getting stuck on "Loading devices..." for affected users
- Fixed Celsius/Fahrenheit and 12-hour/24-hour settings so units and time formats update correctly
- Added scrolling room navigation for dashboards with more rooms than available space
- Re-enabled the custom panel setup notice for Home Assistant add-on users
- Improved custom panel style loading, iframe embedding, and live update support
- Added Chinese, Italian, and Portuguese (Brazil) language support

## 0.1.8

- Updated Navet to `0.1.1-beta.1`
- Added section-focused dashboard surfaces for media, security, and device layouts
- Added Home Assistant `water_heater` entities to the HVAC card flow
- Improved hosted/authenticated app, login, and error-display behavior
- Added HACS repository metadata for custom repository installs (WIP)

## 0.1.7

- Updated Navet to `0.1.0-beta.4`
- Polished the login experience for hosted and authenticated Home Assistant setups
- Fixed Home Assistant add-on ingress routing for Navet internal endpoints, including dashboard profile/session APIs and RSS proxying
- Fixed runtime credential loading for Docker and add-on deployments
- Fixed authenticated media artwork and album art loading
- Improved HVAC mode controls, entity synchronization, and temperature/status labels
- Fixed lock, cover, RSS, and slide-action dashboard card interactions
- Fixed hosted demo and GitHub Pages asset paths
- Added dashboard profile/session sync so deployed dashboards can persist state across browser sessions
- Expanded automated coverage for Home Assistant connections, dashboard endpoints, media artwork, cards, RSS feeds, and sessions

## 0.1.6

- Refreshed Home Assistant add-on bundle for release maintenance

## 0.1.5

- Added Home Assistant add-on presentation assets for the store view
- Added add-on changelog metadata
- Fixed ingress asset/logo path handling for the embedded Navet UI

## 0.1.4

- Fixed logo asset paths in the sidebar, onboarding dialog, and dashboard reveal

## 0.1.3

- Refreshed bundled add-on assets for Home Assistant ingress

## 0.1.2

- Fixed missing frontend chunk in the bundled add-on assets

## 0.1.1

- Forced add-on rebuild after ingress asset fixes

## 0.1.0

- Initial Home Assistant add-on packaging for Navet
