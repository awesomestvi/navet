# Navet tutorial series: plan and production checklist

Created: 2026-09-05. Status: topic planning complete; A07 produced as a **6:28 live narrated
walkthrough**, in Dark theme with Orange accent and no added explanatory sidebar. The user approved the pilot; it is
[published on Navet YouTube](https://youtu.be/XEjrLwt5xiQ). See the [A07 brief](2026-09-05-a07-onboarding.md).

This is a working catalogue of 79 candidate tutorials covering the current documented product
and additional implemented surfaces. Start with the 12 requested-topic episodes below, then
choose the next batch. The catalogue is a backlog, not a commitment to produce every episode.
Lengths are editorial estimates; allow enough time to demonstrate and explain the complete task.

## Series approach

Help someone achieve one clear result in each video. Assume they are a household member or
self-hosting user, not a Navet developer. Most videos should be 4–7 minutes; focused controls can
take 3–4 minutes, and installation or complex setup can take 7–10 minutes.

Production default: English Juniper narration, a 1920 × 1080 landscape master at 30 fps for the tutorial
library and docs, and optional short extracts after the full lesson is finished. Platform and
release cadence remain decisions for the next step. Do not pad a short task to meet a runtime.

Use the selected Juniper voice from the [27.5-second tour](2026-09-05-navet-motion-promo.md),
with the user's updated tutorial format:

- Record the real application viewport, including clicks, pointer movement, and resulting states.
- Use **Dark theme and Orange accent**, with no added explanatory sidebar or browser chrome.
- Keep controls readable and match narration to the visible action; pause on choices and results.
- Generate fresh Juniper narration for each lesson. Use voice alone for the pilot.
- Include chapter markers and synchronized optional captions, plus a separate SRT file.
- Prepare a repeatable starting state for each workflow. A07 uses the explicitly authorized
  connected household; verify the demonstration data for each subsequent episode.

The pilot's [editable-source instructions](../../../.cache/navet-content/tutorial-series/a07-onboarding/README.md)
document continuous video sources, original narration, captions, source trims, and FFmpeg
assembly. Use this viewport composition and pacing as the pilot for review.

### Repeatable episode structure

| Part | What the viewer sees and learns |
|---|---|
| Result, first 10–15 seconds | Show the finished dashboard, speaker group, chore, or other outcome. |
| Starting point | Identify the screen, required setup, and any relevant provider or device requirement. |
| Guided task | Show each necessary action, explain meaningful choices, and show the saved result. |
| Variations | Explain the useful alternatives without repeating the entire basic workflow. |
| Common snag | Demonstrate one likely mistake, missing control, or recovery step. |
| Finish | Verify the result and point to one relevant next tutorial. |

### Availability and evidence

The catalogue was checked against local docs and selected current UI implementations. It is not
a claim that all 79 workflows have been exercised in a running build. Every episode needs a
capture rehearsal on the version being recorded.

**Required for every episode:** cross-check the existing implementation and actual supported
features before reusing any doc or Markdown claim. Rehearse the relevant UI, then update every
discrepant current guide or working plan encountered in that episode's scope. Record source
symbols, the build/date, and the verification limits in the episode evidence ledger.

The A07 audit found that the current public demo is a preset presentation and does not mount the
full dashboard onboarding/editing flow. Use the exact Storybook component for isolated UI
verification; use a connected test installation or a verified integrated fixture for complete
onboarding, saved layouts, import, and persistence footage. Do not treat a demo or Storybook
callback as proof that an installed workflow completed.

- **Core:** Navet dashboard/presentation features; entity controls still depend on the connected
  provider and device. Server-backed synchronization additionally depends on deployment.
- **HA:** Advanced services currently supplied by Home Assistant. Homey and openHAB currently
  cover rooms, realtime entities, lighting, switches, and sensors. Do not imply advanced parity.
- **Chores:** Requires the Home Assistant add-on, or standalone Navet paired with a trusted
  Home Assistant installation. Native chores are unavailable in the custom panel and in
  Homey-only/openHAB-only installations.
- **Capture check:** A candidate whose specific controls or demonstration environment need
  closer verification before scripting. **Experimental** topics must be identified as such.

Use the [capability matrix](../../../docs/integrations.md#capability-matrix) and
[chores availability](../../../docs/chores.md#where-chores-are-available) as the starting references.
Keep provider requirements in the relevant episode's introduction and description.

## First production batch

These 12 episodes cover the topics explicitly requested, in a useful learning order. Begin with
A07 as the pilot; use it to settle narration pace, zoom level, caption position, and chapter style
before making the rest. A07 starts with Navet installed and now includes standalone Home Assistant login; link to the appropriate
installation episode or existing guide for that prerequisite.

| Order | ID | Episode | Target length | Dependency |
|---|---|---|---|---|
| 1 | A07 | Onboarding: from first launch to your first Home | 6–8 min | Connected installation |
| 2 | B01 | Set up a dashboard from start to finish | 7–10 min | A07 |
| 3 | A10 | Change theme and accent | 4–5 min | A07 |
| 4 | C01 | Start music and choose the right speaker | 4–5 min | Compatible HA player |
| 5 | C02 | Music player controls in depth | 5–7 min | C01 |
| 6 | C04 | Create a group of speakers | 5–7 min | C01; compatible speakers |
| 7 | D01 | Set up Household and chores | 7–10 min | Chores-capable installation |
| 8 | D02 | Add and customize a chore | 5–7 min | D01 |
| 9 | D09 | Choose how your household uses points | 4–5 min | D01 |
| 10 | D10 | Earn points and understand the balance | 4–6 min | D02, D09 |
| 11 | D11 | Add points manually | 3–4 min | D10; manager access |
| 12 | D12 | Remove points and correct a balance | 3–4 min | D10; manager access |

Follow with C03/C05 for media, D03–D08 for chore management, and D13–D17 for goals, progress,
and recovery. Installation videos can run as a separate beginner playlist. Remaining B and E
topics can be selected from questions raised by the first batch. No publishing dates are set yet.

## Complete topic checklist

Tick an episode only when its full tutorial has passed review. An unchecked box means it is still
in the backlog or in production. Publishing is tracked separately. IDs remain stable if the
production order changes.

### A. Getting started and personal appearance — 13 episodes

Prerequisite for A07: installed Navet and the Home Assistant login used for this pilot.
A08–A13 need a connected installation; a prepared demo is suitable only where the specific flow is implemented.

- [ ] **A01 — Choose the right way to run Navet** (4–6 min). Compare the Home Assistant
  add-on/App, HACS panel, and standalone Docker routes; explain which route fits the viewer's
  setup and where native chores are available. End with a chosen installation path.
  [Source](../../../docs/installation.md)
- [ ] **A02 — Install the Home Assistant add-on/App** (7–10 min; HA; capture check).
  Walk through the current installation guide, configuration, launch through Ingress, and first
  successful dashboard load. Show the recovery path for a failed start.
  [Source](../../../docs/HOME_ASSISTANT.md)
- [ ] **A03 — Run Navet with Docker** (7–10 min; capture check). Prepare persistent storage,
  start Navet, approve the trusted Home Assistant connection, sign in, and verify data survives
  a restart. Use a disposable demonstration installation.
  [Source](../../../docs/HOME_ASSISTANT.md)
- [ ] **A04 — Install Navet as a HACS custom panel** (6–8 min; HA; capture check).
  Complete installation, panel configuration, loading, and basic update/reload troubleshooting.
  Explain the panel's chores limitation at the beginning.
  [Source](../../../docs/HOME_ASSISTANT.md)
- [ ] **A05 — Connect Navet to Homey** (5–7 min; capture check). Complete the supported OAuth
  flow, verify rooms and devices, and demonstrate a supported light or switch. Explain current
  feature availability. [Source](../../../docs/HOMEY.md)
- [ ] **A06 — Connect Navet to openHAB** (5–7 min; capture check). Enter the reachable base URL
  and supported credentials, verify rooms/items, and demonstrate basic control. Include a
  connection troubleshooting example. [Source](../../../docs/OPENHAB.md)
- [x] **A07 — Onboarding: from first launch to your first Home** (6–8 min; Core; first batch).
  Show standalone Home Assistant connection/login, then explain the all-entities, blank, and import routes. All/blank continue through language,
  time, temperature, manual theme, accent, and built-in wallpaper; YAML import restores directly.
  Finish the welcome reveal, explore room cards, and add the first card to the separate Home layout.
  Show where first-run choices can be restarted. Keep Dark theme and Orange accent throughout.
  [UI reference](../../../packages/app/src/features/dashboard/components/dashboard-onboarding-dialog/index.tsx)
  · [Recovery guide](../../../docs/how-to/dashboards/restore-entities.md)
- [ ] **A08 — Your first 15 minutes with Navet** (6–8 min; Core). Tour sections, the Home overview and
  individual rooms, summary states, card actions, and Settings. The overview is labelled Home or
  the active dashboard name. Make and undo one layout change.
  This is a daily-use orientation; A07 covers first-run setup.
  [Source](../../../docs/how-to/quick-start/first-15-minutes.md)
- [ ] **A09 — Use Navet on a phone or tablet** (4–6 min; Core). Install the PWA where supported,
  open it from the home screen, navigate touch controls, and check portrait/landscape behavior.
  [Sources](../../../docs/how-to/quick-start/install-pwa.md)
  · [Phone/tablet guide](../../../docs/how-to/quick-start/phone-and-tablet.md)
- [ ] **A10 — Change theme and accent** (4–5 min; Core; first batch). Compare Liquid Glass,
  Dark, Light, and Black on the same dashboard; show automatic appearance and built-in/custom
  accents. End with a clear before/after. [Source](../../../docs/how-to/settings/appearance.md)
- [ ] **A11 — Personalize wallpapers and light-card ambience** (4–5 min; Core). Apply a built-in
  wallpaper, upload an image, remove it, and compare Ambient bleed with Contained. Check
  readability on the actual dashboard. [Source](../../../docs/how-to/settings/appearance.md)
- [ ] **A12 — Set language, clock format, and temperature units** (3–4 min; Core). Change each
  setting and verify the effect on a representative card; explain provider-supplied names.
  [Source](../../../docs/how-to/settings/localization.md)
- [ ] **A13 — Choose what happens when you tap a card** (3–4 min; Core). Compare toggle-first
  and control-first behavior on supported cards and pick a useful shared-screen default.
  [Source](../../../docs/how-to/settings/card-interactions.md)

### B. Dashboards, rooms, and household screens — 17 episodes

Prerequisite: A07 or familiarity with Home. B13–B15 require registered screens and a deployment
that supports the relevant server-backed profile features. Use B01 as the broad starting lesson;
the remaining videos explain its individual choices in more detail.

- [ ] **B01 — Set up a dashboard from start to finish** (7–10 min; Core; first batch). Start
  with a simple Home, choose the important rooms and controls, add cards, arrange sections and
  columns, resize, lock, save, and check the finished dashboard on a narrow screen.
  [Source](../../../docs/how-to/dashboards/customize-home.md)
- [ ] **B02 — Add, find, and configure cards and widgets** (5–7 min; Core). Use the library,
  search and filters, choose a room and size, configure a card, and handle an entity that is
  already present or hidden. [Source](../../../docs/how-to/dashboards/add-cards.md)
- [ ] **B03 — Start with a layout pack** (4–6 min; Core). Preview an appropriate pack, apply it
  to the intended dashboard, explain its effect on existing layout, then refine the result.
  [Source](../../../docs/how-to/dashboards/layout-packs.md)
- [ ] **B04 — Create a second dashboard** (5–7 min; Core). Build a kitchen or security-focused
  Home from selected rooms, a copy, or a blank layout. Compare the starting choices and finish
  with two distinct usable dashboards. [Source](../../../docs/how-to/dashboards/create-second-dashboard.md)
- [ ] **B05 — Switch, duplicate, rename, and manage dashboards** (4–6 min; Core). Use the
  dashboard manager, order dashboards, choose a default, and demonstrate deletion on a temporary
  example. [Source](../../../docs/how-to/dashboards/switch-and-manage.md)
- [ ] **B06 — Organize rooms into household groups** (5–7 min; Core). Create Upstairs and
  Downstairs, reorder rooms, choose favorites, hide a navigation entry, and review pending
  changes before saving. [Source](../../../docs/how-to/rooms/organize-rooms.md)
- [ ] **B07 — Customize the appearance of a room** (4–5 min; Core). Change the available room
  presentation settings and compare the room in navigation and its dashboard.
  [Source](../../../docs/how-to/rooms/room-appearance.md)
- [ ] **B08 — Manage devices and room assignments** (5–7 min; capability-dependent). Find a
  device, inspect its entities, change its supported presentation or room assignment, and read
  what changes in Navet versus the connected system.
  [Source](../../../docs/how-to/rooms/manage-devices.md)
- [ ] **B09 — Rename, merge, split, and delete rooms** (7–9 min; administration-dependent).
  Use disposable rooms to explain each structural operation, review affected devices, and
  demonstrate how partial provider success is reported.
  [Source](../../../docs/how-to/rooms/advanced-room-management.md)
- [ ] **B10 — Hide and restore dashboard entities** (3–5 min; Core). Distinguish hiding an
  automatic entity from deleting a widget, restore a hidden card, and explain when to restart
  onboarding. [Source](../../../docs/how-to/dashboards/restore-entities.md)
- [ ] **B11 — Add custom sidebar shortcuts** (4–6 min; Core). Create an internal destination,
  an external link, and an embeddable-page example where allowed; verify the saved shortcut and
  explain a blocked embed. [Source](../../../docs/how-to/settings/sidebar-extensions.md)
- [ ] **B12 — Back up and restore dashboard configuration** (5–7 min; Core). Export a backup,
  make a temporary layout change, import the backup, and verify the result. Explain when a
  server-backed revision is available. [Source](../../../docs/how-to/dashboards/backup-and-restore.md)
- [ ] **B13 — Give each device its own dashboard** (4–6 min; server-backed). Name a kitchen
  tablet and a phone, assign different dashboards, and explain default versus assigned
  dashboards. [Source](../../../docs/how-to/dashboards/assign-to-device.md)
- [ ] **B14 — Synchronize household screens** (6–8 min; server-backed). Compare shared
  dashboard structure with device-owned display settings. Demonstrate Copy to devices, a sync
  group, removing a screen from that group, and connection status.
  [Source](../../../docs/how-to/dashboards/sync-across-devices.md)
- [ ] **B15 — Resolve a dashboard sync conflict** (4–6 min; server-backed). Create a controlled
  conflict in two test browsers, choose local or remote changes, verify the winner, and show
  revision recovery. [Source](../../../docs/how-to/dashboards/sync-conflicts.md)
- [ ] **B16 — Turn a tablet into a wall display** (6–8 min; Core). Apply Wall Display mode,
  use Kiosk control, navigate rooms and sections, enable keep-awake where supported, and show
  how to exit. Include the separate Home Assistant shell option only in that deployment.
  [Source](../../../docs/how-to/wall-displays/kiosk-mode.md)
- [ ] **B17 — Make older wall displays work well** (5–7 min; Core). Compare visual-quality
  settings and reduced effects, check responsiveness, then troubleshoot sleep and kiosk
  recovery on the demonstration device.
  [Sources](../../../docs/how-to/wall-displays/low-power.md)
  · [Recovery](../../../docs/how-to/wall-displays/recovery.md)

### C. Music, speakers, and TV — 7 episodes

Prerequisite: a Home Assistant media service and suitable player entities. Rehearse with two or
three compatible speakers for grouping. Record both idle and active playback states. The
[media guide](../../../docs/how-to/everyday-control/media.md) is the shared source for C01–C07.
Device-specific controls and search/grouping need a capture check before narration is finalized.

- [ ] **C01 — Start music and choose the right speaker** (4–5 min; HA; first batch). Explain
  the idle Media dashboard, select a destination, start an available item, and locate the active
  now-playing session. Finish by pausing and resuming on the intended player.
- [ ] **C02 — Music player controls in depth** (5–7 min; HA; first batch). Demonstrate play,
  pause, next, previous, seek, volume, mute, shuffle, and repeat wherever the selected player
  exposes them. Explain absent controls and changes in the expanded player.
- [ ] **C03 — Browse your media library and search for music** (5–7 min; HA). Navigate sources
  and categories, search where available, inspect a result, and play it on the chosen
  destination. Verify the specific integration before naming music services in the title.
- [ ] **C04 — Create a group of speakers** (5–7 min; HA; first batch). Start a primary
  session, add compatible speakers, verify membership, and demonstrate shared playback.
  Explain how the provider determines compatible destinations and group ownership.
- [ ] **C05 — Change and manage a speaker group** (4–6 min; HA; after C04). Adjust the
  available group/member volume controls, add or remove a room, and show leaving or ending the
  group using the controls actually exposed by the integration.
- [ ] **C06 — Use Navet as a TV remote** (4–6 min; HA). Select the TV, change source, use
  volume and transport/channel controls where available, and demonstrate the navigation pad
  and its visibility setting.
- [ ] **C07 — Fix missing media controls, artwork, or browsing** (4–6 min; HA). Check the
  selected destination, player state, connection, and supported capabilities; demonstrate a
  relevant recovery path and show when the problem belongs to the provider.

### D. Household chores, points, and rewards — 17 episodes

Prerequisite: a chores-capable deployment or prepared equivalent demo, with fictional people,
rooms, chores, and history. D01 establishes the household; D02 establishes a chore. Manager
operations should demonstrate the optional management lock. All point examples use one
consistent balance so viewers can follow the arithmetic.

Primary references: [Household guide](../../../docs/chores.md),
[setup and completion](../../../docs/how-to/everyday-control/household-chores.md), and
[management and recovery](../../../docs/how-to/everyday-control/manage-household-chores.md).

- [ ] **D01 — Set up Household and chores** (7–10 min; Chores; first batch). Complete guided
  setup: people, manager role, appearance, first chores, motivation, and optional PIN. Finish
  with a populated Today view; explain that household profiles are not sign-in accounts.
- [ ] **D02 — Add and customize a chore** (5–7 min; Chores; first batch). Compare starting
  from an available template with a custom chore; set title, icon, instructions, room,
  estimated time, points, and card color. Add it and inspect its resulting card.
- [ ] **D03 — Assign chores fairly** (5–7 min; Chores). Compare One person, Anyone can do it,
  Everyone does it, and Rotate between people using the same example. Show how the resulting
  assignments differ and how a shared chore is claimed.
- [ ] **D04 — Set recurring schedules and missed-work behavior** (6–8 min; Chores). Compare
  one-time, daily, weekly, bi-weekly, tri-weekly, monthly, and after-completion schedules.
  Explain due time, date limits, local time zone, and the supported missed-work options.
- [ ] **D05 — Set chore reminders and quiet hours** (4–6 min; Chores; capture check).
  Configure reminders and personal quiet hours, explain delivery requirements, and show a
  reminder arriving in a controlled demonstration environment.
- [ ] **D06 — Work through Today as a household** (5–7 min; Chores). Select Using this
  screen, read House pulse, claim shared work, mark a chore done, and inspect completed cards,
  overdue work, Home summaries, and room chore cards.
- [ ] **D07 — Approve completed chores or send them back** (4–6 min; Chores). Enable
  approval, submit completion as a participant, approve as a manager, and demonstrate the
  send-back state on a separate example. Verify when completion and points become final.
- [ ] **D08 — Edit, duplicate, pause, archive, and delete chores** (6–8 min; Chores).
  Find work in the library, edit a schedule, duplicate an example, pause/resume, archive/restore,
  and delete a disposable definition. Show the distinction between future work and history.
- [ ] **D09 — Choose how your household uses points** (4–5 min; Chores; first batch).
  Compare Off, Light points, Family goals, and Child-friendly adventure on the same household.
  Explain how optional motivation affects presentation while core chores still work.
- [ ] **D10 — Earn points and understand the balance** (4–6 min; Chores; first batch).
  Start at a known balance, complete a point-bearing chore, and open the person's points view
  from Progress. Explain earned points, current balance, history, and a reversal when work is
  reopened. Use a visible example such as 20 + 10 = 30.
- [ ] **D11 — Add points manually** (3–4 min; Chores; first batch). Unlock management,
  choose a person in Progress, add a whole-number amount with an optional note, review the
  projected balance, save, and verify the history entry. Continue the example: 30 + 5 = 35.
- [ ] **D12 — Remove points and correct a balance** (3–4 min; Chores; first batch). Choose
  Remove points, enter an amount and explanatory note, inspect the projected balance, save,
  and verify the negative history entry. Continue: 35 − 5 = 30; explain that balances can
  become negative and history is retained.
- [ ] **D13 — Create household missions** (5–7 min; Chores). Create a mission using the
  available criteria, set its goal and optional point reward, and show progress and completion
  in the prepared household. Verify the current mission options during rehearsal.
- [ ] **D14 — Set up rewards and savings goals** (5–7 min; Chores). Create personal and
  family goals, explain reward types, target and starting points, and show progress and the
  Ready state. Demonstrate See rewards from Today. Do not describe an automatic redemption or
  spending flow unless a current user-facing control has been verified.
- [ ] **D15 — Review household progress and export history** (4–6 min; Chores). Compare 7
  and 30 days, filter a person, inspect completed/missed work and the upcoming week, explain
  the workload note, and export CSV/JSON. Present contributions without ranking people.
- [ ] **D16 — Manage people and protect planning with a PIN** (5–7 min; Chores). Edit
  participant presentation and roles, retain a manager, configure the management PIN, and
  compare ordinary completion with protected planning actions. Include hiding/re-enabling
  chores from Dashboard settings without deleting data.
- [ ] **D17 — Back up, recover, or reset the chores workspace** (6–9 min; Chores). Download
  a backup, compare Merge and Replace in a disposable workspace, and demonstrate the available
  recovery/reset paths. Explain the difference between a chores backup and a dashboard backup.

Point-control implementation reference:
[Progress and points dialogs](../../../packages/app/src/features/chores/components/chore-management-views.tsx).
Reward references:
[goal setup](../../../packages/app/src/features/chores/components/chore-experience-dialogs.tsx) and
[goal progress card](../../../packages/app/src/features/chores/components/chore-support-cards.tsx).

### E. Everyday controls and additional topics — 25 episodes

Prerequisite: a working dashboard and the entities required by each topic. Advanced examples
should identify Home Assistant as the recorded provider. Reuse one fictional home while changing
the relevant device state for each lesson.

- [ ] **E01 — Control lights across the home** (5–7 min; basic controls across implemented
  providers). Read whole-home status, expand a room, change individual and room power or
  brightness, and inspect the supported color controls. Explain unavailable lights.
  [Source](../../../docs/how-to/everyday-control/lights-and-scenes.md)
- [ ] **E02 — Use scenes for everyday lighting** (4–6 min; capability-dependent). Run an
  existing scene, inspect its visible result, and add a scene shortcut to Home. Explain where
  the underlying scene is configured. [Source](../../../docs/how-to/everyday-control/lights-and-scenes.md)
- [ ] **E03 — Control thermostats and heating modes** (5–7 min; HA). Read current versus
  target temperature, change the supported target/mode/preset, and verify the resulting state.
  [Source](../../../docs/how-to/everyday-control/climate.md)
- [ ] **E04 — Manage fans, humidity, and water heaters** (5–7 min; HA). Use supported
  controls for each demonstrated device, explain absent options, and connect controls to the
  room's environmental readings. [Source](../../../docs/how-to/everyday-control/climate.md)
- [ ] **E05 — Understand the Energy dashboard** (6–8 min; HA). Read KPIs, live demand,
  historical ranges, device/room/source grouping, highest consumers, and untracked usage.
  Customize the KPI selection and overview. [Source](../../../docs/how-to/everyday-control/energy.md)
- [ ] **E06 — Set up Energy sources and fix missing data** (6–8 min; HA; capture check).
  Configure the required sources in Home Assistant, add available optional solar/battery or
  device sources, return to Navet, and verify the result and source warnings.
  [Source](../../../docs/how-to/everyday-control/manual-energy-setup.md)
- [ ] **E07 — Build a useful Security overview** (5–7 min; HA). Read attention states,
  choose automatic/manual overview content, order cameras and entities, and navigate recent
  activity to the affected device. [Source](../../../docs/how-to/everyday-control/security.md)
- [ ] **E08 — Watch and manage camera views** (4–6 min; HA). Select a camera, open its
  viewer, distinguish a snapshot from live playback, and demonstrate linked light controls
  where exposed. Use demo footage. [Source](../../../docs/how-to/everyday-control/security.md)
- [ ] **E09 — Use locks, alarms, and covers** (5–7 min; HA). Identify the target, demonstrate
  supported actions and required confirmations using simulated devices, and verify resulting
  states. [Source](../../../docs/how-to/everyday-control/security.md)
- [ ] **E10 — Read sensors and create status summaries** (5–7 min; capability-dependent).
  Inspect a sensor and available history, then add a Battery overview, UPS monitor, or Info
  summary using suitable data. Explain a missing reading.
  [Sources](../../../docs/how-to/everyday-control/actions-maps-status.md)
  · [Sensor implementation](../../../packages/app/src/features/sensors/)
- [ ] **E11 — Control a robot vacuum or lawn mower** (4–6 min; capture check). Find the
  dedicated card and demonstrate only the supported start/pause/return or related controls,
  battery, and status supplied by the selected device. Verify provider mapping before scripting.
  [Implementation reference](../../../packages/app/src/features/vacuum/components/vacuum-card/)
- [ ] **E12 — Keep household calendars visible** (4–6 min; HA; capture check). Add the
  available calendar entity/card, choose the supported display options, and read upcoming
  events. Check whether editing is exposed before promising event creation.
  [Implementation reference](../../../packages/app/src/features/calendar/)
- [ ] **E13 — Add weather and understand the forecast** (4–5 min; HA; capture check). Add
  the weather card, compare available sizes/detail views, read the exposed forecast, and show
  the unavailable-data state. [Implementation reference](../../../packages/app/src/features/weather/)
- [ ] **E14 — Add household notes and a photo frame** (4–6 min; Core). Create a useful note,
  configure a photo frame, choose their room and size, and update the content.
  [Source](../../../docs/how-to/everyday-control/notes-photos-rss.md)
- [ ] **E15 — Put RSS headlines on your dashboard** (4–6 min; Core). Add a feed, configure
  its presentation, open an article, and show a relevant source or loading failure.
  [Source](../../../docs/how-to/everyday-control/notes-photos-rss.md)
- [ ] **E16 — Create useful action buttons** (4–6 min; capability-dependent). Choose a
  supported target/action, give it a clear label, place it on Home, and demonstrate its
  result. [Source](../../../docs/how-to/everyday-control/actions-maps-status.md)
- [ ] **E17 — Add a household location map** (4–6 min; capability-dependent). Select
  supported people/tracker entities, place and resize the map, and explain available location
  states using fictional coordinates. [Source](../../../docs/how-to/everyday-control/actions-maps-status.md)
- [ ] **E18 — Use Assist with text and voice** (6–8 min; HA; capture check). Add Assist,
  select the available pipeline, send a text request, enable the microphone, and demonstrate
  response audio where configured. Explain what happens when required services are missing.
  [Source](../../../docs/WIDGETS.md)
  · [UI reference](../../../packages/app/src/features/dashboard/components/widgets/assist-dialog.tsx)
- [ ] **E19 — Run and inspect routines, automations, and scripts** (5–7 min; HA). Use
  Household → Routines, filter items, run/enable/disable supported routines, and inspect When,
  If, Then, dependencies, and diagnostics. Explain that underlying configuration is edited in
  the provider. [Source](../../../docs/how-to/everyday-control/automations-and-scripts.md)
- [ ] **E20 — Explore Local Habits** (5–7 min; experimental; capture check). Enable the
  experiment, review a prepared suggestion, inspect the proposed action, and demonstrate the
  supported routine-creation path. Explain its excluded actions and how to disable it.
  [Source](../../../docs/how-to/everyday-control/local-habits.md)
- [ ] **E21 — Manage notifications and provider actions** (4–6 min; HA). Review an item,
  distinguish local hiding from provider clearing, and explain available update/restart
  actions using a demonstration environment. [Source](../../../docs/how-to/everyday-control/notifications.md)
- [ ] **E22 — Use multiple providers in one Navet installation** (6–8 min; capture check).
  Add another implemented provider, choose included collections and the active provider,
  compare shared entities with single-provider advanced services, and demonstrate disconnecting.
  [Source](../../../docs/how-to/settings/manage-providers.md)
- [ ] **E23 — Recover a connection or sign-in problem** (5–7 min; deployment-specific).
  Read the visible error, verify the provider and address, reconnect the affected session, and
  show one reproducible recovery route for the recorded deployment.
  [Source](../../../docs/how-to/troubleshooting/connection.md)
- [ ] **E24 — Fix a camera that will not play live video** (4–6 min; HA). Check camera
  state, live-stream configuration, direct URL/fallback behavior, and the relevant deployment
  path; demonstrate the change from failure to working playback.
  [Source](../../../docs/how-to/troubleshooting/camera-playback.md)
- [ ] **E25 — Find missing entities and explain unavailable features** (4–6 min; Core).
  Check selected providers, entity visibility, actual device capabilities, and the capability
  matrix before changing the dashboard. End with either a restored entity or a clearly
  explained current limitation.
  [Sources](../../../docs/how-to/troubleshooting/missing-entities.md)
  · [Unavailable features](../../../docs/how-to/troubleshooting/unavailable-features.md)

## Production checklist

### Set up the series once

- [x] Find the latest 27.5-second reference project and record the reusable style.
- [x] Inventory current topics and attach repository evidence.
- [x] Put the user's requested topics into a first production batch.
- [x] Create a reusable episode checklist and tracking method.
- [x] Choose A07 as the pilot and prepare its script and shot list; keep the proposed narration/style.
- [x] Produce the selected Juniper voice for the pilot.
- [x] Choose Navet YouTube and publish the approved pilot.
- [ ] Prepare a clean demo household, with saved starting states for each planned workflow.
- [x] Confirm the recording version and provider/deployment requirements for the pilot (0.15.8, standalone Home Assistant).
- [x] Produce a full-viewport tutorial composition with Dark/Orange and no added sidebar.
- [x] Produce the 6:28 live narrated A07 pilot.
- [x] Receive user approval of the pilot format before continuing the batch.

### Repeat for each episode

Copy this checklist into the episode's working folder. Record the episode ID, title, Navet
version, provider/deployment, prerequisites, working folder, and next recommended lesson.

- [ ] **Rehearse:** complete the task in the current build; capture exact labels and available controls.
- [ ] **Reconcile docs:** compare the observed implementation with each relevant doc/Markdown file;
  fix discrepancies and record the evidence before treating the script as verified.
- [ ] **Outline:** write the outcome, chapter order, prerequisites, one common snag, and final check.
- [ ] **Script:** write natural narration around the observed workflow; mark pauses and callouts.
- [ ] **Shot list:** pair each narration segment with an action and the visible result it proves.
- [ ] **Prepare:** restore the starting demo state; check names, data, permissions, and readable UI size.
- [ ] **Capture:** record the whole task and any alternative/error states needed for the lesson.
- [ ] **Narrate:** generate or record the selected voice; verify Navet pronunciation and record usage rights.
- [ ] **Edit:** assemble chapters, callouts, focus changes, pauses, and restrained transitions.
- [ ] **Caption:** align the canonical script to the actual audio; check spelling and control visibility.
- [ ] **Verify:** watch the full export, listen throughout, and follow the steps against the recorded build.
- [ ] **Check claims:** confirm provider requirements, final saved state, and any current limitations.
- [ ] **Package:** save the MP4, SRT, transcript, chapter timestamps, thumbnail, and editable sources.
- [ ] **Review:** apply feedback and mark the episode checkbox complete only after final review.
- [ ] **Publish later:** after publication, record the public URL and durable media metadata separately.

### First-batch tracker

Use `—` for not started, `WIP` for in progress, `Done` for complete, and `Blocked: reason` when a
specific input or environment is missing. Episode checkboxes above correspond to **Review**, not
to a finished script or initial render.

| ID | Script + shots | Capture | Narration | Edit + captions | QA | Review | Published URL |
|---|---|---|---|---|---|---|---|
| A07 | Done | Done: live footage | Done: Juniper | Done: 6:28 | Technical checks passed | User approved | [YouTube](https://youtu.be/XEjrLwt5xiQ) |
| B01 | — | — | — | — | — | — | — |
| A10 | — | — | — | — | — | — | — |
| C01 | — | — | — | — | — | — | — |
| C02 | — | — | — | — | — | — | — |
| C04 | — | — | — | — | — | — | — |
| D01 | — | — | — | — | — | — | — |
| D02 | — | — | — | — | — | — | — |
| D09 | — | — | — | — | — | — | — |
| D10 | — | — | — | — | — | — | — |
| D11 | — | — | — | — | — | — | — |
| D12 | — | — | — | — | — | — | — |

### File organization

Keep this plan and small evidence/brief records in `marketing/content/`. Keep per-episode scripts,
recordings, narration, renders, and editable working projects in
`.cache/navet-content/tutorial-series/<episode-id>-<slug>/`, following the
[content workflow](../README.md). Use one folder per episode and preserve the capture version and
source references. Copy final deliverables to durable storage before relying on them as an archive.

## Next episode

The user accepted the live walkthrough format and requested YouTube publication. A07 is now
[public on Navet YouTube](https://youtu.be/XEjrLwt5xiQ) with English captions, 12 chapter timestamps, and an actual
onboarding thumbnail. Both YouTube checks reported no issues. The [A07 brief](2026-09-05-a07-onboarding.md)
links the evidence and publication record.

Continue next with **B01 — Set up a dashboard from start to finish**, retaining the approved
real-application recording, Juniper narration, Dark theme, Orange accent, and no added sidebar.
