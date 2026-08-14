# Multi-dashboard experience

Status: Implemented first release
Issue: [#119 — Ability To Create Rooms/Dashboards](https://github.com/awesomestvi/navet/issues/119)

Implementation landed on `feature/multi-dashboard` on 2026-07-30. The collection contract,
single-Home migration, active-dashboard runtime, shared-profile synchronization, direct links,
desktop/mobile/kiosk switchers, responsive creation flow, and Settings manager described here are
the implementation baseline. The explicit first-release non-goals still apply.

## Decision

Navet should support multiple shared Home dashboards and let each registered dashboard client
open a chosen dashboard by default.

The first release should make one concrete job exceptionally easy:

> Create an Upstairs dashboard from selected rooms, show only lights, and make a Sonoff wall
> display open it by default.

This is a content and assignment feature, not a second navigation system and not an authorization
boundary.

## Design intent

- **Information priority:** current dashboard, live cards, rooms, then dashboard management.
- **Primary action:** create a dashboard from rooms and use it on a display or browser.
- **Density:** preserve Home's current compact card grid and room-navigation rhythm.
- **Responsive change:** extend the existing Home split control instead of adding another row.
- **Navet signature:** the current Home control becomes a quiet dashboard-and-room doorway; the
  dashboard manager shows assignments with the same tactile display glyphs already used by
  connected dashboard clients.

No new palette, font, radius, shadow, page shell, or material treatment is needed. The experience
reuses Navet's current theme tokens, system typography, `InteractivePill`, `ModalSurface`,
`SheetSurface`, settings rows, and Home card grammar.

## Product references

### Primary Navet reference

The current Home surface:

- `packages/app/src/features/dashboard/components/home-dashboard-overview.tsx`
- `packages/app/src/features/dashboard/components/home-dashboard-overview-edit.tsx`
- `packages/app/src/components/layout/room-nav.tsx`
- `packages/app/src/components/layout/sidebar.tsx`
- `packages/app/src/features/dashboard/components/home-edit-command-bar.tsx`

Home already supplies the correct outer spacing, summary rhythm, card density, edit mode, and
responsive behavior. The desktop room navigation begins with a Home pill. The mobile dock already
uses a split Home control with a chevron. Those are the least disruptive places to expose multiple
dashboards.

### Supporting Navet references

- `packages/app/src/features/settings/components/settings-dashboard-section.tsx`
- `packages/app/src/features/settings/components/settings-dashboard-clients.tsx`
- `packages/app/src/components/primitives/interactive-pill.stories.tsx`
- `packages/app/src/components/primitives/modal-surface.stories.tsx`
- `packages/app/src/components/primitives/sheet-surface.stories.tsx`
- Storybook: `App Shell/Navigation/Room Nav`
- Storybook: `App Shell/Header/Topbar`
- Storybook: `Pages/Dashboard/Edit Actions`
- Storybook: `Pages/Settings/Dashboard`
- Storybook: `Pages/Settings/System`

The manager should extend the grounded settings-row pattern used by connected dashboard clients,
not introduce a gallery of decorative nested cards.

## What the issue is really asking for

Issue #119 asks for a second Home dashboard that can combine more than one room and is useful on a
wall display or kiosk. The important distinction is:

- a **room** is where provider entities belong;
- a **dashboard** is a curated arrangement of cards from any rooms;
- a **display or browser** is a registered Navet dashboard client that can open one dashboard by
  default.

The user should never have to create fake provider rooms, duplicate entities, or create a separate
provider login merely to give a wall display a focused Home screen.

## Lessons from other smart-home products

### Apple Home

Apple keeps one clear Home overview and lets people edit, rearrange, and resize its tiles. Rooms
and zones remain the durable household organization beneath that overview.

Navet should borrow:

- direct manipulation in the existing overview;
- rooms and room groups as the fastest starting point;
- a Home surface that remains operational rather than becoming a dashboard administration page.

Navet should not copy Apple's single-overview limitation.

References:

- [Apple Home overview and Edit Home View](https://support.apple.com/en-au/guide/iphone/iph22d98bbca/ios)
- [Apple rooms and zones](https://support.apple.com/en-ca/126180)

### Google Home

Google's Favorites pattern separates a shared favorite set from surface-specific custom controls.
A widget or watch can use its own focused controls without changing the main app.

Navet should borrow:

- an explicit “use the shared set” versus “choose a custom set” mental model;
- surface-specific defaults;
- a quick room/device picker rather than configuration syntax.

Navet can improve on it by making named dashboards reusable across several displays rather than
creating an isolated list for every surface.

References:

- [Google Home Favorites widget](https://support.google.com/googlehome/answer/14887882?co=GENIE.Platform%3DAndroid&hl=en-CA)
- [Google Home on Wear OS](https://support.google.com/googlehome/answer/12791523?hl=en-IN)

### Home Assistant

Home Assistant proves the demand for multiple dashboards and dedicated kiosk dashboards. It also
shows the cost of tying a default dashboard to a user profile: using different defaults on a phone
and wall tablet commonly requires separate users.

Navet should borrow:

- named dashboards;
- a default dashboard;
- start blank or start from existing content;
- stable direct links;
- undo and redo inside dashboard editing.

Navet should improve on:

- device assignment without creating a separate user;
- one-step creation from rooms;
- avoiding a second hierarchy of dashboards containing many tabbed views in the first release.

References:

- [Home Assistant multiple dashboards](https://www.home-assistant.io/dashboards/dashboards)
- [Home Assistant dashboard views](https://www.home-assistant.io/dashboards/views/)
- [Home Assistant kiosk guidance](https://companion.home-assistant.io/docs/integrations/android-home-app-launcher/)

## Product model and language

### Use these user-facing nouns

- **Dashboard:** a named Home card layout, such as Home, Upstairs, or Bedside.
- **Display or browser:** a registered Navet client, such as Upstairs Sonoff or Vishal's phone.
- **Use on:** choose which dashboard a display or browser opens by default.
- **Default dashboard:** the fallback for new or unassigned clients.

### Retire ambiguous copy

The current interface uses “dashboard” for both content and a physical browser client. Before this
feature ships, update visible copy:

| Current copy | New copy |
| --- | --- |
| Dashboard profile | Display preset |
| This dashboard | This device |
| Other dashboards | Other devices |
| Connected dashboards | Displays and browsers |

Internal type names can migrate independently, but the product language must be unambiguous at
launch.

### Do not call assignment a permission

A dashboard controls what is presented by default. It does not prevent a user from reaching the
same provider entities elsewhere, and it does not replace provider-native permissions. Kiosk mode
can hide normal navigation, but its recovery menu remains available.

## Information architecture

```text
Home
├── Active dashboard
│   ├── Home cards from any room
│   ├── Summary bar
│   └── Dashboard sections
├── Rooms
│   └── Existing provider-neutral room views
└── Dashboard menu
    ├── Switch dashboard
    ├── Use on this device
    └── Manage dashboards

Settings
└── Dashboard
    ├── Dashboards
    │   ├── Create
    │   ├── Rename
    │   ├── Duplicate
    │   ├── Reorder
    │   ├── Set default
    │   ├── Assign displays and browsers
    │   └── Delete
    ├── Display preset
    ├── Header title
    ├── Summary bar
    ├── Kiosk mode
    ├── Keep device awake
    ├── Entity visibility
    └── Local config backup
```

The Home dashboard remains one view. A dashboard does not contain tabs or nested sub-dashboards in
the first release.

## Entry points

### One dashboard

Nothing changes in normal use. The first control still reads **Home**, and there is no extra
dashboard-management row.

Creation is discoverable in two deliberate places:

1. Enter Customize; the edit command bar shows **Home ▾** with **New dashboard**.
2. Settings > Dashboard begins with a **Dashboards** settings item.

### Two or more dashboards

The existing Home control displays the current dashboard name and gains a dashboard menu.

- Desktop: the first room-navigation pill becomes `Upstairs ▾`.
- Mobile: the existing split Home dock control becomes `Upstairs ▾`.
- Kiosk: the Orbit menu shows a Dashboards group above Rooms.

The header greeting remains unchanged.

## Dashboard switcher

The switcher is optimized for opening, not managing.

Each row contains:

- dashboard icon;
- dashboard name;
- check mark for the currently open dashboard;
- `This device` when it is assigned to the current client;
- a quiet display/browser count when the dashboard has other assignments.

The footer contains:

- **Use Upstairs on this device** when it is not assigned;
- **Manage dashboards**;
- **New dashboard** in edit mode or for users who can edit the shared profile.

Opening another dashboard is a preview and does not silently change the device assignment.
Assignment changes only through an explicit **Use on this device** action or the manager.

## Create dashboard flow

Use one responsive surface:

- `ModalSurface` at desktop widths;
- `SheetSurface` on mobile and small wall displays.

The default path should fit in one screen.

### Fields

1. **Name**
   - Required.
   - Suggest a name from the selected room group, such as Upstairs.
   - Choose a familiar house/room icon from the existing icon picker.

2. **Start with**
   - **Choose rooms** — recommended for a focused display.
   - **Copy current dashboard** — fastest for a variation.
   - **Blank dashboard** — advanced clean start.

3. **Rooms and controls** — shown only for Choose rooms
   - Select room groups or individual rooms.
   - Include:
     - Common controls
     - Lights only
     - Choose cards
   - This selection seeds the initial layout. It is not a permanent automatic filter.

4. **Use on**
   - **This device** — on by default when creation starts on a wall display.
   - **Choose displays and browsers** — progressive disclosure.
   - **Not yet**.

5. **Create dashboard**

After creation, open the dashboard in Customize mode so card ordering, sizes, and sections can be
adjusted immediately.

### Seed behavior

**Choose rooms** creates a sectioned layout:

- one section per selected room;
- sections follow the current Room Workspace order;
- provider-neutral canonical entity IDs are stored;
- selected room groups expand to their current member rooms;
- common controls include supported actionable entities and exclude diagnostic/noise-heavy
  sensors;
- Lights only includes normalized light entities from all selected providers;
- card sizes use Navet's current default sizes;
- long lists remain editable after creation.

New entities do not silently appear later. The picker is a starting accelerator, not a second
auto-generated layout mode.

## Key flows

### A. Create Upstairs on a phone and assign the Sonoff display

```text
Customize
  → Home ▾
  → New dashboard
  → Name: Upstairs
  → Choose rooms
  → Select Upstairs group
  → Include: Lights only
  → Use on: Upstairs Sonoff
  → Create dashboard
```

Expected result:

- the phone previews Upstairs in Customize mode;
- Upstairs Sonoff is assigned to Upstairs;
- the Sonoff opens Upstairs on its next safe dashboard transition;
- Home remains the phone's assigned dashboard unless explicitly changed.

### B. Create directly on the wall display

```text
Orbit menu
  → Customize
  → Home ▾
  → New dashboard
  → Choose rooms
  → Create dashboard
```

`Use on this device` is selected by default because the client uses the Wall display preset.

### C. Preview without reassigning

```text
Home ▾
  → Upstairs
```

The open dashboard changes, but the menu still marks `Home · This device`. A clear
**Use Upstairs on this device** footer action makes the distinction understandable.

### D. Delete an assigned dashboard

The delete dialog lists impacted clients and requires a replacement dashboard before deletion.
The replacement, default fallback, and deletion are written atomically.

The last dashboard cannot be deleted.

## Responsive wireframes

### Desktop Home

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Good evening, Vishal!                         Customize  Search  User  │
│ Thu, July 30 · 18:25                                               │
│                                                                       │
│ [ Upstairs ▾ ]  Bedroom  Office  Guest room  [ Rooms ▾ ]             │
│ ───────────────────────────────────────────────────────────────────── │
│ [ Energy 1.4 kW ] [ Climate 21–25° ] [ Lights 3 on ]                  │
│                                                                       │
│ Upstairs lights                                                      │
│ [ Bedroom ceiling ] [ Hallway ] [ Office lamp ] [ Guest room ]       │
└───────────────────────────────────────────────────────────────────────┘
```

The first control replaces the existing Home pill. It does not add a new row.

### Dashboard menu

```text
┌──────────────────────────────────────────┐
│ Dashboards                               │
│                                          │
│ ✓  Home                    This device   │
│    Upstairs                1 display     │
│    Bedside                 1 display     │
│                                          │
│ Use Upstairs on this device              │
│ ──────────────────────────────────────── │
│ Manage dashboards         New dashboard │
└──────────────────────────────────────────┘
```

### Mobile Home

```text
┌───────────────────────────────┐
│ Good evening, Vishal!   ✎  ◯  │
│ [ Energy ][ Climate ][Lights] │
│                               │
│ [ Bedroom ceiling ][Hallway ] │
│ [ Office lamp     ][Guest   ] │
│                               │
│      ┌───────────────────┐    │
│      │ Upstairs ▾ More ⌕ │    │
│      └───────────────────┘    │
└───────────────────────────────┘
```

The existing mobile Home split control shows the dashboard name. Its chevron opens a sheet with
Dashboards first and Rooms second.

### Create sheet

```text
┌──────────────────────────────────────────┐
│ New dashboard                         ×  │
│                                          │
│ Name                                     │
│ [ Upstairs__________________________ ]    │
│                                          │
│ Start with                               │
│ [ Choose rooms ] [ Copy current ] [Blank]│
│                                          │
│ Rooms                                    │
│ [✓ Upstairs] [ Bedroom ] [ Office ]      │
│                [ Guest room ] [ Hallway ] │
│                                          │
│ Include                                  │
│ [ Common controls ] [✓ Lights only]      │
│                                          │
│ Use on                                   │
│ [✓ Upstairs Sonoff] [ Kitchen tablet ]   │
│                                          │
│                       [Create dashboard] │
└──────────────────────────────────────────┘
```

### Settings manager

```text
Dashboards
Create and choose which dashboard each display or browser opens.

┌──────────────────────────────────────────────────────────────────┐
│ ⌂  Home          Default     18 cards     This phone             │
├──────────────────────────────────────────────────────────────────┤
│ ◫  Upstairs                  8 cards      Upstairs Sonoff   ···  │
├──────────────────────────────────────────────────────────────────┤
│ ☾  Bedside                   4 cards      Bedroom tablet    ···  │
└──────────────────────────────────────────────────────────────────┘

[ New dashboard ]
```

This is one shared surface with row geometry. Do not place every dashboard in an individual
decorative card.

## Assignment behavior

### Ownership

- Dashboard definitions belong to the installation workspace.
- The workspace default dashboard belongs to the installation workspace.
- Display/browser assignments are shared workspace metadata keyed by registered client ID so they
  can be managed remotely.
- The currently previewed dashboard is local ephemeral navigation state.
- Kiosk mode, keep awake, density, effects quality, and camera transport remain dashboard-client
  preferences.
- Provider credentials remain browser-session owned and are never copied with a dashboard.

### Resolution order

When Home opens:

1. explicit dashboard in the current direct link;
2. current in-session preview, if still valid;
3. assignment for this registered client;
4. workspace default dashboard;
5. first valid dashboard in workspace order.

Invalid or deleted IDs always fall through safely.

### Remote assignment change

An active target client applies a remote assignment when it is safe:

- immediately when it is showing Home and is not editing, dragging, or inside a blocking dialog;
- after leaving edit mode or closing the blocking dialog otherwise;
- on the next Home navigation or reload if it is in another section.

The target shows a short attributed update such as:

> Upstairs Sonoff now uses Upstairs · changed from Vishal's phone

Do not interrupt an in-progress control gesture.

## Dashboard definition

The first release should keep the contract intentionally small.

```ts
type DashboardId = string;

interface NavetDashboardDefinition {
  id: DashboardId;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  homeRoomNames: string[] | null;
  homeLayout: HomeDashboardLayoutState;
  homeCardSizes: Record<string, CardSize>;
  homeCustomCards: CustomCard[];
  homeCardZones: Record<string, ZoneName>;
}

interface NavetDashboardCollection {
  schemaVersion: 1;
  defaultDashboardId: DashboardId;
  order: DashboardId[];
  dashboardsById: Record<DashboardId, NavetDashboardDefinition>;
  dashboardIdByClientId: Record<string, DashboardId>;
}
```

Names and icons are presentation metadata. IDs remain stable across rename and duplicate
operations.

### Shared data that stays outside a dashboard

- theme and selected accent in the first release;
- Room Workspace and provider room identity;
- entity room overrides;
- shared light presets;
- sidebar customization;
- provider sessions and credentials;
- account and dashboard-client preferences;
- global room pages and feature sections.

### Dashboard-owned data

- Home card membership and order;
- Home room-navigation scope (`null` keeps installation-wide navigation);
- Home sections and layout mode;
- Home-specific card sizes;
- Home-specific custom-card instances;
- Home-specific zone assignments.

If the same provider entity is placed on Home and Upstairs, each dashboard can size and position it
independently. The entity's live state and commands still come from its owning provider.

## Migration

Existing users must see no visual or behavioral regression.

1. Create one dashboard with stable ID `home`.
2. Name it from the localized Home label.
3. Move the current `homeDashboardLayout` into that definition.
4. Move Home-relevant card sizes, custom cards, and zones into that definition.
5. Set `home` as the workspace default.
6. Assign existing clients to `home` only when an explicit assignment is required; otherwise let
   them resolve through the default.
7. Preserve legacy import support for one release cycle.
8. Export the new collection in the next dashboard-config schema version.

Migration must be idempotent and must not duplicate custom cards.

## Architecture fit

### Current owner

Dashboard composition, settings, persistence, profile synchronization, and dashboard-client
identity currently live in `@navet/app`:

- `packages/app/src/utils/dashboard-config.ts`
- `packages/app/src/features/dashboard/stores/home-dashboard-layout-store.ts`
- `packages/app/src/features/dashboard/stores/custom-cards-store.ts`
- `packages/app/src/features/dashboard/stores/card-zones-store.ts`
- `packages/app/src/features/dashboard/hooks/use-dashboard-controller.ts`
- `packages/app/src/features/dashboard/hooks/use-dashboard-profile-sync.ts`
- `packages/app/src/features/dashboard/clients/`
- `packages/app/src/services/dashboard-profile.contract.ts`

### Target owner

The collection, assignments, migrations, and runtime selection remain in `@navet/app`. They are
product composition and persistence concerns.

Reusable visual primitives remain in their current app-owned authoring seams and should consume
provider-neutral dashboard view models. This feature does not justify moving them to `@navet/ui`.

### Provider boundary

Dashboard definitions store canonical/provider-scoped Navet entity IDs. They never store raw Home
Assistant payloads or service calls. Creation from rooms reads normalized room/entity collections
from the current multi-provider runtime.

No provider contract needs to grow for this feature.

### Profile synchronization

Extend the existing revisioned shared profile rather than creating a second server endpoint in the
first release.

Paths such as:

```text
/dashboards/dashboardsById/home/...
/dashboards/dashboardsById/upstairs/...
/dashboards/dashboardIdByClientId/<client-id>
```

allow the existing last-common-base reconciliation to merge edits to different dashboards and
different assignments without creating false conflicts.

Deleting a dashboard and remapping its assignments must be one profile mutation.

## Implementation sequence

### Phase 1 — Contract and migration

1. Add dashboard collection types, parsing, invariants, and stable ID generation.
2. Add idempotent migration from the current single Home layout.
3. Advance the dashboard-config version and keep legacy import parsing.
4. Add fixture-driven tests for missing, malformed, duplicate, deleted, and migrated dashboard
   IDs.

### Phase 2 — Active dashboard runtime

1. Add an app-owned dashboard collection store.
2. Resolve active, assigned, default, and fallback dashboard IDs.
3. Adapt Home layout, Home card sizes, Home custom cards, and Home zones to the active dashboard.
4. Clear undo/redo history when switching dashboard context.
5. Keep room pages and feature sections on their existing shared stores.

### Phase 3 — Profile sync and assignments

1. Include the collection in shared profile export/import.
2. Extend field-level reconciliation coverage for independent dashboard edits.
3. Store registered-client assignments as shared workspace metadata.
4. Defer remote assignment changes during edit, drag, or blocking dialogs.
5. Add reset, restore, stale-write, and deleted-assignment coverage.

### Phase 4 — Switcher and manager

1. Extend desktop `RoomNav` Home pill.
2. Extend the mobile Home split control.
3. Add the Dashboards group to `KioskOrbitMenu`.
4. Add the settings manager using the current settings-row recipe.
5. Rename ambiguous client-facing copy from dashboard to device/display/browser.

### Phase 5 — Creation accelerator

1. Add the responsive create surface.
2. Add room-group and individual-room selection.
3. Seed Common controls, Lights only, and Choose cards modes from normalized entity collections.
4. Add duplicate, rename, reorder, default, assignment, and delete flows.

### Phase 6 — Direct links and polish

1. Add a stable dashboard-aware Home destination that works in standalone, demo, Ingress, and
   custom-panel base paths.
2. Preserve the active dashboard when leaving and returning to Home during the same session.
3. Add attributed update messaging and recovery for deleted or unavailable dashboards.

## State and failure handling

| State | Behavior |
| --- | --- |
| Loading | Keep the resolved dashboard footprint stable; do not briefly render another dashboard. |
| Empty dashboard | Explain that it has no cards and offer Customize. |
| Unknown direct-link ID | Fall back through assignment/default and show “Dashboard not found.” |
| Deleted assignment | Resolve to the workspace default without leaving a blank screen. |
| No registered clients | Allow creation; explain that a display appears after opening Navet once. |
| Profile sync unavailable | Keep local dashboards usable and show the existing sync status. |
| Remote edit to another dashboard | Merge without interrupting the active dashboard. |
| Remote edit to active dashboard | Apply through the existing profile-sync rules. |
| Active edit conflict | Use existing Keep mine / Load remote reconciliation. |
| Last dashboard delete | Disable deletion and explain why. |

## Accessibility and interaction

- Keep every switcher, assignment row, and menu action on Navet's shared interaction scale: 36 px
  compact minimum, 40 px standard, and 42 px only when a wall display needs extra separation.
- Use `aria-current` for the open dashboard and explicit text for the assigned dashboard.
- Do not communicate assignment through icon color alone.
- Keep keyboard order: dashboard switcher, dashboard rows, footer actions.
- Return focus to the switcher after closing a menu or sheet.
- Announce created, assigned, deleted, and remotely changed dashboards through the existing live
  message pattern.
- Pause switching while a pointer drag or direct card control gesture is active.
- Respect reduced motion; a dashboard change should not animate the entire card grid.
- Truncate long dashboard and client names visually while preserving their accessible names.

## Storybook acceptance surface

Add focused stories rather than a parallel mock application.

### Dashboard switcher

- one dashboard;
- three dashboards;
- long names;
- current versus assigned dashboard;
- no assignments;
- unavailable/deleted current dashboard;
- keyboard interaction;
- desktop, mobile, and kiosk variants.

### Dashboard manager

- one dashboard;
- many dashboards and many registered clients;
- unassigned clients;
- offline/sync error;
- delete with replacement;
- empty client registry;
- long translated names.

### Create dashboard

- Choose rooms;
- Copy current;
- Blank;
- room group with mixed providers;
- Lights only;
- no available rooms;
- no registered target clients;
- mobile sheet and desktop modal.

Review all stories in `glass`, `dark`, `light`, and `black`, with high and reduced effects quality.

## Validation plan

Focused validation should cover:

- migration and dashboard collection invariants;
- active/default/assigned/fallback resolution;
- profile diff and reconciliation across two dashboard IDs;
- assignment changes from another client;
- delete-and-reassign atomic behavior;
- base-path-aware direct links;
- Home switcher, mobile dock, and kiosk Orbit behavior;
- touch, keyboard, focus return, and reduced motion;
- Storybook visual review at phone, tablet, Sonoff-like landscape, desktop, and kiosk widths.

Use the smallest routeable repository checks:

```bash
pnpm validate -- --scope dashboard
pnpm check:stories
pnpm test:storybook
```

Provider contracts should remain unchanged. If implementation changes provider/runtime boundaries,
also run the provider-scoped validation required by `docs/agents/commands.md`.

## Explicit non-goals for the first release

- dashboard-level permissions or security boundaries;
- a dashboard containing multiple tabbed views;
- provider-native dashboards;
- per-dashboard themes or wallpapers;
- conditional cards or automation-driven dashboard switching;
- automatic dashboard creation for every room;
- public dashboard sharing;
- editing another client's credential or device-owned performance preferences.

These can be reconsidered after named dashboards, assignment, migration, and sync are proven.

## Acceptance criteria

The design is successful when:

1. An existing installation becomes a one-dashboard installation with no visible setup step.
2. A user can create an Upstairs lights dashboard from a room group without adding every light
   one at a time.
3. A phone can assign that dashboard to a registered Sonoff display without changing the phone's
   own default.
4. Opening another dashboard does not silently reassign the current device.
5. Two clients editing different dashboards do not conflict.
6. Deleting an assigned dashboard never leaves a client on a blank or invalid screen.
7. The feature works in standard, wall-display, kiosk, standalone, Ingress, custom-panel, and demo
   contexts.
8. The result still looks and behaves like the current Home and settings surfaces across all four
   Navet themes.
