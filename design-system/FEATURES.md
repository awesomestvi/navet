# Navet - Feature Documentation

## Overview

This document details the key features and systems implemented in Navet, including authentication, adaptive theming, navigation, and settings.

---

## Authentication System

### Login Page

**Location**: `/src/app/features/auth/login-page.tsx`

The login page provides a secure authentication interface for connecting to your smart home:

#### Features
- **Smart home URL input** - Connect to local or remote instance
- **Long-lived access token authentication** - Secure token-based access
- **Form validation** - Ensures valid URL and token format
- **Persistent sessions** - Auth state saved to localStorage
- **Error handling** - Clear feedback for connection issues

#### Design
- Full-page centered card design
- Frosted glass aesthetic matching dashboard
- iOS-inspired input fields
- Clear help text with token generation link
- Smooth transitions and loading states

#### Implementation
```tsx
// Auth context
const { login, isAuthenticated, config, user } = useAuth();

// Login flow
await login(url, token);
```

### User Management

**Component**: `/src/app/components/layout/user-dropdown.tsx`

#### Features
- **User profile display** - Shows username and connection info
- **Avatar** - First letter of username in colored circle
- **Dropdown menu** - Quick access to user actions
- **Logout functionality** - Secure session termination

#### Design
- Header-integrated dropdown
- Smooth animations on open/close
- Theme-aware styling
- Clear visual hierarchy

---

## Theme System

### Theme Hook + Store

**Location**: `/src/app/hooks/use-theme.ts`

Exposes global theme state including mode, effects quality, and primary color customization through a direct hook API backed by shared client state.

#### Theme Modes

**1. Liquid Glass Theme**
- Background: deep blue-black stage with luminous blur
- Cards: translucent frosted panels with brighter borders
- Text: white primary, softened white secondary
- Best for: glass-heavy immersive presentation

**2. Dark Theme**
- Background: `#0a0a0a` (deep black)
- Cards: Dark gray with subtle gradients
- Text: White primary, gray secondary
- Best for: Low-light environments, OLED screens

**3. Light Theme**
- Background: `#f9fafb` (soft gray)
- Cards: White with subtle shadows
- Text: Dark gray primary, mid-gray secondary
- Best for: Bright environments, accessibility

**4. Black Theme** (internal code: `contrast`)
- Background: `#000000` (OLED black)
- Cards: Near-pure black with stronger contrast treatment
- Text: Pure white primary, bright accents
- Best for: Visual accessibility, OLED-friendly contrast

#### Primary Color System

Users can customize the primary color used throughout the interface:

| Color  | Hex Code | Usage                          |
|--------|----------|--------------------------------|
| Orange | #f97316  | Default, warm, home-like      |
| Blue   | #3b82f6  | Technology, calm, professional |
| Green  | #22c55e  | Nature, eco-friendly          |
| Purple | #a855f7  | Premium, creative             |
| Pink   | #ec4899  | Playful, modern               |
| Red    | #ef4444  | Bold, urgent                  |
| Yellow | #eab308  | Bright, energetic             |
| Teal   | #14b8a6  | Fresh, balanced               |
| Custom | User-set | Personalized accent color     |

#### Effects Quality System

Navet scales its glass treatment through visual quality tiers instead of forcing the same rendering path on every device:

- **High** - richest live glass treatment for capable hardware
- **Medium** - simulated glass with tinted surfaces and reduced live effects
- **Low** - reduced effects and more contained surfaces for constrained hardware

This keeps the same design language while making the UI practical on devices like Raspberry Pi.

#### What Changes with Primary Color
- Active card states
- Button backgrounds and borders
- Navigation indicators
- Slider handles and progress bars
- Icon accents
- Selection indicators
- Focus states
- Shared color picker swatches used for custom accents, light colors, and Kelvin presets

#### Dynamic Color Class Safety

`generateThemeColors` builds Tailwind class names dynamically (e.g. `` `from-${color}-900` ``), which Tailwind's content scanner cannot detect. All required class combinations for every accent color and theme are listed as literal strings in `src/app/components/shared/theme/theme-color-safelist.ts`. This file must be kept in sync with `generateThemeColors` whenever new color/shade/opacity combinations are added.

#### Shared Theme Primitives

Recent UI cleanup moved repeated theme logic into shared primitives so cross-theme behavior can be changed in one place:

- **Entity icon pill styles** - centralized under shared theme helpers for all 4 themes
- **Interactive nav/action pills** - centralized for active/inactive, light/dark/contrast/glass behavior
- **Round control button** - shared circular action control primitive for card actions across lighting, media, HVAC, security, and vacuum cards; supports `neutral`, `soft` (glass/frosted), and `emphasis` variants
- **Card state surface tokens** - centralized off/inactive card shell, overlay, text, and media-artwork dimming treatment for light, HVAC, switch, and media cards
- **Theme surface tokens** - still define the shared panel, border, text, and input surfaces used by these primitives

---

## Climate System

### HVAC Card Path

**Location**: `/src/app/features/climate/components/hvac-card/`

Navet now uses a single HVAC-based card path for Home Assistant climate entities.

#### Current Behavior
- **Climate entities render as HVAC cards** - the dashboard card registry maps `climate` devices directly to `HVACCard`
- **Legacy climate card removed** - there is no parallel `ClimateCard` path to maintain or style separately
- **Shared interaction model** - climate controls now follow the same card-shell, header icon, action-row, and settings patterns as other modern entity cards

#### Why
- avoids duplicated climate UI logic
- keeps climate theming aligned with the HVAC-specific card/controller flow
- reduces future regressions by centralizing climate behavior in one feature module

#### Implementation Notes
- Climate entities are registered through the dashboard card registry and rendered via the HVAC feature module
- Shared HVAC card structure is reused across dashboard sizes instead of maintaining a second climate-specific card implementation

---

## Media System

### Media Card Path

**Location**: `/src/app/features/media/components/media-card/`

Navet now uses a live Home Assistant-backed media card flow.

#### Current Behavior
- **Home Assistant media player wiring** - media cards map real `media_player` entities into playback state, volume, local mute/unmute volume restoration, metadata, artwork, and remaining-time UI
- **Artwork-led layouts** - small, medium, and medium-vertical media cards use artwork-led surfaces rather than a separate album-art tile pattern
- **Shared transport controls** - previous, play/pause, next, volume, and details actions use the shared round control button primitive
- **Theme-aware inactive treatment** - media off state now follows the same shared card-state surface token system used by other cards
- **Top-left playback indicator** - the visualizer animates while media is playing, and remaining time appears beside it only during active playback

#### Notes
- Remaining time is shown only when Home Assistant playback is active
- Artwork is rendered only when the entity exposes artwork; Navet no longer injects a default placeholder image
- Production artwork color extraction uses the Navet Home Assistant proxy path instead of direct cross-origin image reads
- The media dialog and card views share the same transport/action visual language
- Volume sliders use a small circular thumb (10 px, `h-2.5 w-2.5`) positioned at the fill percentage; color is driven by the album artwork palette

---

## Navigation System

### Navigation Hook + Store

**Location**: `/src/app/hooks/use-navigation.ts`

Manages section navigation state across desktop and mobile layouts through a direct hook API backed by shared client state. Each section maps to a dedicated URL path; the active section is derived from `window.location.pathname` on load rather than persisted to localStorage.

#### Sections

| Section  | URL Path    | Description                    | Icon      | Status    |
|----------|-------------|--------------------------------|-----------|-----------|
| Home     | `/`         | Main dashboard with all cards  | Home      | Active    |
| Security | `/security` | Security cameras and monitoring | Video     | Active |
| Tasks    | `/tasks`    | Automations and routines       | Clipboard | Placeholder |
| Locks    | `/locks`    | Smart lock controls            | Lock      | Active    |
| Lights   | `/lights`   | Lighting control center        | Lightbulb | Active    |
| Media    | `/media`    | Media player management        | Tv        | Active    |
| Dashboard Builder | `/mock` | Build homescreen widgets and organize the device library | FlaskConical | Active |
| Settings | `/settings` | App settings and preferences   | Settings  | Active    |

#### Desktop Sidebar

**Component**: `/src/app/components/layout/sidebar.tsx`

- **Position**: Fixed left, full height
- **Width**: 64px (16 Tailwind units)
- **Layout**: Vertical icon stack
- **Icons**: 40px × 40px touch targets
- **Active state**: Primary color background with 20% opacity
- **Home icon**: Orange square at top (logo)

#### Mobile Bottom Navigation

- **Position**: Fixed bottom, full width
- **Height**: Auto with safe area padding
- **Layout**: 6 icons in horizontal row
- **Icons**: compact iOS-style icon + label tabs
- **Active state**: theme-aware shared pill treatment
- **Inactive state**: transparent/ghost buttons; only the selected item carries the pill
- **Scroll behavior**: slides down and hides on downward scroll, returns when the user is near the top
- **Sections shown**: Home, Security, Lights, Media, Dashboard Builder, Settings

#### URL Routing

Sections are URL-addressable. `setActiveSection` calls `history.pushState` and scrolls to the top; browser back/forward updates the Zustand store via a `popstate` listener. The active section is not persisted to localStorage — the URL is the sole source of truth.

Path helpers live in `src/app/navigation/sections.ts`:
- `sectionToPath(section)` — returns the URL path for a section
- `pathToSection(pathname)` — parses a URL pathname back to a `Section`

The PWA workbox config (`navigateFallback: '/index.html'`) and Vite's default SPA mode both serve `index.html` for deep-linked section URLs in production and development respectively.

#### Implementation
```tsx
const { activeSection, setActiveSection } = useNavigation();

// Navigate to section (also pushes URL and scrolls to top)
setActiveSection('lights');
```

---

## Security System

### Camera Card

**Location**: `src/app/features/security/components/camera-card/`

A full-featured camera card for Home Assistant `camera` entities. Follows the container/view pattern — all HA integration lives in the container and the view is purely presentational.

#### Architecture

| File | Role |
|---|---|
| `index.tsx` | Public export |
| `container.tsx` | HA state, sibling entity discovery, service calls |
| `view.tsx` | Presentational — snapshot image, overlay buttons |
| `camera-settings-dialog.tsx` | Settings modal with auto-discovered sibling controls |
| `types.ts` | `CameraCardProps` interface |

#### Features

- **Live snapshot** — displays `entity_picture` from the live HA entity state, resolved to an absolute URL using the stored HA connection URL
- **Snapshot refresh** — cache-busting `_t` query parameter incremented on each manual refresh, triggering a new fetch without a page reload
- **Power toggle** — calls `homeAssistantService.updateCamera(id, 'on'|'off')` based on current entity state
- **Card resizing** — `CardSizeSelector` in the top-right corner; all standard sizes supported
- **Unavailable state** — shows a camera icon and "Unavailable" / "No signal" label when the entity is unavailable or has no snapshot URL

#### Settings Dialog

Opened via the settings button in the card's bottom overlay. Automatically discovers sibling entities from the same Home Assistant device (matching `device_id` in the entity registry) and renders the appropriate control for each domain:

| Domain | Control | HA Service |
|---|---|---|
| `switch.*` | Toggle switch row | `switch.turn_on` / `switch.turn_off` |
| `select.*` | Option pill grid | `select.select_option` |
| `number.*` | Range slider | `number.set_value` |

Room reassignment is available directly in the dialog header via `EntityRoomSelector`.

#### Usage

```tsx
<CameraCard
  id="camera.front_door"
  name="Front Door"
  room="Entrance"
  size="medium"
  onSizeChange={updateCardSize}
  isEditMode={false}
/>
```

#### Registration

- Registered in `src/app/hooks/use-ha-devices.ts` under the `cameras` device type
- Registered in `src/app/features/dashboard/utils/card-renderer.tsx`
- Rendered by `SecuritySection` via `src/app/components/layout/sections.tsx`

---

## Dashboard Builder

**Location**: `src/app/features/dashboard/components/home-dashboard-overview.tsx`

The Dashboard Builder (`/mock` section) lets users compose their Home screen from the full device and widget library. It supports two layout modes and full drag-and-drop card ordering.

### Layout Modes

| Mode | Description |
|---|---|
| `flow` | All cards in a single responsive masonry grid — the simplest layout |
| `sectioned` | Cards organised into named sections (rows and column groups) |

Switching to `sectioned` mode auto-creates the first section if none exist. Sections can be renamed inline, removed individually, split into column arrangements via "Add column", stacked vertically within the same column block via "Add below", and resized horizontally via ← → controls in the section header.

### Section Stacking

Sections in the same column slot are grouped into vertical stacks by `buildSectionStacks` (in `home-dashboard-overview.tsx`). A stack is formed when two sections share the same `x` coordinate and `span` value across consecutive `y` rows.

- **Add below** — creates a new section stacked directly below the selected section, inheriting its column span
- All sections in a stack share the same column width; resizing one resizes the entire stack column
- `insertSectionBelow` in `layout-engine.ts` computes the updated layout coordinates

### Floating Library Panel

The card library is a draggable floating panel (`useLibraryPanel`) that overlays the canvas in edit mode.

- **Position** — defaults to the top-right of the viewport; freely repositioned by dragging the grip handle
- **Collapse to dock** — collapses to a slim tab pinned to the right edge; expands on click
- **Search** — filters the available card list (up to 5 results) by name, room, entity type, or entity ID
- **Add card** — places the card into the first available section (sectioned mode) or the flow canvas
- **Drag to place** — cards can be dragged from the library panel directly onto a canvas drop zone

### Section Layout Engine

Top-level sections in `sectioned` mode are positioned on a **12-column grid** defined in `src/app/features/dashboard/utils/layout-engine.ts`.

| Constant | Value | Meaning |
|---|---|---|
| `SECTION_LAYOUT_COLUMNS` | `12` | Total grid columns |
| `SECTION_MAX_PER_ROW` | `4` | Maximum sections in one row |
| `SECTION_RESIZE_SNAP` | `3` | Column increment for resize (12 ÷ 4) |

Each section is stored as a `SectionLayoutItem` with `x`, `y`, `w`, and `h` coordinates. The layout engine functions (`insertSectionRow`, `insertSectionBelow`, `removeSectionFromLayout`, `rebalanceRow`, `compactRows`) mutate these coordinates and are called by `useHomeDashboardLayout`.

**Section resizing** snaps widths to multiples of `SECTION_RESIZE_SNAP` (i.e. 3, 6, 9, or 12 columns). When one section grows by one snap unit, its row neighbor shrinks by the same amount, keeping the row sum constant. The resize action is exposed as `resizeSection(sectionId, newW)` from `useHomeDashboardLayout` and triggered by ← → buttons in each section's header (shown only when `rowSiblingCount > 1`).

`buildSectionStacks` (in `home-dashboard-overview.tsx`) groups the flat section list into a `rowStacks` structure for rendering — each row is an array of stacks, each stack an array of sections sharing the same column slot.

### Hook Architecture

| Hook | Location | Responsibility |
|---|---|---|
| `useHomeDashboardEditor` | `hooks/use-home-dashboard-editor.ts` | Card map construction, library card list, `sectionCards` (HomeEditorSection[]), flow card list, library search/filtering, summary stats |
| `useDashboardDragState` | `hooks/use-dashboard-drag-state.ts` | dnd-kit sensors, active drag card/size, `handleDragOver`, `handleDragEnd`, drop-meta resolution |
| `useLibraryPanel` | `hooks/use-library-panel.ts` | Floating panel position, drag-to-reposition, visibility/collapse toggles, resize-responsive repositioning |
| `useHomeDashboardLayout` | `hooks/use-home-dashboard-layout.ts` | Persisted layout state — card IDs, section assignments, layout mode, hero visibility; exposes `addSection`, `addColumnSection`, `addSectionBelow`, `removeSection`, `renameSection`, `resizeSection`, `addCard`, `removeCard`, `moveCard`, `setMode` |

### Summary Stats

The editor header displays four live counters supplied by `useHomeDashboardEditor`:

| Stat | Description |
|---|---|
| Cards | Entities and widgets currently placed on the Home canvas |
| Available | Cards in the library not yet placed on the canvas |
| Widgets | Total custom widgets (RSS, Photo, Note, Battery, Button) |
| Hidden | Entity IDs hidden from all dashboard views |

### Hero Section Toggle

A toggle in the edit toolbar shows or hides the Hero section at the top of the Home view. Cards with `hero` size degrade to `large` when the hero section is hidden.

### Persistence

The Home layout is persisted to `STORAGE_KEYS.homeDashboardLayout` (`ha-dashboard-home-layout`) via the `useHomeDashboardLayout` hook using Zustand `persist` middleware.

---

## Settings Section

### Settings Page

**Location**: `/src/app/features/settings/components/settings-section.tsx`

Full-page settings interface with card-based organization.

#### Sections

**1. Appearance**
- **Theme Mode Selection**: 2 × 2 grid of theme option cards
- **Primary Color Picker**: 8 built-in accent circles plus a custom accent swatch
- **Visual quality**: choose between High, Medium, and Low glass rendering; shows the recommended tier for the current device based on an automatic benchmark run at first load
- **Built-in wallpapers**: 4 bundled SVG scenes (Serene Dawn, Starfield Nocturne, Aurora Veil, Rainforest Canopy) selectable directly from the wallpaper setting; custom image upload still available alongside them
- **Localized theme picker copy**: theme names and descriptions resolve through the shared i18n dictionaries
- **Light card ambience**: global visual toggle between ambient bleed and contained light-card rendering
- **Theme-aware ambience preview**: the ambience preview uses the shared preview-frame primitive, and the shared `Live Preview` header localizes with the active language
- **Shared color picker primitive**: custom accents, light colors, and Kelvin swatches reuse the same base control with size variants
- **Brightness presets**: light cards use a compact 3-preset set (`Bright`, `Dim`, `Night`) that fits inline without an overflow menu
- **Kelvin slider auto-reset**: tapping the Kelvin swatch on a light card replaces the brightness slider with the color temperature slider; it reverts automatically after 3 seconds of inactivity or when the user taps outside the card — `isKelvinMode` state is owned by the `LightCard` index component and passed down to all size variants
- **Layout**: Left-aligned text, right-aligned selection indicator

**2. Localization**
- **Language selection**: persisted app language for interface and locale-aware formatting
- **Localized theme picker copy**: shared theme labels and descriptions follow the selected locale
- **Onboarding step**: localization is its own first-run step before appearance, covering language, time format, and temperature unit

**3. Interaction**
- **Interaction mode**: choose between tap toggles and tap opens controls
- **Interaction preview**: compact live preview sits beside the interaction toggle for faster comparison

**4. Dashboard**
- **Entity restore action**: add all removed entities back to the dashboard
- **Onboarding reset**: restart the first-launch dashboard choice
- **Search behavior**: dashboard search accepts friendly names, rooms, and Home Assistant entity-id/domain queries such as `light.` and `sensor.`

**5. System**
- **Connection Status**: Shows Home Assistant URL
- **Visual design**: Code-style display in subtle container

**6. Project**
- **Version Information**: Current app version
- **Build Date**: Last build timestamp
- **Layout**: Two-column key-value pairs

#### Design Specifications

**Header**
- Title: text-xl, semibold
- Subtitle: text-sm, muted color
- Spacing: 24px margin bottom

**Section Cards**
- Border radius: 24px (rounded-2xl)
- Border: Theme-aware with 10% opacity
- Padding: 16px (p-4)
- Gap between sections: 16px (space-y-4)

**Theme Selection**
- Grid: 2 columns on medium+ screens
- Preview: 190px miniature card stage matching the light-card skeleton
- Button padding: 16px (p-4)
- Border: primary-color border when selected
- Background: shared settings surface styling with theme-aware preview scenes

**Color Selection**
- Layout: Horizontal flexbox
- Circle size: 40px × 40px (w-10 h-10)
- Gap: 10px (gap-2.5)
- Selection indicator: 2px ring with 2px offset
- Hover effect: Scale 1.1

---

## Empty States

### Empty State Component

**Location**: `/src/app/components/shared/empty-state.tsx`

Beautiful placeholder screens for sections without data.

#### Features
- **Large icon**: 64px × 64px in muted circle
- **Clear title**: Explains what's missing
- **Helpful description**: Guides user on next steps
- **Theme-aware**: Adapts to current theme mode
- **Centered layout**: Vertically and horizontally centered

#### Props
| Prop | Type | Required | Description |
|---|---|---|---|
| `icon` | `LucideIcon` | Yes | Icon displayed in the empty state |
| `title` | `string` | Yes | Primary heading |
| `description` | `string` | Yes | Supporting text |
| `actionIcon` | `LucideIcon` | No | Icon for the optional action button |
| `actionLabel` | `string` | No | Label for the optional action button |
| `onAction` | `() => void` | No | Callback for the optional action button |

#### Usage Pattern
```tsx
<EmptyState
  icon={Video}
  title="No Security Cameras"
  description="You don't have any security cameras configured yet."
/>
```

#### Sections with Empty States
- Security: "No Security Cameras"
- Tasks: "No Tasks"
- Locks: "No Smart Locks"
- Lights: "No Lights"
- Media: "No Media Players"

### Inline Empty State Component

**Location**: `/src/app/components/shared/inline-empty-state.tsx`

Compact inline empty state for use inside panels and dialogs where the full-page centered treatment is too heavy.

#### Props
| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | Primary heading |
| `description` | `string` | Yes | Supporting text |
| `surface` | `ReturnType<typeof getThemeSurfaceTokens>` | Yes | Theme surface tokens |
| `accentColor` | `string` | No | Accent color for gradient tint (default `#9fb0ff`) |
| `icon` | `LucideIcon` | No | Icon (default `Wand2`) |
| `actionLabel` | `string` | No | Label for optional action button |
| `onAction` | `() => void` | No | Callback for optional action button |
| `actionIcon` | `LucideIcon` | No | Icon for optional action button |
| `className` | `string` | No | Extra class names |
| `children` | `ReactNode` | No | Additional content below the action |

#### Used by
- `NotificationEmptyState` — empty notifications panel
- `AddEntityDialog` — no matching entities in search

---

## Responsive Behavior

### Desktop (≥ 1280px)
- Sidebar always visible on left
- Settings: Maximum width 896px (max-w-2xl), centered
- Grid: 6 columns at `xl`, growing to 8 columns at `2xl`
- Navigation: Sidebar icons only

### Tablet (768px - 1279px)
- Sidebar visible on left
- Grid: 4 columns
- Navigation: Sidebar remains primary

### Mobile (< 768px)
- No sidebar
- Compact iOS-style bottom navigation bar with icon + label tabs for 6 sections including Mock and Settings
- Grid: 2 columns
- Settings: Full width with mobile padding
- Dashboard header compacts greeting, search, notifications, and avatar into one top row
- Room navigation spacing is reduced so content starts higher on the screen

---

## User Experience Flows

### First-Time User Flow
1. **Login Page** → Enter Home Assistant URL and token
2. **Onboarding Dialog** → Choose start with all entities, a blank dashboard, or import a YAML config file
3. **Dashboard** → See current entities and rooms
4. **Explore Sections** → Navigate to different sections via sidebar/bottom nav
5. **Customize Appearance** → Go to Settings → adjust theme, accent color, visual quality, and light-card ambience
6. **Edit Cards** → Enter edit mode from Customize to add/remove entities, reorder cards, and resize cards

### Settings Customization Flow
1. Navigate to Settings section
2. Select Appearance card
3. Choose theme mode (Liquid Glass/Dark/Light/Black)
4. Select a built-in accent color or choose a custom accent
5. Set visual quality to High, Medium, or Low when needed
6. Changes apply immediately across entire app
7. Theme persists across sessions

### Authentication Flow
1. **Logged Out** → Show login page
2. **Enter Credentials** → Validate URL format
3. **Submit** → Attempt connection to Home Assistant
4. **Success** → Store auth in localStorage, redirect to dashboard
5. **Error** → Show error message, keep on login page

### Logout Flow
1. Click user avatar in header
2. Select "Logout" from dropdown (or go to Settings)
3. Confirm logout in browser dialog
4. Clear localStorage
5. Redirect to login page

---

## Technical Implementation

### State Management

All shared state is Zustand. Auth and config are stores, not React Context providers.

**Auth store** (`src/app/stores/auth-store.ts`)
```tsx
interface AuthState {
  isAuthenticated: boolean;
  config: SessionConfig | null;
  login: (url: string, token: string) => Promise<boolean>;
  logout: () => void;
}
```

**Theme store** (`src/app/stores/theme-store.ts`)
```tsx
interface ThemeState {
  theme: 'glass' | 'dark' | 'light' | 'contrast';
  primaryColor: PrimaryColor;
  customPrimaryColor: string | null;
  wallpaper: string | null;
}
```

**Navigation store** (`src/app/stores/navigation-store.ts`)
```tsx
interface NavigationState {
  currentRoom: string;
  activeSection: Section;
}
```

Access these through their hook wrappers: `useAuth()`, `useTheme()`, `useNavigation()`. See
`src/app/stores/selectors.ts` for optimized per-field selectors.

### Local Storage

**Keys Used**
- `ha_auth_config` — Auth config and token (`STORAGE_KEYS.authConfig`)
- `ha-dashboard-config` — HA connection config (`STORAGE_KEYS.haConfig`)
- `ha-dashboard-theme` — Theme mode and primary color (Zustand persist)
- `ha-dashboard-settings` — User preferences (Zustand persist)
- `ha-dashboard-navigation` — Active section and current room (Zustand persist)
- `navet-dashboard-entities` — Hidden entity ids and onboarding state (Zustand persist)
- `ha-dashboard-card-sizes` — Per-card size overrides
- `ha-dashboard-card-orders` — Card ordering per room
- `ha-dashboard-room-order` — Custom room sort order
- `ha-dashboard-home-layout` — Home screen layout: card IDs, section assignments, layout mode (`flow`/`sectioned`), hero visibility

Restarting onboarding should always return the user to Home / All before reopening the wizard.

### CSS Variables

Theme system uses CSS custom properties defined in `/src/styles/theme.css`:
- Spacing tokens
- Color tokens
- Typography scale
- Border radius values
- Shadow definitions

---

## Accessibility

### Keyboard Navigation
- All sections accessible via Tab key
- Settings: Tab through theme options and color buttons
- Dropdown: Arrow keys to navigate menu items
- Login form: Standard form tab order

### Screen Readers
- Semantic HTML structure
- ARIA labels on icon-only buttons
- Form labels properly associated
- Section headings for navigation

### Visual Accessibility
- Liquid Glass and Black theme options
- Minimum 44px touch targets
- Clear focus indicators
- Sufficient color contrast ratios
- Text sizing options via browser

---

## Performance Considerations

### Theme Switching
- Instant theme application (no reload)
- CSS variables for dynamic color changes
- Memoized components prevent unnecessary re-renders

### Dashboard Layout
- Rooms display in their natural Home Assistant area order; drag-and-drop room reordering has been removed
- Cards are ordered via the card ordering store
- `contain: layout style` on card wrappers reduces cross-card style recalculation during scroll

### Edit Mode Performance
- Toggling edit mode is wrapped in `startTransition` — marks the 100+ card re-renders and ~200 new DOM node insertions as non-urgent, keeping the UI responsive on low-end hardware (RPi) while React processes the batch in the background

### HA Entity Update Performance
- `deviceIdentityKey` — a stable string of `id:room` pairs gates `buildOrders` recreation in `useCardOrdering`; HA state-only updates (temperature, brightness) never trigger a card ordering rebuild
- `useDeviceMap` reference stabilization — unchanged device objects reuse their old reference; when no devices changed, the same Map instance is returned, collapsing the cascade of re-renders
- `RoomSection` custom memo comparator — only checks devices belonging to the current section, so sections with no changes skip re-rendering entirely when another section's device updates
- Edit-mode action handlers use a single stable `useCallback` per action type shared across all cards via event delegation, rather than per-card closures

### Low-Power Mode CSS
- The `[data-effects-quality="low"] *` universal selector strips `backdrop-filter`, `-webkit-backdrop-filter`, and `will-change` from the entire subtree in one rule, avoiding per-component media query checks on RPi-class hardware

### Navigation
- Section-based code splitting (future enhancement)
- Lazy loading of section components
- Navigation state persists across renders

### Authentication
- Token stored securely in localStorage
- Session validation on app load
- Graceful handling of expired tokens

---

## Future Enhancements

### Shipped since initial docs
- [x] Card ordering store (drag-and-drop for both cards and rooms has been removed)
- [x] Export/import dashboard YAML config
- [x] PWA installation support
- [x] Security section: full camera card with snapshot display, power toggle, refresh, and sibling entity settings dialog
- [x] Dashboard Builder: flow and sectioned layout modes, floating card library panel, drag-and-drop from library to canvas
- [x] Section resize with snap widths: ← → controls in section headers snap column widths to multiples of 3 (out of 12); neighbor section compensates automatically; controls hidden on single-column rows
- [x] Energy dashboard: live HA data, statistics, setup panel, device tracking, SVG chart primitives

### Planned
- [ ] Custom theme builder with color wheel
- [ ] Light/dark theme auto-switching based on time
- [ ] Per-section customization
- [ ] User profile editing
- [ ] Multiple dashboard layouts

### Under Consideration (v2.0)
- [ ] Multi-user support with different profiles
- [ ] Advanced accessibility settings
- [ ] Gesture navigation for mobile
- [ ] Section reordering
- [ ] Custom section creation
- [ ] Widget marketplace

---

## Best Practices

### When Adding New Sections
1. Add the section to `src/app/navigation/sections.ts` and the exported navigation hook API
2. Create the section component in `src/app/features/<name>/`
3. Register in `src/app/features/dashboard/components/dashboard-section-router.tsx` using `lazy()`
4. Add icon to the sidebar (`src/app/components/layout/sidebar.tsx`) and mobile bottom nav if appropriate
5. Use `DeviceSectionLayout` in `src/app/components/layout/sections.tsx` for sections that follow the standard device-list pattern (empty state → entity grid). Pass `devices`, `rawDevices`, `emptyIcon`, and the four label strings; the component owns the empty/grid branching logic
6. Implement an empty state if no data is available, with the primary recovery action visible when possible
7. Test at all breakpoints

### When Adding Theme-Dependent Styling
1. Use the theme hook to get current theme
2. Define color variations for all four themes
3. Use primary color for active/selected states
4. Test in all theme modes, including Liquid Glass and Black
5. Ensure sufficient contrast in all modes

### When Modifying Authentication
1. Update AuthContext interface
2. Handle loading and error states
3. Persist to localStorage if needed
4. Test logout flow thoroughly
5. Consider security implications

---

**Last Updated**: March 20, 2026
**Version**: 1.8
**Status**: Living Document

---

---

## Energy Dashboard

**Location**: `src/app/features/energy/`

A dedicated full-page section for monitoring home load, grid dependency, individual device energy, and bathroom/toilet demand. Connects to the Home Assistant energy domain via `useEnergyDashboard`.

### Setup and Configuration

`EnergySetupPanel` (`components/energy-setup-panel.tsx`) — an inline form that maps HA sensor entity IDs to each energy source:

- **Auto-detect** — calls `energy/get_prefs` over WebSocket to read the user's HA Energy dashboard configuration and pre-fills all source fields. Uses `homeAssistantService.getConnection()` directly (not the Zustand-stored connection, which loses prototype methods after state diffing). The button is disabled when not connected to HA.
- **Source fields** — solar power/energy, battery SoC/power, grid import/export power and energy, home load power. Each field has a native `<datalist>` autocomplete populated from live sensor entity IDs.
- **Devices section** — auto-detected individual device monitors (from `device_consumption` in HA Energy prefs) are shown as editable rows. Each device shows its name, cumulative kWh entity ID, and an optional live power sensor input. Devices can be removed individually.
- **Save** — persists to `energy-dashboard-store` via `setSourceConfig`. The store uses Zustand `persist` middleware.

### Data Layer

**`useEnergyHaData`** (`hooks/use-energy-ha-data.ts`) — assembles `EnergyOverview` from live HA entity states. Falls back to mock data when no config is saved.

- Reads entity states via `useHomeAssistant(homeAssistantSelectors.entities)` (minimal selector).
- Home load is derived as `solar + gridImport − gridExport` when no dedicated load sensor is configured.
- `liveStats` array is conditionally built — solar/battery/grid stats are only included when the corresponding entity IDs are configured, so unconfigured sources are never shown.
- Three module-level helpers keep the hook under 50 lines: `buildLiveStats`, `buildFlow`, `buildConsumers`. These are pure functions called inside `useMemo`.

**`useEnergyStatisticsToday`** (`hooks/use-energy-statistics-today.ts`) — polls `recorder/statistics_during_period` with `period: 'day'` and `types: ['change']` to get today's kWh delta for all configured energy entities. Refreshes every 5 minutes. Returns a `Record<entityId, kWh>` map. Silently fails — the dashboard remains usable without statistics.

**`useEnergyDashboard`** (`hooks/use-energy-dashboard.ts`) — orchestrating hook consumed by `EnergySection`. Derived values computed with `useMemo`:

- `bathroomToiletConsumers` — consumers filtered by `bathroom_heater` / `toilet_heater` / `floor_heating` category
- `bathroomToiletTodayKWh` / `bathroomToiletPowerW` — summed totals for the focus-zones widget
- `topDeviceTotals` — top 8 consumers (sorted by `energyKWh` desc in `buildConsumers`)
- `gridAllocation` — distributes today's grid import kWh proportionally across tracked devices; adds an "Untracked / shared loads" remainder entry
- `batteryDevices` — all HA battery-class sensors, sorted by level asc (for the battery overview widget)
- `periodTotals` — multi-period statistics from `useEnergyStatisticsPeriods`

### Widgets

Memoized widget components, each receiving only its required props from `EnergySection`:

| Widget | Key props | Description |
|---|---|---|
| `EnergyStatusWidget` | `liveStats`, `importTodayKWh?`, `solarTodayKWh?` | Live stat cards grid; shows a "Today" panel with grid import kWh and solar kWh when those props are provided (only passed when `isConfigured`) |
| `EnergyNowWidget` | `currentLoadW`, `gridImportW`, `trend`, `accentColor` | Live load reading with a sparkline trend of recent values |
| `EnergyDeviceTotalsWidget` | `consumers` | Top devices ranked by today's kWh; shows live W alongside kWh when a power sensor is configured; shows empty state when no devices are tracked |
| `EnergyFocusZonesWidget` | `todayKWh`, `currentPowerW`, `consumers` | Bathroom and toilet energy focus — today's kWh total, live W, and per-device breakdown |
| `EnergyGridAllocationWidget` | `importTodayKWh`, `allocation` | Grid import split across individual devices + untracked remainder |
| `EnergyStorageWidget` | `batteryPercent`, `solarW`, `currentLoadW`, `importW`, `hasBattery?`, `hasSolar?` | Semi-circle gauges for battery reserve and solar coverage; quality bar for grid dependency. Gauges hidden when the corresponding source is not configured |

Widget visibility is toggled via filter pills in the section header; state persists in `energy-dashboard-store`.

### HA API Calls

| Call | Hook / Service | Purpose |
|---|---|---|
| `energy/get_prefs` | `energy-ha-service.ts` | Auto-detect source and device entity IDs from HA Energy config |
| `recorder/statistics_during_period` | `energy-statistics-service.ts` | Today's kWh delta per entity (period: day, types: change) |

### Chart Primitives

All charts are custom SVG — zero bundle cost, full theme control, Raspberry Pi-safe. Located in `src/app/features/energy/components/charts/`.

**`EnergyGauge`** (`energy-gauge.tsx`)
- Semi-circle arc gauge using `stroke-dasharray` trick
- Arc: center `(100, 100)`, radius 78, `viewBox="0 0 200 115"` (crops below center line)
- `SEMI_CIRC = Math.PI * R`; `filled = (value/100) * SEMI_CIRC`
- Props: `value` (0–100), `color`, `label`, `sublabel`

**`EnergyBarChart`** (`energy-bar-chart.tsx`)
- Vertical gradient bars, `viewBox="0 0 400 160"`
- Per-bar `linearGradient` in `<defs>`; diagonal stripe `<pattern>` overlay for alert bars
- Alert indicator: SVG polygon triangle + vertical line + dot
- Props: `data: EnergyBarDatum[]`, `color`, `alertColor`

**`EnergyAreaChart`** (`energy-area-chart.tsx`)
- Step-style area + line, `viewBox="0 0 400 140"`, `PAD = { top:10, right:6, bottom:26, left:36 }`
- Grid lines at `yTicks`; y-axis labels with `yUnit` suffix; x-axis labels
- `useId()` for gradient ID uniqueness across multiple instances
- Props: `data: EnergyAreaPoint[]`, `yMax`, `yTicks`, `yUnit`, `color`

**`EnergyQualityBar`** (`energy-quality-bar.tsx`)
- Horizontal segmented bar (44 segments default)
- `STOP_COLORS` scale from red → green; active segments at `opacity 0.88`, inactive at `0.10`
- Props: `value` (0–100), `label`, `badLabel`, `goodLabel`, `segments`

**`EnergySparkline`** (`energy-sparkline.tsx`)
- Compact smooth curve for real-time power trace; no axes, no labels
- Catmull-Rom → cubic bezier conversion for smooth interpolation
- `preserveAspectRatio="none"` — fills any container aspect ratio
- Live endpoint dot at the last data point
- Props: `data: EnergySparklinePoint[]`, `color`, `height`

### Data Constants

`src/app/features/energy/data/energy-constants.ts` — module-level constants extracted from render paths:

- `FLOW_TO_NODE_ID` — maps flow tone strings to HA node IDs
- `FLOW_TONE_GRADIENT` — CSS gradient strings per flow tone
- `HEATING_CATEGORIES: ReadonlySet<EnergyConsumerCategory>` — O(1) `.has()` lookups for heating appliance filtering

---

## Shared Hooks

### `useHaCommandQueue`

`src/app/hooks/use-ha-command-queue.ts`

Debounces async HA service calls with in-flight request tracking. Used by the light card controller for brightness and color temperature slider interactions.

- Queues the latest value and flushes after a configurable debounce window (default 75 ms)
- If a request is already in flight, re-flushes automatically once it resolves
- Exposes `cancel()` to drop a pending value (e.g. a color change cancels a queued temp sync)
- Manages its own cleanup on unmount

---

### `useHomeDashboardEditor`

`src/app/features/dashboard/hooks/use-home-dashboard-editor.ts`

Controller hook for the Dashboard Builder edit canvas. Accepts the current `deviceMap`, `allCustomCards`, `homeLayout`, and `cardSizes` and returns everything the `HomeDashboardOverview` component needs to render and interact with the editor.

**Returns**:
- `allCards` — unified `Map<id, DeviceWithType | CustomCard>` combining devices and widgets
- `flowCards` — IDs of cards not assigned to any section (used in `flow` mode and as overflow in `sectioned` mode)
- `sectionCards` — sections as `HomeEditorSection[]` (id, title, span, x, y, cardIds), consumed by `buildSectionStacks` in the render layer
- `activeDragCard` / `setActiveDragCard` — active drag overlay state
- `activeDragSize` — resolved size of the card currently being dragged (for the `DragOverlay`)
- `sensors` — pre-configured dnd-kit sensors (pointer with 8px activation threshold + keyboard)
- `handleDragEnd` — resolves drop target and calls `addHomeCard` / `moveHomeCard` as appropriate
- `libraryCards` — available (unplaced) cards for the floating library panel
- `filteredLibraryCards` — library cards filtered by search query, capped at 5
- `libraryQuery` / `setLibraryQuery` — search input state
- `handleAddFromLibrary` — places a library card onto the canvas
- `summaryItems` — `{ label, value }[]` for the four stats in the editor header

---

### `useLibraryPanel`

`src/app/features/dashboard/hooks/use-library-panel.ts`

Manages all state and behaviour for the floating card library panel in the Dashboard Builder.

**Returns**:
- `libraryPanelRef` — `RefObject<HTMLDivElement>` attached to the panel element (needed for drag offset calculation)
- `isLibraryVisible` / `isLibraryCollapsed` — controls which panel state is rendered
- `libraryPosition` — `{ x, y }` pixel position; updated on drag and on window resize
- `handleStartLibraryDrag` — `PointerEvent` handler that attaches `pointermove`/`pointerup` listeners for free-drag repositioning
- `toggleLibraryVisibility` — shows or hides the panel, resetting the collapsed state
- `expandLibrary` — shows the full panel and snaps it to the default right-side position
- `collapseLibraryToDock` — collapses the panel to a slim dock tab on the right edge
