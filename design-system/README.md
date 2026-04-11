# Navet - Design System

Complete design documentation for the iOS-inspired smart home dashboard.

## 📚 Documentation Structure

### [UI Guidelines](./UI-GUIDELINES.md)
Comprehensive design system covering:
- Color palette and semantic meanings
- Typography scale and hierarchy
- Spacing and layout system
- Icon sizing standards
- Glass morphism effects
- Interactive states and animations
- Card size system (tiny/extra-small/small/medium/medium-vertical/large/extra-large)
- Accessibility guidelines
- Component patterns
- Best practices

### [Layout Structure](./LAYOUT-STRUCTURE.md)
Complete layout architecture including:
- Application hierarchy
- Sidebar, header, and navigation layouts
- Responsive grid system
- Z-index management
- Scroll behavior
- Sticky positioning
- Room-based filtering
- Edit mode overlay
- Performance optimizations

### [Moodboard](./MOODBOARD.md)
Design inspiration and visual direction:
- Core design references (iOS widgets, Apple HomeKit)
- Color psychology
- Typography inspiration
- Material and texture guidelines
- Motion and animation principles
- Imagery treatment
- Interaction patterns
- Brand personality
- Design evolution roadmap

### [Features Documentation](./FEATURES.md)
Complete feature implementation guide:
- Authentication system and login flow
- Theme customization (4 modes, built-in accents, custom accent color, and visual quality tiers)
- Navigation and section management
- Settings page architecture
- Empty states for sections
- User management and profiles
- Responsive behavior patterns
- Technical implementation details

### [Storybook Foundation](./STORYBOOK_FOUNDATION.md)
Internal UI-system foundation covering:
- the `src/app/components/system/` entrypoint structure
- which primitives, patterns, and tokens are stable enough to document
- how Storybook is wired in-repo without forcing a package workspace
- when a monorepo or package split would actually be justified

### First-Layer Foundations
- `src/app/components/system/tokens/foundations.ts` is the shared source for spacing, sizing, typography roles, radii, icon sizing, focus treatment, and shared semantic status tones.
- Storybook reviews these foundations through focused pages in the `Theme/*` section (for radii, colors, fonts, spacing, stroke widths, and typography) before primitive APIs are expanded.

## 🎯 Quick Reference

### Core Design Principles
1. **Adaptive Glass Aesthetic** - Premium glass-inspired surfaces, rounded corners, semantic colors
2. **Adaptive Layouts** - Content rearranges intelligently based on card size
3. **Room-Based Organization** - Filter devices by physical location
4. **Consistent Icon Sizing** - Extra-Small: 7×7 (28px container) / 3.5×3.5 (14px icon), Small: 8×8 (32px) / 4×4 (16px), Medium/Large: 10×10 (40px) / 5×5 (20px)
5. **Smooth Transitions** - 500ms for state changes, 200ms for interactions
6. **Theme Customization** - Four theme modes (Liquid Glass, Dark, Light, Black) with 8 built-in accents, a custom accent picker, and visual quality tiers
7. **Section-Based Navigation** - Organized into dedicated sections (Home, Energy, Security, Tasks, Locks, Lights, Media, Settings)
8. **Shared Primitives First** - Cross-theme icon pills, nav/action pills, and card off-state surfaces should resolve through shared primitives before feature-level custom styling is added
9. **One Climate Card Pattern** - Climate entities should use the HVAC card pattern; do not reintroduce a parallel legacy climate-card implementation
10. **Composable Controller Layers** - Keep feature controllers as orchestration shells and extract sync/action/display responsibilities into dedicated helper hooks
11. **Shared i18n Function Types** - Use exported i18n function types for translator dependencies across hooks/components instead of redefining local translator signatures
12. **Shared Compact Card Layouts** - Tiny and other dense card variants should use shared title/action primitives rather than bespoke per-feature micro layouts
13. **System Entry Points** - Promote stable shared UI through `src/app/components/system/{primitives,patterns,tokens}` before creating new package boundaries
14. **Workshop Before Extraction** - New shared UI should prove itself in Storybook and the in-repo system layer before it is treated like a publishable package boundary
15. **Card Dialog Pattern First** - New entity settings dialogs should compose from shared card-dialog patterns (`CardDialogHeader`, sections, tab triggers, choice pills) before creating feature-specific shells
16. **Room Override Safety** - Entity room updates should preserve local override fallback behavior so UI room assignment remains stable when HA registry updates are delayed

### Authentication System
- **Login Page** - Secure authentication with Home Assistant URL and long-lived access token
- **User Dropdown** - Header displays user info with avatar and quick logout access
- **Persistent Session** - Auth state persists across browser sessions

### Theme System
- **Theme Modes**:
  - Liquid Glass - Frosted layered panels with brighter rim light, thicker depth, and quality-aware blur
  - Dark - Subtle gradients with muted colors
  - Light - Bright pastels with soft accents
  - Black - Deep black surfaces with OLED-friendly contrast
- **Effects Quality**: High keeps the richest live glass treatment, Medium uses simulated glass, and Low reduces effects for constrained devices
- **Primary Colors**: Orange (default), Blue, Green, Purple, Pink, Red, Yellow, Teal, or a custom accent color
- **Dynamic Theming** - All active states, buttons, and indicators adapt to selected primary color
- **Accent Card Shell Tokens** - Shared accent-shell gradients, glow layers, and overlays now document their glass, dark, light, and black variants in Storybook, including readable-text behavior for tinted dark surfaces

### Navigation Structure
- **Sections**: Home (dashboard), Energy, Security, Tasks, Locks, Lights, Media, Settings
- **Desktop**: Fixed vertical sidebar on left (16px wide)
- **Mobile**: Compact iOS-style bottom navigation bar with icon + label tabs for 6 key sections
- **Mobile Scroll Behavior**: Bottom navigation hides on downward scroll and returns near the top of the document
- **Mobile Header**: Greeting, search, notifications, and avatar share one compact top row
- **Empty States**: Beautiful placeholder screens for sections without data

### Color System at a Glance
- **Background (Dark)**: `#0a0a0a` (Deep black)
- **Background (Light)**: `#f9fafb` (Gray-50)
- **Glass Cards**: shared surfaces adapt by effects quality, with stronger frost and edge highlights at high quality instead of relying on one flat blur treatment everywhere
- **Primary Color** (customizable): Orange (default), Blue, Green, Purple, Pink, Red, Yellow, Teal, or a custom accent
- **Lights**: Orange/Amber when active (or custom primary color)
- **Climate**: Blue (cooling) / Orange (heating) / Green (auto)
- **Media**: Pink accent
- **Media Cards**: Full-bleed artwork layouts with shared round transport controls, theme-aware inactive treatment, and proxy-safe artwork rendering/palette extraction
- **Locks**: Red (locked) / Green (unlocked)
- **Borders**: `border-{color}-700/20` (20% opacity) or `border-gray-200` (light theme)

### Card Sizes

All seven sizes are defined in `src/app/components/shared/card-size.ts` and their metadata (label, description, `cols`, `rows`) lives in `src/app/components/shared/card-size-selector.tsx` as the single source of truth. Visual previews and drag-overlay dimensions are derived from `cols × rows` rather than hardcoded pixels.

- **Tiny (0.5×0.5)**: Micro action/status tile for ultra-dense dashboards; intended for highly compressed interactive cards such as compact switch, lock, or scene-style layouts using the shared tiny-action-card primitive
- **Extra-Small (1×0.5)**: Dense status or single-control layouts, compact padding and minimal controls. Light cards keep an unlabeled brightness slider visible here; tap behavior determines whether a compact settings action shares that row or the slider uses the full width.
- **Small (1×1)**: Minimal info, quick toggle, `p-5`, one responsive grid column wide and two auto-rows tall
- **Medium (2×1)**: Primary controls + info, `p-5`, two responsive grid columns wide and two auto-rows tall
- **Medium-Vertical (1×2)**: Tall single-column layout, `p-5`, one responsive grid column wide and four auto-rows tall; used by media cards for artwork-led portrait layouts
- **Large (2×2)**: Full controls + advanced features, `p-6`, two responsive grid columns wide and four auto-rows tall
- **Extra-Large (3×2)**: Full-width feature card for weather, calendars, photo, and RSS; three responsive grid columns wide and four auto-rows tall; only offered in the Overview zone

Room views use a fixed responsive column grid:
- mobile: `grid-cols-2`
- tablet (`md`): `grid-cols-4`
- desktop (`xl`): `grid-cols-6`
- large desktop (`2xl`): `grid-cols-8`
- ultra-wide (`4xl`): `grid-cols-12`

The Home view zone bands use a CSS custom-property grid driven by `useBreakpointCols`, matching the same breakpoints as room views: `md` → 4 cols, `xl` → 6 cols, `2xl` → 8 cols, `4xl` → 12 cols.

Gaps scale from `gap-2` to `md:gap-3` to `lg:gap-4`, while `auto-rows-[87px]` keeps the card height math stable.

At `lg` and above, that resolves to the familiar desktop card dimensions:
- single-column cards: `190px` wide
- two-column cards: `396px` wide
- small/medium cards: `190px` tall
- large cards: `396px` tall

### Responsive Breakpoints
- **Mobile**: `< 768px` - 2 column grid, hidden sidebar
- **Tablet**: `768px - 1279px` - 4 column grid
- **Desktop**: `1280px - 1699px` - 6 column grid, fixed sidebar
- **Large Desktop**: `1700px - 2499px` - 8 column grid, fixed sidebar
- **Ultra-Wide**: `≥ 2500px` - 12 column grid, fixed sidebar

## 🛠 For Developers

### Implementation Checklist
When creating a new card component:

- [ ] Import icons from `lucide-react`
- [ ] Use `memo()` for performance
- [ ] Accept `size: CardSize` prop
- [ ] Implement all supported size layouts, including `extra-small` when the feature needs a dense mode
- [ ] Place the primary entity icon in the card header with consistent sizing
- [ ] Use `truncate` class for text overflow
- [ ] Add `flex-shrink-0` to icon containers
- [ ] Implement 500ms transitions for state changes
- [ ] Use semantic colors from the color system
- [ ] Test at all breakpoints
- [ ] Ensure 44px minimum touch targets
- [ ] Add edit mode size selector support
- [ ] Use the shared header pattern: icon top-left, title, then subtitle
- [ ] Use the shared bottom action-row pattern when the card exposes left actions plus a controls/settings opener
- [ ] Reuse shared theme primitives such as entity icon pills, interactive pills, round control buttons, and card-state surface tokens before introducing new theme branches in feature code

### Key Files
```
/\.storybook/                                      → Storybook configuration and preview decorators for the in-repo UI workshop
/src/app/components/shared/                          → Shared UI building blocks
/src/app/components/primitives/                      → Source-of-truth low-level shared UI primitives
/src/app/components/primitives/link.tsx              → Shared inline link primitive for contextual external/internal references
/src/app/components/patterns/                        → Source-of-truth composed shared UI patterns
/src/app/components/patterns/card-dialog.tsx         → Shared settings-dialog header/section/tab/choice patterns
/src/app/components/system/                          → Storybook-ready system entrypoints for shared primitives, patterns, and tokens
/src/app/components/system/primitives/index.ts       → Stable low-level component exports
/src/app/components/system/patterns/index.ts         → Stable composed-pattern exports
/src/app/components/system/tokens/index.ts           → Shared theme/style token exports
/src/app/components/system/tokens/foundations.ts     → First-layer spacing, sizing, type, radius, icon, and focus tokens
/src/app/components/shared/card-size.ts              → CardSize union type (single source of truth)
/src/app/components/shared/card-size-selector.tsx    → Size registry (metadata, helpers, overlay classes, selector UI)
/src/app/components/primitives/entity-card-title-block.tsx → Shared title/subtitle ordering for card headers
/src/app/components/patterns/tiny-action-card.tsx    → Shared compact action-card shell for tiny tiles
/src/app/components/layout/                          → Header, sidebar, bottom nav
/src/app/components/layout/use-header-controller.ts  → Header orchestration hook (greeting, search, date/time, user identity)
/src/app/components/layout/header-actions.tsx        → HeaderMobileActions / HeaderDesktopActions split components
/src/app/components/layout/header-search-input.tsx   → Stateless search input primitive
/src/app/features/dashboard/                         → Dashboard layout, routing, and card registry
/src/app/features/dashboard/components/dashboard-arrival-reveal.view.tsx → Arrival animation view
/src/app/features/dashboard/components/dashboard-onboarding-dialog/ → Multi-step first-run wizard
/src/app/features/dashboard/components/home-dashboard-overview-card-grid.tsx → CardGrid with auto-scaling
/src/app/features/dashboard/components/home-dashboard-overview-sections.tsx → Section canvas and presentation views
/src/app/features/media/components/media/            → Media dialog (content, sections, controller, types)
/src/app/features/settings/                          → Settings page and section implementations
/src/app/features/settings/components/settings-appearance-content.tsx → Appearance setting item components
/src/app/features/lighting/             → Light cards, presets, and feature-owned stores
/src/app/features/lighting/components/light-card/use-light-runtime-state.ts → Light runtime sync orchestration
/src/app/features/lighting/components/light-card/build-light-card-controller-state.ts → Light controller output shaping
/src/app/features/climate/              → HVAC card, settings dialog, and climate-specific styles
/src/app/features/lighting/components/switch-settings-dialog.tsx → Shared switch settings dialog with controls/metrics/customization tabs
/src/app/features/climate/components/hvac-card/use-hvac-entity-sync.ts → HVAC live entity synchronization
/src/app/features/auth/login-page.tsx   → Login interface
/src/app/features/media/components/media-card/use-media-display-fields.ts → Media metadata display derivation
/src/app/features/dashboard/hooks/use-dashboard-devices-loaded.ts → Dashboard connection-hydration sync
/src/app/features/dashboard/hooks/use-dashboard-entity-visibility.ts → Dashboard entity visibility selectors
/src/app/stores/auth-store.ts           → Authentication state (Zustand)
/src/app/stores/config-store.ts         → HA connection config (Zustand)
/src/app/stores/theme-store.ts          → Theme mode and primary color (Zustand)
/src/app/stores/navigation-store.ts     → Section and room navigation (Zustand)
/src/app/constants/storage-keys.ts      → Persisted key contracts including entity room overrides and switch dialog appearance keys
/src/app/components/layout/user-dropdown.tsx → User account menu in the header
/src/app/components/layout/sidebar.tsx  → Primary desktop sidebar (icon-only, 64px wide)
/src/app/hooks/use-theme.ts             → Theme hook (wraps theme store)
/src/app/hooks/use-navigation.ts        → Navigation hook (wraps navigation store)
/src/app/stores/selectors.ts            → Optimized per-field selectors for all stores
/src/styles/theme.css                   → Design tokens and variables
```

### Storybook Workflow

- Run `pnpm storybook` to develop UI in isolation on Storybook's local dev server
- Run `pnpm storybook:build` to validate the static Storybook bundle
- Run `pnpm check:stories` to validate Storybook title conventions, primitive/pattern story coverage, and colocated story ownership
- Co-locate stories with the component or feature they document; keep overview/catalog stories with the owning feature
- Use the global Storybook toolbar to test built-in themes and accent colors
- The Storybook manager UI, docs pages, and canvas default to dark mode so glass/dark presentation is the baseline workshop context
- Token stories should explicitly verify light-theme readability, black-theme parity, and whether tinted dark surfaces use shared readable-text tokens

### Current Storybook Taxonomy

- `Concepts/` — workshop overviews and high-level entrypoints
- `Theme/` — token, surface, typography, and appearance documentation
- `Components/Primitives/` — low-level reusable UI pieces, including dialog/menu/avatar/label/toast wrappers and grouped card/header primitives under `Components/Primitives/Cards/`
- `Components/Patterns/` — composed shared UI sections and layouts
- `Components/Shared/` — app-specific shared controls that are reused across features
- `App Shell/Header/`, `App Shell/Navigation/`, `App Shell/Notifications/`, `App Shell/Sections/` — topbar, search, sidebar, room navigation, notifications, and section customization
- `Cards/Overview/`, `Cards/Entity/`, `Cards/Custom/` — dashboard catalog/matrices, HA entity cards, and custom/widget cards
- `Pages/Dashboard/` — add-card, edit-mode, hero, and onboarding flows
- `Pages/Energy/Charts/`, `Pages/Energy/Primitives/`, `Pages/Energy/Widgets/` — energy feature visuals and shells
- `Pages/Settings/` — reusable settings shells and real settings sections

## 🎨 For Designers

### Design Tools Integration
Use these values in your design tools (Figma, Sketch, etc.):

**Spacing Scale** (4px base): 4, 8, 12, 16, 20, 24, 32
**Border Radius**: 8px, 16px, 24px, full circle
**Grid Columns**: 2 (mobile), 4 (tablet), 6 (desktop), 8 (large desktop)
**Grid Gap**: 8px (mobile), 12px (`md`), 16px (`lg+`)

### When to Use Each Card Size
- **Small**: Binary states (on/off, locked/unlocked), simple status displays
- **Medium**: Single adjustable parameter (brightness, temperature, volume)
- **Large**: Multiple parameters, complex controls, detailed status

## 🛠 Section Status

| Section | Status |
|---|---|
| Home | Live — dashboard builder with flow/sectioned layouts, section resize |
| Security | Live — camera cards via HA `camera.*` entities |
| Lights | Live — `AllViewGrid` with all light entities |
| Media | Live — HA `media_player.*` entity cards |
| Locks | Live — HA `lock.*` entity cards |
| Tasks | Placeholder — not yet mapped to Navet card types |
| Settings | Live |

---

**Last Updated:** April 8, 2026
