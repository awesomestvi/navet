# Changelog

## 0.7.12 - 2026-07-04

## New

- Dashboard settings now support scoped profile behavior so selected settings can persist per device while shared profile values stay intact during import and export.
- The automation dashboard now has richer summary cards, state filters, room filters, attention states, recent-run metadata, and a cleaner split between automations and scripts.

## Fixed

- Dashboard profile sync now resolves multi-device conflicts more reliably, including working "Keep mine" and "Load remote" actions and stale profile validators after an empty remote profile.
- Climate summaries now ignore target-only thermostat setpoints when no real current temperature is available.
- Powered Home Assistant TVs now count as active media without making idle speakers appear active.
- Room grids now remount when switching rooms so room-specific dashboard state refreshes correctly.

## Improved

- Automation, quick-action, and habit insight cards now use more consistent dashboard card hierarchy and typography.

## 0.7.11 - 2026-07-04

## New

- Dashboard settings now support scoped profile behavior so selected settings can persist per device while shared profile values stay intact during import and export.
- The automation dashboard now has richer summary cards, state filters, room filters, attention states, recent-run metadata, and a cleaner split between automations and scripts.

## Fixed

- Climate summaries now ignore target-only thermostat setpoints when no real current temperature is available.
- Powered Home Assistant TVs now count as active media without making idle speakers appear active.
- Room grids now remount when switching rooms so room-specific dashboard state refreshes correctly.

## Improved

- Automation, quick-action, and habit insight cards now use more consistent dashboard card hierarchy and typography.

## 0.7.10 - 2026-07-02

## Fixed

- Alarm panel cards now show the numeric keypad more reliably when it is needed.

## Improved

- Dashboard profile sync and persistence now behave more reliably across the app, including the Vite and nginx-backed profile-store flows used by hosted installs.
- Kiosk orbit navigation, section cards, and related energy and security dashboard surfaces now use cleaner behavior and more consistent UI handling.
- Storybook inventory and docs coverage now better reflect the current shared UI surface, while obsolete stories have been removed.

## 0.7.9 - 2026-06-29

## New

- Advanced custom sidebar extensions now support up to five quick actions per item for richer in-dashboard shortcuts.

## Improved

- Compact device cards now use denser, more usable layouts across fans, covers, humidifiers, lights, switches, cameras, people, and related dashboard surfaces.
- Room navigation now uses a megamenu-style overflow picker when dashboards have more rooms than fit in the visible tab row.
- Cover cards now use a cleaner compact layout and support tap-to-toggle behavior outside edit mode, making quick open and close actions faster on dense dashboards.

## 0.7.8 - 2026-06-25

## New

- Custom sidebar actions can now open links inside Navet in an iframe-backed panel.
- Navet natively supports Home Assistant kiosk mode so the Home Assistant sidebar and header can be hidden for a full-screen experience. For HACS, read [HOME_ASSISTANT.md](https://github.com/awesomestvi/navet/blob/main/docs/HOME_ASSISTANT.md) to add `extra_module_url` to your config.

## Fixed

- Camera cards now recover WebRTC live-stream startup more reliably again, including signaling, timeout, and fallback cases that regressed in recent releases.
- Home Assistant-hosted mobile dashboards now handle top safe-area spacing more cleanly, and mobile feedback surfaces no longer look overly transparent in affected UI flows.

## Improved

- Large room lists now use more flexible room navigation and room-management flows, including overflow handling, ordering controls, and denser kiosk navigation surfaces.
- Toasts, banners, lock controls, and related dashboard surfaces now use clearer contrast and cleaner styling across mobile, light, and kiosk-oriented UI flows.
- Home Assistant panel and add-on installs now support a cleaner host-shell flow, including optional native Home Assistant header and sidebar hiding when the Navet shell module is enabled.

## 0.7.7 - 2026-06-22

## New

- Energy dashboards now support more customization, including prepaid-style remaining-balance sensors and better control over which energy sensors appear.
- Lawn mower devices can now appear with dedicated dashboard support alongside the broader vacuum and cleaning-device surfaces.

## Fixed

- Demo entities no longer crash Navet in preview and demo flows.

## Improved

- Climate, energy, and cleaning-device cards now use clearer layouts, settings flows, and provider-backed behavior across the updated dashboard sections.
- Card dialogs, widgets, and shared surfaces are more consistent across media, sensors, security, weather, RSS, and related dashboard cards.
- Liquid Glass and Light themes now get more targeted UI polish across shared dashboard surfaces and dialogs.

## 0.7.6 - 2026-06-16

## New

- Dashboards now support custom extensions, including configurable sidebar links for more tailored navigation.

## Improved

- The add-card dialog now uses a denser, pill-driven browsing flow that makes dashboard editing faster on larger card libraries.
- Media cards now handle speaker grouping more cleanly for better multi-speaker control flows.
- Low-energy devices now get smoother framerates when using `Low` visual settings.

## 0.7.5 - 2026-06-14

## Fixed

- Homey sign-in now recovers more reliably in standalone and Docker installs when the provider session handoff needs a fallback path.
- Media cards in standalone Docker installs now apply artwork-derived accent colors more reliably instead of missing the intended palette.

## Improved

- First-run onboarding now includes wallpaper theme selection, which makes initial dashboard setup more polished and easier to personalize.

## 0.7.4 - 2026-06-14

## Fixed

- Dashboard updates now reuse unchanged provider-backed data more aggressively, which reduces unnecessary rerenders and keeps larger dashboards steadier during routine syncs.

## Improved

- Offscreen and dense dashboards now defer more heavy card work, helping mixed-device layouts load and stay responsive on lower-power displays.
- Media cards now pick up artwork palette and accent colors more effectively, giving album art and playback surfaces a clearer visual match.
- Media, camera, and shared device cards now adapt their visual effects and update behavior more carefully under load for smoother everyday use.

## 0.7.3 - 2026-06-13

## New

- TV media dialogs now split TV controls from music playback, with clearer source badges and better compact remote layouts.
- Home Assistant update notifications now clean up HTML-heavy release notes and surface restart-required updates more clearly.

## Fixed

- Vacuum cards now prefer the live entity state, so cleaning status and current room details stay more accurate while a run is active.
- Room assignment dialogs now keep the intended room selected more reliably when only a fallback room name is available.

## Improved

- Dense dashboards now switch into a lighter performance mode on lower-tier or low-power devices to reduce heavy rendering work.
- Device collection updates now preserve unchanged entries more aggressively, which cuts unnecessary dashboard rerenders during provider updates.

## 0.7.2 - 2026-06-13

## New

- Vacuum cards now support area cleaning and richer device-specific controls for supported Roborock models.
- Media cards now add repeat and shuffle controls, plus better TV control handling for supported players.
- Navet Dev is now available as a nightly add-on channel, with clearer Nightly, Beta, and Stable build labels in the app.

## Fixed

- Apple Music and Music Assistant artwork now appears more reliably again, including grouped-player and local-artwork cases that previously stayed blank.
- Room assignment, media dialogs, and shared device controls now stay more readable for mixed-device dashboards with repeated names.

## Improved

- Media cards now handle artwork, source selection, and unsupported TV controls more cleanly across different player capabilities.
- Preview and demo runtimes now mirror more real dashboard actions, which makes release previews and local testing behave more like live integrations.

## 0.7.0 - 2026-06-09

## New

- Vacuum cards now show richer controls, cleaning details, and device-specific status for supported robot vacuums such as Roborock models.

## Fixed

- Media cards now recover Apple Music and Music Assistant album artwork more reliably in Home Assistant setups where artwork previously stayed blank.
- Dashboard views no longer risk full refresh-style interruptions during routine updates, which makes shared wall-panel displays feel steadier.

## Improved

- Security cards now use clearer alarm-state styling and more readable dashboard summaries for armed, disarmed, pending, and alert states.
- Climate, energy, and dashboard status surfaces now give clearer device feedback, while install guidance is easier to follow across supported deployment flows.

## 0.6.1 - 2026-06-07

## Fixed

- Weather and calendar cards on the Home dashboard now stay visible more reliably on low-power displays, including while adding or restoring Home cards.

## 0.6.0 - 2026-06-07

## New

- Alarm panel entities can now appear as dashboard cards with provider-aware arming status and controls.
- Humidifier entities can now appear as dashboard cards with direct mode, power, and target humidity controls.

## Fixed

- Camera cards now recover Home Assistant HLS and MJPEG fallback playback more reliably and keep stream preferences available from card settings.

## Improved

- Security dashboards now organize cameras, alarm states, and summaries more clearly for faster monitoring.
- Home overview, room navigation, and dashboard device grouping now handle larger mixed-device setups more cleanly.
- Dashboard loading and provider-backed data updates are more reliable across Home Assistant, Homey, and openHAB integrations.

## 0.5.3 - 2026-06-05

## Fixed

- Energy dashboard daily usage now respects the source unit so totals no longer show the wrong kWh values when the sensor reports Wh.
- Media cards keep room selections readable and continue showing the intended speaker names more reliably, even when a speaker is temporarily offline.

## Improved

- Light cards now keep their controls clearer when a device does not expose brightness controls.
- Energy dashboard totals, statistics views, and current-usage presentation are clearer and more reliable across supported configurations.
- Dark, light, and liquid glass themes now use more consistent card, media, and shared surface styling for clearer readability.
- Photo frame demos and related dashboard previews now ship with bundled sample imagery for more realistic defaults.

## Documentation

- Release and architecture guidance now better reflect the current package layout and release surfaces.

## 0.5.2 - 2026-06-04

## Fixed

- Home Assistant camera playback now recovers live streams, transport fallback, and authenticated sessions more reliably across standalone, ingress, and panel use.
- Camera settings dialogs stay usable with long accessory lists and on smaller screens instead of overflowing or hiding controls.
- Tagged release metadata and HACS sync behavior stay aligned more reliably across the main Navet repository and the exported `navet-hacs` release surface.

## Improved

- Compact dashboard cards use clearer layouts, and light controls avoid brightness and toggle flicker during fast updates.

## Documentation

- Release and shared UI docs now point at the current package paths and repo split so maintainer workflows match the live project structure.

## 0.5.1 - 2026-06-03

## Fixed

- HACS can identify Navet as a Home Assistant integration again when adding the GitHub repository as a custom repository.
- Home Assistant custom-panel packaging is restored at the repository root so HACS releases and installs resolve the expected integration files.

## 0.5.0 - 2026-06-03

## New

- Camera cards can now refresh Home Assistant snapshots directly while keeping live and fallback viewing available from the same card.

## Fixed

- Home Assistant camera playback now handles WebRTC session events more reliably and avoids breaking when a preferred live stream transport is unavailable.
- Camera snapshot and MJPEG playback now keep using the current provider URLs, so refreshed images and fallback streams stay in sync.

## Improved

- Camera cards now show clearer stream status and refresh controls across live, snapshot, and fallback viewing modes.
- Camera settings are simpler, with playback controls focused on supported viewing behavior instead of global go2rtc overrides.

## 0.4.7 - 2026-06-02

## New

- The website and marketing experience now ship with a broader visual refresh, richer product storytelling, and updated screenshots across device layouts.
- New wallpapers were added.

## Improved

- Settings and section-level management flows are clearer across the refreshed app surfaces.
- Wallpaper, media, and marketing assets are organized more cleanly for release packaging and future publishing work.

## 0.4.6 - 2026-06-02

## New

- Dashboard headers can now switch between an automatic greeting, custom text, or a live date-and-time title for easier shared-display layouts.

## Fixed

- Home Assistant add-on ingress now restores provider-backed setup and session flows more reliably.
- openHAB sign-in now fails earlier and more clearly instead of crashing during login.
- Widget and RSS cards now reopen their settings reliably from shared dashboard edit actions.

## Improved

- Homey sign-in and callback handling are more reliable across hosted and local setup flows.
- Provider settings use clearer labels and management actions.
- User avatar and identity details render more consistently.

## 0.4.5 - 2026-06-01

## Fixed

- Switch cards now show their settings reliably again in dashboard edit mode.
- Adding openHAB to an existing setup no longer crashes the app during connection setup.
- Home Assistant alerts now render correctly again in the dashboard.


## 0.4.1 - 2026-05-30

## Fixed

- Home dashboard edit mode no longer risks a React render loop when card grids read dashboard effects settings.

## Improved

- Home Assistant setup guidance is now consolidated into a single deployment guide, with updated README and docs links.
- Public deployment hardening guidance now lives directly in the security policy for easier release review and operator checks

## 0.4.0 - 2026-05-30

## New

- Settings now include a dedicated experimental section for keep-device-awake controls and clearer provider connection cards in System.

## Fixed

- Home dashboard cards backed by weather and calendar devices no longer disappear unexpectedly during dashboard use.
- Shared dashboard snapshots, Home Assistant entity runtime updates, and resource-backed cards restore more consistently after provider changes.

## Improved

- Light and climate sections now group devices more clearly, while dashboard loading avoids unnecessary heavy device work on wall panels and low-power displays.
- Map widgets now defer their heavier loading work so dashboards become interactive sooner.
- Map widgets, notifications, update candidates, and media grouping behave more predictably when provider data changes.

## 0.3.1 - 2026-05-30

## New

- Homey is now available through its standalone OAuth login flow.
- openHAB is now available through the standalone URL-session flow.
- Navet now ships real provider-neutral package surfaces for `@navet/core`, `@navet/ui`, provider packages, and `@navet/app`.

## Fixed

- Custom action card configuration fields now keep their values reliably instead of unexpectedly clearing during editing.
- Login recovery, callback handling, and shipped artwork assets are more reliable in standalone deployments.

## Improved

- Light button cards now show brightness controls more appropriately and avoid misleading color treatment when the entity does not support the same lighting behavior.
- Media cards now show artwork more efficiently.
- Provider validation, boundary checks, and release workflows now better protect Home Assistant, Homey, and openHAB behavior.
- Internal provider runtime, registration, and snapshot handling are cleaner, making shared dashboard features work more consistently across providers.

## 0.3.0 - 2026-05-27

Navet expands dashboard widgets and device controls while making Home Assistant sign-in and proxy-backed resources more reliable.

## New

- UPS widgets can now show battery, status, load, runtime, and related power details directly on the dashboard.
- Sensor cards and widgets can now show recorder-backed history sparklines for easier at-a-glance trends.
- Dashboard settings now include a keep-device-awake option for shared displays and wall panels.

## Fixed

- Hosted Home Assistant sessions recover more reliably after OAuth redirects, stale stored tokens, and same-origin resource requests.
- Ingress sessions now reuse the parent Home Assistant connection instead of opening conflicting fallback sessions and websockets.
- Camera snapshots and other Home Assistant proxy-backed resources now keep stable URLs, reducing flicker and failed authenticated loads.

## Improved

- Light cards now expose effect controls more clearly and keep effect state in sync more reliably.
- Camera settings, live stream handling, and snapshot behavior are more predictable across dashboard and hosted setups.
- Dashboard profile syncing is quieter and more reliable, with fewer unnecessary saves and better conflict handling.

## 0.2.5 - 2026-05-25

Navet fixes dashboard restore and empty Home dashboard behavior for users updating from `0.2.4`.

## Fixed

- Imported dashboard configs now restore Home cards correctly, including configs exported with the older persisted layout wrapper.
- Home no longer gets stuck on "Still loading devices" when an imported layout contains stale demo or unavailable card ids.
- Removing the final Home card now leaves the empty dashboard state instead of a loading recovery error.
- Home summary chips now sit outside the empty-state card and keep spacing consistent with the card grid.

## 0.2.4 - 2026-05-25

Navet improves dashboard behavior for wall panels and broadens support for everyday Home Assistant devices.

## New

- Kiosk mode can now hide the standard sidebar and topbar for cleaner wall-panel and tablet displays.
- Single sensors, binary sensors, scripts, scenes, and more device classes can now appear directly as dashboard cards.
- Dashboard navigation now includes compact home-status summaries for lights, climate, media, security, and energy.

## Fixed

- HVAC cards now follow Home Assistant entity updates more reliably, including Nest-style climate entities and Fahrenheit setups.
- Media playback commands now handle TV, Spotify, and Android TV integrations more reliably.
- Sensor cards now display timestamp-style values using the configured local time instead of falling back to GMT.

## Improved

- Rooms can now be hidden without deleting their dashboard content.
- Light controls now keep an accessible power toggle available when tap behavior is set to open controls.
- Dashboard layout, room navigation, security camera grouping, and device editing are more consistent across desktop, mobile, and kiosk views.

## 0.2.3 - 2026-05-24

Navet moves Home Assistant sign-in to OAuth and hardens upgrades from older token-based setups.

## New

- Home Assistant login now uses OAuth instead of the legacy long-lived token flow.

## Fixed

- Importing an older dashboard config no longer breaks the OAuth-based app session.
- Add-on ingress websocket routing is more reliable after Home Assistant restarts.
- Add-on installs tolerate stale `hass_url` and `token` options left over from older releases.

## 0.2.2 - 2026-05-22

Navet improves Home Assistant add-on login and ingress reliability.

## Fixed

- Add-on login sessions are restored more reliably after refreshes.
- Add-on media artwork, assets, and local endpoints now stay behind the Home Assistant ingress path.

## Improved

- Add-on users should leave Home Assistant URL and token configuration blank, then sign in from the Navet login page.
- Camera cards can use direct go2rtc WebRTC feeds outside the Home Assistant custom panel.

## 0.2.1 - 2026-05-22

Navet adds fan control and improves dashboard cards for common Home Assistant setups.

## New

- Fan entities can now appear as dashboard cards with direct controls for power, percentage, oscillation, direction, preset modes, and supported fan speeds.
- Climate card settings now expose fan controls when Home Assistant reports fan support for the HVAC entity.

## Fixed

- Climate cards now avoid converting already-Fahrenheit values again, preventing incorrect readings such as extremely high Fahrenheit temperatures.
- Dashboard widgets now show clearer empty states when they have no usable entities, actions, or energy data yet.

## Improved

- Camera cards now document and expose the supported feed choices: Auto, Live, and Snapshot view modes, plus Auto, WebRTC, HLS, and MJPEG live-feed selection with fallback.
- Card and widget controls have more consistent interaction styling across dashboard, settings, and edit flows.

## 0.2.0 - 2026-05-22

Navet adds new dashboard controls and improves live card behavior while making the app load more efficiently.

## New

- Sensor Group widgets can now collect multiple sensor readings into one compact card with room, name, accent, and settings controls.
- Climate cards now include preset temperature controls for faster HVAC adjustments.
- Camera cards now make live-feed refresh behavior easier to use.

## Fixed

- Cover cards now support more Home Assistant cover entities and handle position controls more reliably.

## Improved

- Dashboard cards, widgets, and media controls load in smaller chunks so dashboards become interactive faster.
- Energy and RSS data are cached more effectively to reduce duplicate requests.
- Media, sensor, RSS, camera, and cover card flows have clearer controls and more consistent editing behavior.
- Release and setup documentation now matches the current public beta, add-on, and Storybook publishing paths.

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
- Fixed hosted website and demo asset paths for sidebar imagery, theme assets, RSS images, and hosted base paths.
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
- Enabled the Cloudflare Pages website bundle flow for the demo and Storybook publishing surfaces.
- Clarified release publishing workflows for prerelease app images, add-on images, and manual developer image runs.
- Expanded release-maintenance documentation and agent instructions for preparing future release work.

### Verification Notes

Before tagging the release, run:

- `pnpm test`
- `pnpm check`
- `pnpm typecheck`

Manual release checks should cover login, Home Assistant hosted/add-on ingress, HVAC controls, lock and cover cards, media artwork, hosted website/demo asset loading, and Docker runtime config loading.
