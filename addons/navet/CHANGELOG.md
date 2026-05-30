# Changelog

## 0.4.1

- Updated Navet to `0.4.1`
- Fixed a Home dashboard edit-mode render loop that could break card-grid editing
- Consolidated Home Assistant setup docs and moved public deployment hardening guidance into the main security policy

## 0.4.0

- Updated Navet to `0.4.0`
- Added clearer system/provider settings and a dedicated experimental keep-device-awake section
- Fixed weather and calendar cards disappearing from Home dashboards
- Improved dashboard responsiveness by deferring heavier map widget loading work
- Improved dashboard section loading, shared snapshot handling, and provider-backed card reliability

## 0.3.1

- Updated Navet to `0.3.1`
- Fixed custom action card fields clearing during editing
- Improved light button card brightness and color behavior
- Media cards now show artwork more efficiently

## 0.3.0

- Updated Navet to `0.3.0`
- Added UPS widgets, sensor history sparklines, and a keep-device-awake dashboard setting
- Fixed hosted OAuth session recovery and ingress Home Assistant connection reuse
- Improved Home Assistant proxy handling for camera snapshots and other authenticated resources
- Refined light effect controls, camera behavior, and dashboard profile sync reliability

## 0.2.5

- Updated Navet to `0.2.5`
- Fixed dashboard config imports so Home cards restore correctly from recent exports
- Fixed Home dashboards getting stuck on "Still loading devices" after stale imported card ids or removing the final card
- Improved Home summary spacing when the dashboard is empty or showing cards

## 0.2.4

- Updated Navet to `0.2.4`
- Added cleaner kiosk-mode dashboard behavior for wall panels and tablets
- Added direct dashboard cards for single sensors, binary sensors, scripts, scenes, and more device classes
- Added compact dashboard summaries for lights, climate, media, security, and energy
- Fixed HVAC card updates for Nest-style climate entities and Fahrenheit setups
- Fixed media playback commands for TV, Spotify, and Android TV integrations
- Fixed sensor timestamp display so local time is used instead of GMT
- Added hidden-room support without deleting dashboard content

## 0.2.3

- Updated Navet to `0.2.3`
- Replaced legacy long-lived token login with Home Assistant OAuth
- Fixed old dashboard config imports breaking the new OAuth session flow
- Improved add-on ingress websocket reliability after Home Assistant restarts
- Add-on installs now tolerate stale `hass_url` and `token` options from older releases

## 0.2.2

- Updated Navet to `0.2.2`
- Improved add-on login, ingress proxying, and media artwork loading
- Add-on users authenticate through Home Assistant Ingress without `hass_url` or `token` options
- Direct port `8099` users now sign in with Home Assistant OAuth instead of manually configured
  long-lived tokens
- Added direct go2rtc WebRTC camera feed support outside the Home Assistant custom panel

## 0.2.1

- Updated Navet to `0.2.1`
- Fixed Home Assistant add-on Ingress proxy setup when Home Assistant URL config is blank
- Added fan dashboard cards with power, percentage, oscillation, direction, preset, and speed controls
- Added fan controls to supported HVAC card settings
- Fixed Fahrenheit climate readings being converted twice
- Improved empty states for dashboard widgets without configured data
- Added explicit camera feed choices for Auto, Live, and Snapshot view modes, plus Auto, WebRTC, HLS, and MJPEG live-feed selection with fallback

## 0.2.0

- Updated Navet to `0.2.0`
- Added Sensor Group widgets for compact multi-sensor dashboard summaries
- Added HVAC preset temperature controls
- Improved camera live-feed refresh behavior
- Improved cover card support and position controls
- Optimized dashboard loading with lazy card/widget chunks and reduced duplicate energy/RSS requests
- Updated release, setup, roadmap, and Storybook documentation for the current public beta

## 0.1.13

- Updated Navet to `0.1.3`
- Fixed Docker media artwork loading
- Fixed dashboard navigation unexpectedly returning to the unassigned room tab
- Added cover card drag controls, card locking, and editable custom card names
- Refined card dialogs, scrollbars, slide actions, and add-on setup guidance

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
