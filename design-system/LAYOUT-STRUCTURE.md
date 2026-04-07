# Navet - Layout Structure

## Application Architecture

### Overall Layout Hierarchy
```
App Container
├── Sidebar (Desktop only)
│   └── Navigation Menu
├── Main Content Area
    ├── Header
    │   ├── Greeting
    │   ├── Search Devices
    │   └── User / notifications
    ├── Room Navigation Tabs
    │   └── Customize / Done Editing + Add / View dropdowns
    └── Device Grid (Main Content)
        └── Dynamic Card Grid / empty-state recovery actions
```

---

## Layout Dimensions

### Container Widths
```css
Sidebar: 4rem (64px) - Fixed width on desktop
Main Content: calc(100vw - 4rem) - Desktop
Main Content: 100vw - Mobile (sidebar hidden)
```

### Content Padding
```css
Mobile: px-4 (16px horizontal)
Desktop: px-6 to px-8 (24px - 32px horizontal)
Vertical: py-6 (24px)
```

---

## Sidebar Layout

### Structure
```tsx
<aside className="fixed left-0 top-0 h-full w-16 ...">
  {/* Logo at top */}
  <div className="...">
    <NavetLogo />
  </div>

  {/* Icon-only navigation stack */}
  <nav className="...">
    {/* Each item: icon button with tooltip, no visible label */}
  </nav>

  {/* Settings / user icon at bottom */}
  <div className="absolute bottom-0 w-full ...">
    {/* Settings icon */}
  </div>
</aside>
```

### Responsive Behavior
- **Desktop (≥ 1280px)**: Always visible, fixed position
- **Tablet (768px - 1279px)**: Visible, fixed position
- **Mobile (< 768px)**: Hidden, accessible via hamburger menu

### Navigation Item Pattern

Icon-only — no visible text labels in the sidebar. Each item is a square button centered in the
64px column. Active state uses the primary color at 20% opacity.

```tsx
<button className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors">
  <Icon className="w-5 h-5" />
</button>
```

---

## Header Layout

### Desktop Structure
```tsx
<header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-gray-800">
  <div className="flex items-center justify-between px-6 py-4">
    {/* Left: Title */}
    <h1 className="text-2xl font-bold">Dashboard</h1>
    
    {/* Center: Search Devices */}
    <div className="flex-1 max-w-md mx-8">
      <SearchInput />
    </div>
    
    {/* Right: User and notifications */}
    <div className="flex items-center gap-4">
      <HeaderActions />
    </div>
  </div>
</header>
```

### Mobile Structure
```tsx
<header className="sticky top-0 z-40">
  <div className="flex items-center justify-between px-4 py-3">
    {/* Left: Menu Toggle */}
    <button className="w-10 h-10">
      <MenuIcon />
    </button>
    
    {/* Center: Title */}
    <h1 className="text-lg font-bold">Dashboard</h1>
    
    {/* Right: User/actions */}
    <button className="w-10 h-10">
      <HeaderActionsIcon />
    </button>
  </div>
  
  {/* Search bar moves below on mobile */}
  <div className="px-4 pb-3">
    <SearchInput />
  </div>
</header>
```

### Header Height
```css
Desktop: 72px (excluding border)
Mobile: 56px title + 48px search = 104px total
```

---

## Room Navigation

### Layout Pattern
```tsx
<nav className="sticky top-[72px] z-30 backdrop-blur-xl bg-black/60 border-b border-gray-800">
  <div className="px-6 py-4">
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {rooms.map(room => (
        <button className={`px-6 py-2 rounded-full whitespace-nowrap ${active ? 'bg-blue-500' : 'bg-white/10'}`}>
          {room}
        </button>
      ))}
    </div>
  </div>
</nav>
```

### Responsive Behavior
- **Horizontal Scroll**: On all screen sizes when tabs overflow
- **Snap Scroll**: Optional for mobile (`scroll-snap-type: x mandatory`)
- **No Wrapping**: Single row with overflow
- **Active Indicator**: Solid background vs transparent

### Tab Sizing
```css
Padding: px-6 py-2 (24px × 8px)
Min Width: fit-content
Height: 36px
Gap: 8px between tabs
```

In edit mode, the top action row uses **Done Editing** plus **Add** and **View** dropdowns instead of separate inline add buttons.

---

## Device Grid System

### Grid Configuration

#### Breakpoint Progression
```css
grid-template-columns: repeat(2, minmax(0, 1fr))
grid-auto-rows: 87px
gap: 8px

@media (min-width: 768px) {
  grid-template-columns: repeat(4, minmax(0, 1fr))
  gap: 12px
}

@media (min-width: 1024px) {
  gap: 16px
}

@media (min-width: 1280px) {
  grid-template-columns: repeat(6, minmax(0, 1fr))
}

@media (min-width: 1700px) {
  grid-template-columns: repeat(8, minmax(0, 1fr))
}

@media (min-width: 2500px) {
  grid-template-columns: repeat(12, minmax(0, 1fr))
}
```

### Grid Structure
```tsx
<div className="grid w-full grid-flow-row-dense grid-cols-2 gap-2 auto-rows-[87px] md:grid-cols-4 md:gap-3 xl:grid-cols-6 lg:gap-4 2xl:grid-cols-8">
  {/* Cards with dynamic col-span */}
  <div className="col-span-1 row-span-1"> {/* Tiny card */}
  <div className="col-span-2 row-span-1"> {/* Extra-small card */}
  <div className="col-span-2 row-span-2"> {/* Small card */}
  <div className="col-span-4 row-span-2"> {/* Medium card */}
  <div className="col-span-4 row-span-4"> {/* Large card */}
</div>
```

---

## Card Grid Patterns

### Span Classes by Card Size

```typescript
// From card-size-selector.tsx
export function getCardSpanClass(size: CardSize): string {
  switch (size) {
    case 'tiny':
      return 'col-span-1 row-span-1';
    case 'extra-small':
      return 'col-span-2 row-span-1'; // 1 logical column × 0.5 row
    case 'small':
      return 'col-span-2 row-span-2'; // 1 logical column × 1 row
    case 'medium':
      return 'col-span-4 row-span-2'; // 2 logical columns × 1 row
    case 'medium-vertical':
      return 'col-span-2 row-span-4'; // 1 logical column × 2 rows
    case 'large':
      return 'col-span-4 row-span-4'; // 2 logical columns × 2 rows
    case 'extra-large':
      return 'col-span-6 row-span-4'; // 3 logical columns × 2 rows
    default:
      return 'col-span-2 row-span-2';
  }
}
```

### Current Dashboard Grid
```css
grid-template-columns: repeat(2, minmax(0, 1fr));
grid-auto-rows: 87px;
gap: 8px;

@media (min-width: 768px) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (min-width: 1024px) {
  gap: 16px;
}

@media (min-width: 1280px) {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

@media (min-width: 1700px) {
  grid-template-columns: repeat(8, minmax(0, 1fr));
}
```

### Card Dimensions

#### Extra-Small Card
```css
Width: 1 responsive grid column
Height: 87px
Typical Use: Dense status or one inline control row
```

#### Small Card
```css
Width: 1 responsive grid column
Height: calc(2 × 87px + responsive gap)
Height at breakpoints:
  mobile: 182px
  md: 186px
  lg+: 190px
Typical Use: Standard compact controls
```

#### Medium Card
```css
Width: 2 responsive grid columns + 1 gap
Width at breakpoints:
  mobile: spans 2 of the 2 available columns
  md+: spans 2 responsive grid columns + 1 gap
  lg+: 396px on the desktop grid
Height: calc(2 × 87px + responsive gap)
Height at breakpoints:
  mobile: 182px
  md: 186px
  lg+: 190px
Typical Use: Primary controls plus supporting details
```

#### Large Card
```css
Width: 2 responsive grid columns + 1 gap
Height: calc(4 × 87px + 3 × responsive gap)
Height at breakpoints:
  mobile: 372px
  md: 384px
  lg+: 396px
Typical Use: Full feature layout with secondary sections
```

---

## Z-Index Hierarchy

```css
z-0: Base layer (default)
z-10: Card hover states
z-20: Floating elements (tooltips)
z-30: Room navigation (sticky)
z-40: Header (sticky)
z-50: Modals and dialogs (Radix Dialog Portal)
z-60: Toasts and notifications
z-[100]: Edit mode overlay
```

---

## Scroll Behavior

### Main Content Area
```css
overflow-y: auto
scroll-behavior: smooth
height: calc(100vh - header - room-nav)
```

### Room Navigation
```css
overflow-x: auto
scrollbar-hide (custom utility)
-webkit-overflow-scrolling: touch (iOS momentum)
```

### Sidebar
```css
overflow-y: auto (for long navigation lists)
scrollbar-hide
```

---

## Sticky Positioning

### Header
```css
position: sticky
top: 0
z-index: 40
backdrop-blur-xl
```

### Room Navigation
```css
position: sticky
top: 72px (height of header)
z-index: 30
backdrop-blur-xl
```

### Edit Mode Controls
```css
position: absolute
top-left: remove entity
top-right: resize
z-index: above card content
```

---

## Content Organization Patterns

### Entity Type Grouping
Cards are rendered in this order:
1. Lights
2. Climate/HVAC
3. Media
4. Weather
5. Power
6. WiFi
7. Switches
8. Covers
9. Locks
10. Persons
11. Sensors

### Room-Based Filtering
```typescript
const filteredLights = devices.lights.filter(light => light.room === activeRoom);
// Applied to all entity types
```

### "All Rooms" View
- Shows all entities from all rooms
- Useful for global overview
- Can become dense on large setups

---

## Responsive Layout Strategy

### Breakpoint Strategy

#### Mobile First Approach
1. Design for smallest screen first
2. Add complexity as viewport grows
3. Use Tailwind's responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`

### Key Responsive Changes

#### Mobile (< 768px)
- Sidebar hidden completely
- Fixed-width tracks wrap as space allows
- Reduced padding (p-4)
- Compact header
- Search bar below title
- Smaller card padding (p-4)

#### Tablet (768px - 1279px)
- Sidebar visible, bottom navigation hidden
- Fixed-width tracks continue to wrap
- Medium padding (p-5)
- Standard header
- Search inline

#### Desktop (≥ 1280px)
- Sidebar always visible
- Fixed-width tracks wrap across available width
- Generous padding (p-6)
- Full header with all features
- Optimal card spacing

---

## Layout Performance Optimization

### CSS Grid Benefits
1. **Automatic Flow**: Browser handles card placement
2. **Responsive**: Deterministic column counts across Tailwind breakpoints
3. **Gap Property**: Clean spacing without margin calculations
4. **Breakpoint-controlled**: Exact 2 / 4 / 6 / 8 column progression

### Sticky Position Benefits
1. **No JavaScript**: Pure CSS solution
2. **Smooth Scrolling**: Native browser optimization
3. **Z-Index Control**: Predictable layering

### Backdrop Blur Optimization
```css
will-change: backdrop-filter (on animated elements)
Use sparingly - GPU intensive
Consider disabling on low-end devices
```

---

## Edit Mode Layout

### Edit Mode Indicators
- Size selector visible in the top-right card slot
- Remove-entity action visible in the top-left card slot for dashboard entities
- Slight border glow on hover
- Cursor changes to indicate interactivity
- No functional controls disabled

---

## Empty States

### No Devices in Room
```tsx
<div className="col-span-full flex items-center justify-center py-16">
  <div className="text-center">
    <p className="text-gray-400">No devices in this room</p>
  </div>
</div>
```

### No Search Results
```tsx
<div className="col-span-full">
  <p className="text-gray-400 text-center">No devices match your search</p>
</div>
```

---

## Layout Best Practices

### Grid Guidelines
1. Maintain consistent gap between cards
2. Allow grid auto-flow to handle placement
3. Use explicit row-span only for large cards
4. Test layouts at all breakpoints

### Sticky Element Guidelines
1. Always set z-index hierarchy
2. Include backdrop-blur for visual separation
3. Ensure proper stacking context
4. Test scroll performance

### Responsive Guidelines
1. Mobile-first design approach
2. Progressive enhancement for larger screens
3. Test touch targets on mobile (44px minimum)
4. Ensure horizontal scroll on room navigation

### Performance Guidelines
1. Minimize use of backdrop-blur (GPU intensive)
2. Use CSS Grid native capabilities
3. Avoid layout thrashing with batch DOM updates
4. Implement virtual scrolling for 100+ cards (future)

---

## Future Layout Considerations

### Potential Enhancements
1. **Custom Layouts**: Save different layout configurations
2. **Multi-Room View**: Grid view of multiple rooms simultaneously
3. **Compact Mode**: Higher density layout option
4. **Dashboard Templates**: Pre-configured layouts for common setups

> Note: Drag & drop reordering of cards and rooms is already implemented via `@dnd-kit`.

### Scalability
- Support for 100+ devices per room
- Virtual scrolling for performance
- Lazy loading off-screen cards
- Pagination or infinite scroll options
