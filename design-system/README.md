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
- Card size system (extra-small/small/medium/large/hero)
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

## 🎯 Quick Reference

### Core Design Principles
1. **Adaptive Glass Aesthetic** - Premium glass-inspired surfaces, rounded corners, semantic colors
2. **Adaptive Layouts** - Content rearranges intelligently based on card size
3. **Room-Based Organization** - Filter devices by physical location
4. **Consistent Icon Sizing** - Extra-small: 7×7 container / 3.5×3.5 icon, Small: 8×8 / 4×4, Medium/Large: 10×10 / 5×5
5. **Smooth Transitions** - 500ms for state changes, 200ms for interactions
6. **Theme Customization** - Four theme modes (Liquid Glass, Dark, Light, Black) with 8 built-in accents, a custom accent picker, and visual quality tiers
7. **Section-Based Navigation** - Organized into dedicated sections (Home, Security, Tasks, Locks, Lights, Media, Mock, Settings)
8. **Shared Primitives First** - Cross-theme icon pills, nav/action pills, and card off-state surfaces should resolve through shared primitives before feature-level custom styling is added
9. **One Climate Card Pattern** - Climate entities should use the HVAC card pattern; do not reintroduce a parallel legacy climate-card implementation

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

### Navigation Structure
- **Sections**: Home (dashboard), Security, Tasks, Locks, Lights, Media, Mock, Settings
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
- **Extra-Small (1×0.5)**: Dense status or single-control layouts, compact padding and minimal controls
  Light cards keep an unlabeled brightness slider visible here; tap behavior determines whether a compact settings action shares that row or the slider uses the full width.
- **Small (1×1)**: Minimal info, quick toggle, `p-4`, one responsive grid column wide and two auto-rows tall
- **Medium (2×1)**: Primary controls + info, `p-5`, two responsive grid columns wide and two auto-rows tall
- **Large (2×2)**: Full controls + advanced features, `p-6`, two responsive grid columns wide and four auto-rows tall
- **Hero (6×3)**: Full-width feature card for weather, calendars, photo, and RSS; only offered in the Overview zone

Room views use a fixed responsive column grid:
- mobile: `grid-cols-2`
- tablet (`md`): `grid-cols-4`
- desktop (`xl`): `grid-cols-6`
- large desktop (`2xl`): `grid-cols-8`

The Home view zone bands use a CSS custom-property grid driven by `useBreakpointCols`, matching the same breakpoints as room views: `md` → 4 cols, `xl` → 6 cols, `2xl` → 8 cols.

Gaps scale from `gap-2` to `md:gap-3` to `lg:gap-4`, while `auto-rows-[87px]` keeps the card height math stable.

At `lg` and above, that resolves to the familiar desktop card dimensions:
- single-column cards: `190px` wide
- two-column cards: `396px` wide
- small/medium cards: `190px` tall
- large cards: `396px` tall

### Responsive Breakpoints
- **Mobile**: `< 768px` - 2 column grid, hidden sidebar
- **Tablet**: `768px - 1279px` - 4 column grid
- **Desktop**: `1280px - 1535px` - 6 column grid, fixed sidebar
- **Large Desktop**: `≥ 1536px` - 8 column grid, fixed sidebar

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
/src/app/components/shared/             → Shared UI building blocks
/src/app/components/layout/             → Header, sidebar, bottom nav
/src/app/features/dashboard/            → Dashboard layout, routing, and card registry
/src/app/features/settings/             → Settings page and section implementations
/src/app/features/lighting/             → Light cards, presets, and feature-owned stores
/src/app/features/climate/              → HVAC card, settings dialog, and climate-specific styles
/src/app/features/auth/login-page.tsx   → Login interface
/src/app/stores/auth-store.ts           → Authentication state (Zustand)
/src/app/stores/config-store.ts         → HA connection config (Zustand)
/src/app/stores/theme-store.ts          → Theme mode and primary color (Zustand)
/src/app/stores/navigation-store.ts     → Section and room navigation (Zustand)
/src/app/components/layout/user-dropdown.tsx → User account menu in the header
/src/app/components/layout/sidebar.tsx  → Primary desktop sidebar (icon-only, 64px wide)
/src/app/hooks/use-theme.ts             → Theme hook (wraps theme store)
/src/app/hooks/use-navigation.ts        → Navigation hook (wraps navigation store)
/src/app/stores/selectors.ts            → Optimized per-field selectors for all stores
/src/styles/theme.css                   → Design tokens and variables
```

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

**Last Updated:** March 23, 2026
