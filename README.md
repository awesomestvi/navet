# Navet

<div align="center">

<img src="public/logo.svg" alt="Navet Logo" width="120" height="120" />

<br />
<br />

![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38bdf8)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)

**A beautiful, iOS-inspired smart home dashboard with adaptive glass aesthetics**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Widgets](docs/WIDGETS.md) • [License](#license) • [Contributing](CONTRIBUTING.md)

</div>

---

## 📱 Overview

Navet (Swedish for "the hub") is a modern, responsive smart home dashboard built with React and Tailwind CSS v4. It maintains a premium glass-inspired design language while scaling visual effects across powerful and low-power devices, with comprehensive smart home control capabilities and an intuitive editing system.

Current release channel: `0.1.0-beta.2`. See [docs/VERSIONING.md](docs/VERSIONING.md) for the beta versioning policy and tag-driven GitHub release flow.

## ✨ Features

### 🎨 Design
- **Adaptive Glass Interface** - Premium liquid-glass surfaces with layered frost, brighter edge highlights, and quality-aware depth for high, medium, and low-power devices
- **4 Theme Modes** - Liquid Glass, Dark, Light, and Black
- **Custom Accent Colors** - 8 built-in accents plus a custom accent color picker
- **Multi-Language UI** - English, Swedish, German, French, and Spanish interface support with locale-aware date, time, and number formatting
- **Dynamic Greeting** - Header greeting rotates on each session: time-of-day greetings (Good morning/afternoon/evening/night) with occasional casual variants (Hi, Hey, Welcome back), fully localized across all five languages
- **Responsive Grid** - 2 columns (mobile) → 4 (`md`) → 6 (`xl`) → 8 (`2xl`) → 12 (`4xl`)
- **Adaptive Cards** - Extra-Small, Small, Medium, and Large card sizes
- **Adaptive Cards** - Tiny, Extra-Small, Small, Medium, and Large card sizes, with compact action-card layouts for the smallest tiles

### 🏠 Smart Home Control
- **Multi-Entity Support** - Lights, HVAC, switches, covers, locks, sensors, helpers, scripts, people, media players, vacuums, and more
- **Unified Climate Controls** - Home Assistant climate entities now render through the HVAC card and settings flow across the dashboard
- **Home Assistant Media Controls** - Media player cards now use live Home Assistant playback, local mute/unmute volume memory, metadata, remaining-time, and artwork data
- **Real-Time Updates** - Live state updates from your smart home system
- **Quick Actions** - Toggle, adjust, and control devices with intuitive controls
- **Room Organization** - Organized by rooms with dedicated room views
- **Configurable Card Interactions** - Choose whether card tap toggles devices or opens controls

### 🛠️ Functionality
- **Edit Mode** - Card resizing, entered from **Customize**
- **Custom Widgets** - Add RSS Feed, Photo Frame, Quick Note, Battery Overview, and Button widgets
- **Entity Visibility Control** - Start with all entities, a blank board, or import a saved config, then add/remove entities as needed
- **Search & Filter** - Real-time search filters dashboard view, including Home Assistant-style entity id queries such as `light.`, `sensor.`, and full ids, with compact mobile search access from the header
- **Home Room Grouping** - Switch the Home room between custom, room, type, or no-grouping layouts
- **Page Zoom Setting** - Appearance settings include page zoom presets so the whole dashboard can be scaled without relying on browser zoom
- **Live Weather Entity Card** - Home Assistant weather entities now render as the dashboard weather card with forecast and solar data from Home Assistant
- **Calendar Entities** - Home Assistant calendar entities now render through the live calendar card with per-card source selection, week/month views, and event details
- **Person Entities** - Home Assistant `person.*` entities render as live person cards with profile images and normalized presence/location text
- **Helpers and Scripts** - Home Assistant helper domains and scripts can be added through the existing sensor and switch-style card paths
- **Home Assistant Notifications** - Navet notifications now show Home Assistant persistent notifications, repairs/issues, update actions, and markdown-formatted message content
- **Card-Level Room Editing** - Supported entity cards, including calendar and weather, can reassign their room directly from the settings dialog
- **Settings** - Comprehensive theme and customization options
- **User Management** - Login system with user profiles
- **Data Persistence** - Automatic localStorage persistence of all settings:
  - ✅ Theme mode and primary color
  - ✅ Current room selection
  - ✅ Custom widgets and layouts
  - ✅ User preferences
- **Installable PWA Shell** - Manifest, service worker, offline app shell, update prompt, and install assets for mobile/desktop install surfaces

### 🔐 Security
- **Local First** - Runs entirely on your device
- **No Tracking** - Zero analytics or data collection
- **Secure Connections** - Direct connection to your smart home instance

### ⚡ Performance
- **Lazy-Loaded UI** - Settings, add-card flows, widgets, and media dialogs load on demand
- **Deferred Room Rendering** - Offscreen room groups are deferred in the Home room view
- **Batched Room Mounting** - Visible Home room sections now hydrate cards in smaller batches instead of one large render burst
- **Offscreen Card Skipping** - Non-edit dashboard cards now use browser offscreen rendering hints to reduce Home room scroll cost on large boards
- **Virtualized Entity Picker** - The Add Entity dialog window-renders large Home Assistant entity lists
- **Smart Re-renders** - Per-entity subscriptions mean each card reacts only to its own HA state changes; the device map rebuilds only when entities are added or removed, not on every state update
- **Off-screen Skip** - Room sections use `content-visibility: auto` so the browser skips layout, paint, and compositing for rooms outside the viewport; single-room view batch-loads cards on idle frames
- **Low-Power Mode** - Optional reduced-effects mode for slower devices, with cheaper glass rendering and contained light cards
- **Auto Device Tier** - On first load, a micro-benchmark and hardware signals (CPU cores, memory) automatically select the right effects quality; RPi-class hardware gets low effects without any manual configuration; the Visual Quality setting in Appearance shows the recommended tier so users can see what was detected
- **Local Config Backup** - Export and restore dashboard layout/preferences from a YAML file
- **Tree-shakeable** - Only imports what's actually used

### 🧱 Architecture
- **Feature-Owned Modules** - Dashboard, lighting, settings, sensors, weather, and other major areas expose feature-level entry points under `src/app/features/*`
- **Feature-Colocated State** - Dashboard and lighting hooks/stores live with their owning features instead of generic global folders
- **Shared UI Foundation** - Cross-feature pieces such as card sizing, empty states, interaction previews, and theme color helpers live under shared component modules
- **Shared Title + Tiny Card Primitives** - Compact action cards and eyebrow-first title blocks now come from shared primitives so small card layouts stay consistent across feature types
- **Shared Visual Primitives** - Cross-theme icon pills and interactive nav/action pills are centralized behind reusable shared primitives instead of feature-level inline theme branches
- **Shared Card State Styling** - Off/inactive card treatment for light, HVAC, switch, and media cards now resolves through one shared card-state surface token helper
- **Artwork-Led Media Layouts** - Small, medium, medium-vertical, and large media cards use artwork-driven layouts with shared transport controls, speaker/room headers, and empty-state fallbacks
- **Composable Controller Hooks** - Dashboard, lighting, media, climate, and settings controllers are split into smaller focused hooks (sync, actions, display, and interaction) to keep feature behavior easier to extend and validate
- **Controller Runtime Slices** - Entity card controllers now separate runtime synchronization from presentational shaping; for example light-card runtime sync, interaction wiring, and final controller-state building live in distinct helper modules
- **Feature-Level Action Hooks** - Dashboard, media, and settings action handlers are intentionally extracted to feature-local hooks so business actions can evolve without inflating controller hooks
- **Typed i18n Contracts** - Translation callback typing is standardized through exported i18n types to avoid repeated ad-hoc translator signatures and cross-feature type drift
- **Single Climate Card Path** - The legacy `ClimateCard` implementation has been removed; climate entities now use `HVACCard` only
- **Consistent Persistence** - Storage keys plus dashboard/light preference persistence are standardized behind shared helpers and feature stores

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm/pnpm
- A running smart home system (Home Assistant or compatible)
- Smart home API token

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/awesomestvi/navet.git
   cd navet
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   pnpm setup:hooks
   ```

3. **Configure your smart home connection**

   Create a local env file from the example and set your Home Assistant connection details:
   ```bash
   cp .env.example .env
   ```

   Then set:
   ```env
   NAVET_HASS_URL=http://your-home-assistant:8123
   NAVET_HASS_TOKEN=your-long-lived-access-token
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Add the local hostname**

   Add this entry to your hosts file so the Vite dev host resolves locally:
   ```text
   127.0.0.1 navet.local
   ```

6. **Open in browser**

   Navigate to `http://navet.local:5200`

### Installable PWA

- Navet now ships with a service worker, install manifest, offline shell, and update prompt
- The app can be installed from supported desktop and mobile browsers
- Offline mode currently preserves the app shell and clearly signals that live Home Assistant data still requires connectivity
- Installed iOS/iPadOS mode respects safe-area insets so the header, sidebar logo, and mobile bottom navigation stay clear of the status area and rounded bottom corners

### Build Verification

```bash
pnpm typecheck
pnpm build
```

### Production Preview

Use the production preview flow when you need to verify runtime config, Home Assistant proxy behavior, or other non-dev-server behavior locally.

```bash
pnpm preview
```

This builds the app, writes `dist/config.js` from `NAVET_HASS_URL` and `NAVET_HASS_TOKEN`, and serves the production bundle on `http://localhost:4173`. It is the recommended local check for Home Assistant proxy-backed artwork and other production-only media behavior.

## 📖 Usage

### First Time Setup

1. **Provide Home Assistant credentials** via `.env`, Docker runtime config, or the in-app login screen
2. **Connect System** - Ensure your Home Assistant instance is accessible
3. **Finish onboarding** - Choose your route, localization, and appearance before entering the dashboard
4. **Customize Layout** - Enter Edit Mode from **Customize** to arrange rooms and cards
5. **Optional for slower hardware** - Lower visual quality in Settings -> Appearance

### Features Guide

#### Edit Mode
- Click **Customize**
- The top action row uses **Done Editing** plus **Add** and **View** dropdowns
- **Add widgets** from the **Add** dropdown
- Use **Add Entity** to bring entities onto the dashboard
- Use supported card settings dialogs to move an entity directly into a different room
- Use the card remove action to remove entities from the dashboard
- Edit-mode remove/delete/resize actions are delegated from the grid container instead of attaching separate edit handlers and menus to every card
- Use the top-right resize action to change card size (`extra-small`/small/medium/large, depending on card type)
- Some compact action-style cards now also support a `tiny` micro-tile size for denser dashboard layouts
- **Save changes** when done

#### Search
- On desktop, type in the **search bar** to filter devices
- On mobile, tap the **search icon** in the header to open the compact search field
- Search supports Home Assistant-style entity ids and domains
- Type `light.` to show light entities, `sensor.` to show sensor entities, or a full id such as `light.dining_table_lamp` to target one entity directly
- View filters to show only matching entities
- Clear with the **X button**

#### Themes
- Access **Settings** from the user menu
- Choose from **4 modes**: Liquid Glass, Dark, Light, and Black
- Liquid Glass now uses a denser frosted treatment with stronger rim highlights and deeper control surfaces instead of a flatter transparent blur
- Select from **8 built-in accents** or choose a **custom accent color**
- Choose **Visual Quality** in **Settings -> Appearance**: **High**, **Medium**, or **Low**
- Choose **Page Zoom** in **Settings -> Appearance** to scale the whole interface with built-in presets (50%, 67%, 75%, 80%, 90%, 100%); a **Reset** button appears inline when a non-default zoom is active
- Choose the app **Language** in **Settings -> Localization** to switch locale-aware interface formatting
- Theme mode names and descriptions follow the selected app language
- First-run onboarding now gives **Localization** its own step for language, time format, and temperature unit before the appearance step
- In **Settings -> Appearance**, choose whether active light cards use **Ambient bleed** or stay **Contained** inside the card
- On light cards that support color temperature, tapping the Kelvin swatch switches the card's slider to the color temperature slider; the slider automatically returns to brightness after 3 seconds of inactivity or when clicking outside the card
- Choose from **8 built-in wallpapers** (Serene Dawn, Starfield Nocturne, Aurora Veil, Rainforest Canopy, Ember Loft, Slate Passage, Coastal Haze, Night Lounge) shown as compact circle swatches, or upload your own image as a dashboard background
- Custom accent colors, preset accent colors, light colors, and Kelvin swatches now share the same color-picker primitive and sizing language
- Light brightness presets now use a compact **3-preset** set: **Bright**, **Dim**, and **Night**
- Shared theme-sensitive pieces such as entity icon pills and nav/action pills now resolve through reusable shared primitives rather than per-feature inline styling
- Inactive/off card shells and text treatment now also resolve through a shared card-state primitive instead of per-card opacity tweaks
- Colored card headers now derive title, subtitle, and active icon colors from the card’s own color family with shared contrast-aware tokens instead of fixed white/gray text

#### Card Interaction Style
- In **Settings -> Interaction**, choose how entity cards respond to taps
- **Tap toggles**: tapping the card toggles the device directly
- **Tap opens controls**: tapping the card opens the device controls instead
- The settings screen includes a live practice card preview so you can test the interaction before leaving Settings
- On **extra-small** light cards, the compact brightness slider always stays visible
- In **Tap toggles** mode, the settings button moves onto the slider row with compact spacing
- In **Tap opens controls** mode, that button is hidden and the slider expands to the full row width

#### Room Navigation
- Use **room tabs** to filter by room
- In **Home**, use the **View** dropdown (edit mode) to switch between **Custom**, **Room**, **Type**, and **No Grouping**
- Device counts shown for each room
- Each section has its own URL path (`/`, `/security`, `/lights`, `/settings`, etc.) — browser back/forward navigate between sections, and refreshing opens the correct section directly
- Navigating between sections scrolls back to the top automatically
- On mobile, the header and room navigation are intentionally compacted so the first card rows appear sooner

#### Calendar Cards
- Home Assistant `calendar.*` entities can be added directly to the dashboard
- Each calendar card can choose which calendars it aggregates
- Calendar cards support **This Week** and **This Month** views
- Calendar cards can also be reassigned to a room from their settings dialog

#### Weather Cards
- Home Assistant weather entities can be added directly to the dashboard
- Weather cards support room reassignment from their settings dialog

#### Person, Helper, and Script Cards
- Home Assistant `person.*` entities render as live person cards with profile images when available
- Helper/value entities such as `number`, `select`, `text`, `date`, and related domains map into the sensor-card path
- Actionable helper domains such as `input_boolean`, `button`, `input_button`, and `script` map into the switch-style card path
- Clicking an event opens a details dialog with time, notes, location, and an **Open Map** action when location is available

#### Notifications
- Home Assistant persistent notifications appear in Navet notifications
- Home Assistant repairs/issues appear in Navet notifications
- Home Assistant update entities can surface `Update`, install progress, and `Restart` actions directly in Navet
- Markdown-style notification content such as headings, links, inline code, and images is rendered inside the notification panel

#### Dashboard Content
- On first launch, choose whether to start with all discovered entities or a blank dashboard
- You can also import a previously exported dashboard config directly from onboarding
- After onboarding, use **Add Entity** and **Remove Entity** to curate the board
- This is useful for excluding helper, diagnostic, or duplicate Home Assistant entities without switching between dashboard modes
- The empty dashboard state now exposes **Add Entity** directly so blank dashboards do not dead-end
- Restarting onboarding from Settings sends you back to the Home dashboard and reopens the onboarding dialog

#### Dashboard Config
- In **Settings -> Dashboard**, export your local dashboard setup to a YAML file
- Navet imports that YAML file later from Settings or directly from first-run onboarding
- Import that file later on the same machine or another device to restore:
  - theme and wallpaper
  - room order and card order
  - card sizes
  - custom widgets
  - removed entity state and onboarding state
  - light preset settings
- Home Assistant connection URL and token are intentionally not included

#### Custom Widgets
- Open the **Add** dropdown in edit mode to add custom widgets
- Choose from **5 widget types**:
  - **📰 RSS Feed** - Live articles from direct RSS URLs or Home Assistant Feedreader sources
  - **🖼️ Photo Frame** - Decorative ambient frame with built-in rotating artwork panels
  - **📝 Quick Note** - Editable sticky notes for reminders
  - **🔋 Battery Overview** - Live battery status summary for HA battery-powered devices
  - **⚡ Button** - One-tap action button that calls any Home Assistant service
- Calendar is now provided by live Home Assistant `calendar.*` entity cards instead of a custom widget
- Available in **3 sizes**: Small, Medium, Large
- Some dashboard cards also support an **Extra-Small** `1 × 0.5` size and a new **Tiny** `0.5 × 0.5` micro tile where that compact treatment exists
- Widgets persist across browser sessions
- Full drag-and-drop and delete support
- See [WIDGETS.md](docs/WIDGETS.md) for detailed documentation

#### Sidebar Sections
- **Security** renders live Home Assistant camera entities with power toggle, snapshot refresh, and a settings dialog for camera-specific controls
- **Media** now renders live Home Assistant media players in its own section view
- **Locks** now renders live Home Assistant lock entities in its own section view
- **Tasks** remains a placeholder until that domain is mapped into Navet card/device types

#### Compact Card Presentation
- Many card headers now use an eyebrow-first text layout so small and extra-small cards show type/context before the main title
- Shared compact action-card treatment is now used for the smallest interactive cards, reducing per-feature layout drift in tiny and very compact tiles
- Switch, lock, and scene-style cards now share the same tiny-card visual language when rendered in the smallest footprint

#### Navigation Sections
- **Home** for the main dashboard
- **Security**, **Tasks**, **Locks**, **Lights**, and **Media** as dedicated sections
- **Dashboard Builder** for building the Home screen: add cards from the floating library panel, choose between flow and sectioned layout, manage sections with drag-and-drop, and resize column widths with snap controls in each section header
- **Settings** for appearance, dashboard, config export/import, and onboarding reset
- On mobile, the bottom navigation hides on downward scroll and reappears when you return near the top of the page

## 🏗️ Tech Stack

- **React 18** - UI framework with full ecosystem support
- **TypeScript** - Type safety
- **Zustand** - State management with persistence
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **dnd-kit** - Drag and drop functionality
- **Lucide React** - Icon library
- **Vite** - Development server and build tooling

## 📄 License

Navet source code is licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`).

### What that means
- You can use, modify, and redistribute the code under AGPL-3.0-only.
- If you run a modified version for users over a network, you must make the corresponding source code available under the same license.

### Branding is separate
- The **Navet** name, logo, and brand assets are **not** licensed under AGPL.
- The separate brand policy is about avoiding confusing or misleading use of the Navet identity, not restricting the AGPL code rights.

See:
- [LICENSE.md](LICENSE.md)
- [docs/TERMS_OF_USE.md](docs/TERMS_OF_USE.md)
- [docs/branding/TRADEMARK_POLICY.md](docs/branding/TRADEMARK_POLICY.md)

## 🤝 Contributing

Contributions are welcome. This project is open source under AGPL-3.0-only, with a separate Navet trademark and brand policy.

### Documentation

Complete documentation is available in the [`/docs`](docs/) folder:

- **[Widget System](docs/WIDGETS.md)** - Custom widget documentation
- **[Terms of Use](docs/TERMS_OF_USE.md)** - License and brand usage summary
- **[Attributions](docs/ATTRIBUTIONS.md)** - Credits and acknowledgments
- **[Change History](docs/archive/CHANGES.md)** - Project history and migrations

For technical documentation and developer guides, see [`/docs/README.md`](docs/README.md).

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'feat(scope): add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style
- Use Conventional Commits for every commit message (`type(scope): summary`)
- Maintain the iOS-inspired design aesthetic
- Test on multiple screen sizes
- Update documentation as needed
- Ensure accessibility standards
- Run `pnpm setup:hooks` once so pre-commit checks enforce Biome, a clean TypeScript check with baseline sync, and docs updates for user-facing changes

### Refactor Conventions

When extending feature behavior, keep the current decomposition model:

- Keep controller hooks focused on orchestration; move side-effect synchronization into `use-*-sync` hooks and action/event handlers into `use-*-actions` hooks
- Prefer feature-local helper modules (for example display field derivation, visibility selectors, and interaction wiring) over adding large inline blocks inside controllers
- Reuse exported i18n callback types from the i18n module for translator parameters instead of redefining local `(key: string) => string` signatures
- For store import/apply flows, call store actions rather than invoking direct external `setState` updates

## 🐛 Bug Reports & Feature Requests

Found a bug or have an idea? [Open an issue](https://github.com/awesomestvi/navet/issues)!

## 🗺️ Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for planned features and shipped history.

## 💬 Contact

**GitHub:** [@awesomestvi](https://github.com/awesomestvi/)

**Project Link:** [https://github.com/awesomestvi/navet](https://github.com/awesomestvi/navet)

---

<div align="center">

Made with ❤️ by [awesomestvi](https://github.com/awesomestvi/)

**If you find this project useful, please consider giving it a ⭐️**

</div>
