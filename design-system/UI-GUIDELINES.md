# Navet - UI Guidelines

## Design Philosophy

Our dashboard follows **Apple's iOS widget design principles** with a focus on:
- **Clarity**: Clean, legible interface with purposeful use of space
- **Deference**: Content-first design where UI elements don't compete with information
- **Depth**: Frosted glass morphism creates visual hierarchy and layering
- **Consistency**: Unified patterns across all card types and interactions

---

## Color System

### Background & Base Colors
```css
Primary Background: #0f0f0f (Deep black)
Surface Layer: rgba(255, 255, 255, 0.05) (Frosted glass base)
```

### Entity-Specific Color Palette

#### Lights
- **Active State**: `bg-gradient-to-br from-orange-400 to-amber-500`
- **Icon Background**: `bg-orange-500/20` (Active) / `bg-gray-500/20` (Inactive)
- **Text**: `text-orange-400` (Active) / `text-gray-500` (Inactive)
- **Dynamic Color Matching**: Cards adapt to actual light color when available

#### Climate/HVAC
- **Heating**: `from-orange-500 to-red-500`
- **Cooling**: `from-blue-400 to-cyan-500`
- **Auto**: `from-green-400 to-emerald-500`
- **Off**: `from-gray-600 to-gray-700`
- **Icon Background**: `bg-blue-500/20`

#### Media/Music
- **Primary Accent**: `bg-pink-500` / `text-pink-400`
- **Icon Background**: `bg-pink-500/20`
- **Shadow**: `shadow-pink-500/50`

#### Locks
- **Locked State**: `bg-red-500/20` / `text-red-400`
- **Unlocked State**: `bg-green-500/20` / `text-green-400`

#### Switches
- **Active**: `bg-orange-500/20` / `text-orange-400`
- **Inactive**: `bg-gray-500/20` / `text-gray-500`

#### Sensors
- **Primary**: `bg-blue-500/20` / `text-blue-400`

#### Power/Energy
- **Active**: `bg-green-500/20` / `text-green-400`

#### Weather
- **Primary**: `bg-blue-500/20` / `text-blue-400`
- **Gradient**: `from-blue-400/20 to-purple-500/20`

#### WiFi/Network
- **Active**: `bg-indigo-500/20` / `text-indigo-400`

### Semantic Colors
```css
Success: #10b981 (Green)
Warning: #f59e0b (Amber)
Error: #ef4444 (Red)
Info: #3b82f6 (Blue)

Text Primary: #ffffff (White)
Text Secondary: #9ca3af (Gray-400)
Text Tertiary: #6b7280 (Gray-500)
Text Disabled: #4b5563 (Gray-600)
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

### Type Scale

#### Extra-Small / Small / Medium Cards
- **Title**: `text-xs font-semibold` (12px, 600 weight)
- **Subtitle**: `text-[11px]` to `text-xs` with muted treatment depending on density
- **Body**: `text-[10px]` (10px)
- **Labels**: `text-[9px]` (9px)

#### Large Cards
- **Title**: `text-base font-semibold` (16px, 600 weight)
- **Subtitle**: `text-sm text-gray-400` (14px)
- **Body**: `text-sm` (14px)
- **Labels**: `text-xs` (12px)

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

---

## Spacing System

Based on Tailwind's 4px increment system:

```css
0.5 = 2px   (Micro spacing)
1 = 4px     (Extra tight)
2 = 8px     (Tight)
3 = 12px    (Comfortable)
4 = 16px    (Default)
5 = 20px    (Relaxed)
6 = 24px    (Spacious)
8 = 32px    (Extra spacious)
```

### Card Padding by Size
- **Extra-Small**: `px-3.5 pt-3 pb-4` for dense control layouts
- **Small**: `p-4` (16px)
- **Medium**: `p-5` (20px)
- **Large**: `p-6` (24px)

### Component Spacing
- **Icon to Text**: `gap-2` (8px)
- **Horizontal Controls**: `gap-2` to `gap-4` (8px - 16px)
- **Vertical Stacks**: `gap-3` to `gap-4` (12px - 16px)
- **Section Separation**: `mb-2` to `mb-3` (8px - 12px)

---

## Border Radius

### Hierarchy
```css
Cards: rounded-3xl (24px) - Main container radius
Buttons: rounded-full (9999px) - Circular controls
Small Elements: rounded-lg (8px) - Input fields, toggles
Images: rounded-2xl to rounded-3xl (16px - 24px)
```

---

## Icon System

### Sizing Standards (CRITICAL)

#### Extra-Small Cards
```css
Container: w-7 h-7 (28px × 28px)
Icon: w-3.5 h-3.5 (14px × 14px)
```

#### Small Cards
```css
Container: w-8 h-8 (32px × 32px)
Icon: w-4 h-4 (16px × 16px)
```

#### Medium/Large Cards
```css
Container: w-10 h-10 (40px × 40px)
Icon: w-5 h-5 (20px × 20px)
```

### Icon Library
- **Primary**: Lucide React (lucide-react)
- **Style**: Outline icons for consistency
- **Stroke Width**: Default (2px)

### Common Icons by Entity Type
- **Light**: Lightbulb, Power
- **Climate/HVAC**: Thermometer, Snowflake, Flame, Fan
- **Lock**: Lock, Unlock
- **Switch**: Power, Zap
- **Media**: Music, Play, Pause, SkipForward, SkipBack, Volume2
- **Sensor**: Activity, Droplets, Wind, Gauge
- **Cover**: ChevronUp, ChevronDown
- **Person**: User, UserCircle
- **Weather**: Cloud, Sun, CloudRain
- **WiFi**: Wifi, Signal

### Icon Placement
- **Primary Position**: Leading slot in the card header (top-left in current entity cards)
- **Container**: Circular background with 20% opacity of accent color
- **Alignment**: Flexbox centered (`flex items-center justify-center`)
- **Flex Shrink**: Always set `flex-shrink-0` to prevent icon container collapse

### Compact Card Guidance
- **Extra-Small** cards should keep to one primary inline control row whenever possible
- **Extra-Small lights** keep an unlabeled brightness slider visible
- In **tap toggles** mode, the settings button belongs on the same row as the extra-small light slider, aligned right, with a compact gap between slider and action
- In **tap opens controls** mode, the extra-small light slider should expand to the full row width instead of reserving space for a hidden action button
- Avoid duplicate action buttons across header/body rows in compact layouts

---

## Glass Morphism Effects

### Card Background
```css
backdrop-blur-xl
bg-white/5 to bg-white/10 (5-10% white opacity)
border border-{color}-700/20 (20% opacity colored border)
```

### Layering
```css
Background: Solid #0f0f0f
Card Layer: backdrop-blur-xl + gradient overlay
Content: Fully opaque text and controls
Floating Elements: Additional backdrop-blur-md
```

### Gradient Overlays
```css
Standard: bg-gradient-to-br from-{color}/10 to-transparent
Hover: Slight increase in opacity
Active: More pronounced gradient
```

---

## Interactive States

### Buttons & Controls

#### Default
```css
bg-white/10
hover:bg-white/20
transition-colors duration-200
```

#### Active/Selected
```css
bg-{accent-color}-500
shadow-lg shadow-{accent-color}/50
scale-105 (on interaction)
```

#### Disabled
```css
opacity-50
cursor-not-allowed
pointer-events-none
```

### Cards

#### Default
```css
backdrop-blur-xl
border border-{color}-700/20
transition-all duration-500
```

#### Hover (when clickable)
```css
scale-[1.02]
border-{color}-500/40
```

#### Active
```css
Enhanced gradient overlay
Brighter icon colors
Subtle glow effects
```

---

## Card Size System

### Four-Tier Sizing

#### Extra-Small (col-span-1 row-span-1)
- **Grid Columns**: 1
- **Grid Height**: 87px
- **Use Case**: Dense status or single inline control row
- **Content Strategy**: Header plus one essential control or metric
- **Padding**: `px-3.5 pt-3 pb-4`

#### Small (col-span-1 row-span-2)
- **Grid Columns**: 1
- **Grid Height**: `calc(2 × 87px + gap)` → `182px / 186px / 190px` across `mobile / md / lg+`
- **Use Case**: Standard compact controls
- **Content Strategy**: Header, primary value/slider, compact action row
- **Padding**: `p-4`

#### Medium (col-span-2 row-span-2)
- **Grid Columns**: 2
- **Grid Height**: `calc(2 × 87px + gap)` → `182px / 186px / 190px` across `mobile / md / lg+`
- **Use Case**: Controls with 1-2 adjustable parameters
- **Content Strategy**: Same header density as small, more horizontal space
- **Padding**: `p-5`

#### Large (col-span-2 row-span-4)
- **Grid Columns**: 2
- **Grid Rows**: 4
- **Grid Height**: `calc(4 × 87px + 3 × gap)` → `372px / 384px / 396px` across `mobile / md / lg+`
- **Use Case**: Complex controls with multiple parameters
- **Content Strategy**: Full information and secondary sections
- **Padding**: `p-6`

### Adaptive Layout Rules

1. **Content Rearrangement**: Elements reorganize based on available space
2. **Progressive Disclosure**: Advanced features only appear in larger sizes
3. **No Overflow**: Content never overflows card boundaries
4. **Intelligent Truncation**: Text truncates with ellipsis (`truncate` class)

---

## Animation & Transitions

### Duration Scale
```css
Fast: 150ms - Micro-interactions (sliders, toggles)
Normal: 200-300ms - Button hovers, color changes
Slow: 500ms - State transitions (on/off), mode changes
```

### Easing Functions
```css
Default: ease (cubic-bezier)
Smooth: transition-all
Colors: transition-colors
Transform: transition-transform
```

### Animation Patterns

#### State Changes
```css
transition-all duration-500
Smooth color interpolation
Icon rotation or swap
Gradient shifts
```

#### Hover Effects
```css
transition-colors duration-200
scale-[1.02] (cards)
No scale on small interactive elements
```

#### Loading States
```css
Pulse animation
Skeleton shimmer
Opacity fade-ins
```

---

## Accessibility

### Color Contrast
- **Text on Dark Background**: Minimum 4.5:1 ratio
- **Active States**: 7:1 ratio preferred
- **Icons**: Ensure visibility with background opacity

### Touch Targets
- **Minimum Size**: 44px × 44px (following iOS guidelines)
- **Comfortable Spacing**: 8px minimum between interactive elements
- **Hit Area**: Padding ensures easy tapping

### Focus States
```css
outline-ring/50
ring-2 ring-offset-2
Focus visible on keyboard navigation
```

### Screen Reader Support
- **Semantic HTML**: Proper button, input, and label usage
- **ARIA Labels**: For icon-only controls
- **State Announcements**: For toggle and state changes

---

## Responsive Behavior

### Responsive Breakpoints
```css
Mobile: < 768px
Tablet: 768px - 1279px
Desktop: 1280px - 1699px
Large Desktop: 1700px - 2499px
Ultra-Wide: ≥ 2500px
```

### Mobile Optimizations
- Sidebar hidden; mobile navigation uses the bottom bar
- Dashboard uses a 2-column grid by default
- Touch-friendly 44px minimum hit targets
- Reduced card padding for space efficiency
- Simplified layouts in small cards

### Grid Adaptations
```css
Mobile: grid-cols-2 + gap-2
Tablet (md): grid-cols-4 + gap-3
Desktop (xl): grid-cols-6
Large Desktop (2xl): grid-cols-8
Ultra-Wide (4xl): grid-cols-12
Desktop gap: lg:gap-4
Auto rows: 87px
Small cards: 2 row spans
Medium cards: 2 column spans × 2 row spans
Large cards: 2 column spans × 4 row spans
```

---

## Component Patterns

### Card Header Structure
```tsx
<div className="flex items-start gap-3">
  <div className="w-8 h-8 rounded-full bg-{color}/20 flex items-center justify-center flex-shrink-0">
    <Icon className="w-5 h-5 text-{color}" />
  </div>
  <div className="min-w-0 flex-1">
    <h3 className="font-semibold truncate">{name}</h3>
    <p className="text-xs text-gray-400">{subtitle}</p>
  </div>
</div>
```

### Bottom Action Row
```tsx
<div className="mt-auto flex items-center justify-between gap-3">
  <div className="flex items-center gap-2">
    {/* left-side primary actions, truncate extras into overflow */}
  </div>
  <button>{/* controls/settings opener */}</button>
</div>
```

### Edit Controls
- Remove-entity action lives in the top-left edit slot
- Resize action lives in the top-right edit slot
- Both use the same circular sizing tiers and offsets

### Sliders
```tsx
<div className="relative h-1 bg-white/20 rounded-full">
  <div className="absolute h-full bg-{color} rounded-full" style={{ width: `${value}%` }} />
  <input type="range" className="absolute inset-0 opacity-0 cursor-pointer" />
</div>
```

---

## Performance Guidelines

1. **Memoization**: All cards use `memo()` to prevent unnecessary re-renders
2. **Transitions**: GPU-accelerated properties (transform, opacity)
3. **Images**: Lazy loading with blur-up placeholders
4. **Background Effects**: Backdrop blur optimized with will-change
5. **Event Handlers**: Debounced for rapid interactions (sliders)

---

## Best Practices

### Do's ✅
- Use semantic color meanings consistently
- Maintain icon sizing standards across all cards
- Implement smooth 500ms transitions for state changes
- Ensure all interactive elements have visual feedback
- Test layouts at all three card sizes
- Use flex-shrink-0 on icons to prevent collapse
- Truncate long text with ellipsis
- Implement progressive disclosure for complex controls

### Don'ts ❌
- Don't mix icon sizes within the same card size
- Don't create scrollable content within cards
- Don't use hard-coded colors outside the system
- Don't forget hover states on interactive elements
- Don't stack too many controls in small cards
- Don't use complex animations that hurt performance
- Don't override card padding inconsistently
- Don't place icons in inconsistent positions

---

## Version History
- **v1.0** - Initial design system
- **v1.1** - Standardized icon sizing across all cards
- **v1.2** - Added adaptive layout guidelines
