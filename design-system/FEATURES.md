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

#### Shared Theme Primitives

Recent UI cleanup moved repeated theme logic into shared primitives so cross-theme behavior can be changed in one place:

- **Entity icon pill styles** - centralized under shared theme helpers for all 4 themes
- **Interactive nav/action pills** - centralized for active/inactive, light/dark/contrast/glass behavior
- **Round control button** - shared circular action control primitive for card actions across lighting, media, HVAC, security, and vacuum cards
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

---

## Navigation System

### Navigation Hook + Store

**Location**: `/src/app/hooks/use-navigation.ts`

Manages section navigation state across desktop and mobile layouts through a direct hook API backed by shared client state.

#### Sections

| Section  | Description                    | Icon      | Status    |
|----------|--------------------------------|-----------|-----------|
| Home     | Main dashboard with all cards  | Home      | Active    |
| Security | Security cameras and monitoring | Video     | Placeholder |
| Tasks    | Automations and routines       | Clipboard | Placeholder |
| Locks    | Smart lock controls            | Lock      | Active    |
| Lights   | Lighting control center        | Lightbulb | Active    |
| Media    | Media player management        | Tv        | Active    |
| Mock     | Flat staging area for mock entities | FlaskConical | Active |
| Settings | App settings and preferences   | Settings  | Active    |

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
- **Sections shown**: Home, Security, Lights, Media, Mock, Settings

#### Implementation
```tsx
const { activeSection, setActiveSection } = useNavigation();

// Navigate to section
setActiveSection('lights');
```

---

## Settings Section

### Settings Page

**Location**: `/src/app/features/settings/components/settings-section.tsx`

Full-page settings interface with card-based organization.

#### Sections

**1. Appearance**
- **Theme Mode Selection**: 2 × 2 grid of theme option cards
- **Primary Color Picker**: 8 built-in accent circles plus a custom accent swatch
- **Visual quality**: choose between High, Medium, and Low glass rendering
- **Localized theme picker copy**: theme names and descriptions resolve through the shared i18n dictionaries
- **Light card ambience**: global visual toggle between ambient bleed and contained light-card rendering
- **Theme-aware ambience preview**: the ambience preview uses the shared preview-frame primitive, and the shared `Live Preview` header localizes with the active language
- **Shared color picker primitive**: custom accents, light colors, and Kelvin swatches reuse the same base control with size variants
- **Brightness presets**: light cards use a compact 3-preset set (`Bright`, `Dim`, `Night`) that fits inline without an overflow menu
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

### Dashboard Drag & Drop
- Drag reordering uses local state during the drag — the global store is written only once on drop, eliminating per-event re-renders and localStorage writes
- `contain: layout style` on card wrappers reduces cross-card style recalculation during scroll

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
- [x] Drag & drop card and room reordering (via `@dnd-kit`)
- [x] Export/import dashboard YAML config
- [x] PWA installation support

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
5. Implement an empty state if no data is available, with the primary recovery action visible when possible
6. Test at all breakpoints

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

**Last Updated**: March 5, 2026  
**Version**: 1.5  
**Status**: Living Document
