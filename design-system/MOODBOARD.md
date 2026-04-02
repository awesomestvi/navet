# Navet - Design Moodboard

## Design Vision

**A premium, iOS-inspired smart home interface that feels like controlling your entire home through elegant Apple widgets.**

---

## Core Design References

### Primary Inspiration: iOS Widgets

#### iOS 14+ Widget Design Language
- **Glassmorphism**: Translucent backgrounds with blur effects
- **Depth & Layering**: Clear visual hierarchy through shadows and overlays
- **Rounded Corners**: Generous 24px (rounded-3xl) for softness
- **Color Semantics**: Purposeful use of color to indicate state and function
- **Typography**: San Francisco-inspired clean sans-serif
- **Information Density**: Right amount of info without overwhelming

**Reference Examples:**
- Weather widget: Clean text hierarchy, subtle gradients
- Music widget: Album art bleeding into background with blur
- Home widget: Device controls with clear on/off states
- Battery widget: Ring progress indicators
- Calendar widget: Efficient use of space with clear typography

### Secondary Inspiration: Apple HomeKit Interface

#### HomeKit Design Patterns
- **Adaptive Cards**: Different sizes for different device types
- **Color-Coded States**: Lights show their actual color, thermostats show temp with gradient
- **Quick Actions**: Tap for the primary card action, with editing kept behind an explicit dashboard customize flow
- **Room Organization**: Spatial grouping by physical location
- **Frosted Glass**: Backgrounds that let content shine through

---

## Visual Mood & Atmosphere

### Overall Aesthetic
- **Sophisticated Dark**: Deep blacks (#0f0f0f), not gray
- **Atmospheric Glow**: Subtle color glows around active elements
- **Premium Feel**: High-end, luxury smart home experience
- **Calm & Controlled**: Not overwhelming despite many devices
- **Tactile**: Feels touchable and responsive

### Emotional Tone
- **Confidence**: User feels in control
- **Elegance**: Beautiful enough to show off
- **Efficiency**: Information at a glance
- **Modernity**: Cutting-edge technology
- **Warmth**: Technology that feels inviting, not cold

---

## Color Psychology & Application

### Background Palette
```
Dark Theme (Default):
Deep Space Black: #0a0a0a
- Creates drama and makes colors pop
- Reduces eye strain in dark environments
- Premium, cinema-like quality

Light Theme:
Soft Gray: #f9fafb (gray-50)
- Clean, bright appearance
- Reduces glare in bright environments
- Professional, accessible

Black Theme:
Deep Black: #030712 (gray-950)
- Maximum contrast for visibility
- Enhanced accessibility
- Bold, vibrant color accents

Frosted Glass Overlays: rgba(255, 255, 255, 0.05-0.10)
- Subtle layering
- Lets background show through
- Apple-like sophistication
```

### Accent Color Strategy

**Primary Color System** (User Customizable)
The dashboard features a customizable primary color that affects all active states, buttons, and indicators:

- **Orange** (Default): Warm, home-like, energetic
- **Blue**: Technology, trust, calm
- **Green**: Nature, eco-friendly, success
- **Purple**: Premium, creative, sophisticated
- **Pink**: Playful, modern, media-focused
- **Red**: Bold, urgent, attention-grabbing
- **Yellow**: Bright, cheerful, energetic
- **Teal**: Fresh, balanced, modern

#### Warm Tones (Energy, Activity)
- **Orange/Amber**: Lights, warmth, home feeling
- **Yellow**: Sunlight, energy, attention
- **Red**: Heating, alerts, important states

#### Cool Tones (Technology, Calm)
- **Blue**: Technology, cooling, water, information
- **Cyan**: Freshness, air, connectivity
- **Purple**: Media, entertainment, premium features

#### Functional Tones
- **Green**: Success, unlocked, on, eco-friendly
- **Red/Pink**: Locked, heating, alerts, media
- **Gray**: Inactive, disabled, neutral state

---

## Typography Hierarchy

### Inspiration: SF Pro (San Francisco)
Apple's system font principles:
- **Dynamic Type**: Adjusts to available space
- **Consistent Weights**: Clear hierarchy without being heavy
- **Optical Sizes**: Larger text slightly lighter weight
- **Generous Spacing**: Breathing room for readability

### Our Implementation
```
Display Text (Titles): Semibold, larger tracking
Body Text: Regular weight, comfortable line height
Labels: Smaller, slightly increased tracking
Numbers: Tabular figures for alignment
```

---

## Material & Texture

### Glass Morphism
**Inspiration**: iOS 15+ widgets, macOS Big Sur

**Properties:**
- Backdrop blur: 20-40px (xl)
- Background opacity: 5-10% white
- Border: 20% opacity of accent color
- Subtle inner glow on active states

**Effect**: 
- Content appears to float above dark background
- Layering creates sense of depth
- Subtle transparency shows what's behind

### Gradients
**Inspiration**: iOS dynamic color backgrounds

**Patterns:**
1. **Diagonal Gradients**: `from-{color}-400/20 to-transparent` (top-left to bottom-right)
2. **Radial Glows**: Centered on important elements (active states)
3. **Color Matching**: Light cards adopt actual light color
4. **State Gradients**: Climate cards show heating (orange→red) vs cooling (blue→cyan)

---

## Iconography Style

### Lucide React Icons
**Why this library:**
- **Consistent Style**: All outline-based, same stroke width
- **Modern**: Clean, minimal, contemporary
- **Flexible**: Easy to color and size
- **Apple-like**: Similar to SF Symbols aesthetic

### Icon Treatment
- **Circular Containers**: Softens sharp icons
- **Colored Backgrounds**: 20% opacity of accent color
- **Semantic Meaning**: Icon choice reflects function clearly
- **Size Consistency**: Strict sizing rules (16px/20px)

**Examples:**
- Lightbulb = Lights
- Thermometer = Temperature
- Lock/Unlock = Security
- Music Note = Media
- Wifi = Network

---

## Motion & Animation

### Apple's Animation Principles

#### Timing
- **Quick Micro-interactions**: 150ms (button press feedback)
- **Standard Transitions**: 200-300ms (hover states, reveals)
- **State Changes**: 500ms (on/off, mode changes)
- **Gentle**: Nothing jarring or sudden

#### Easing
- **Ease-out**: Default for most transitions (cubic-bezier)
- **Spring**: For playful elements (future consideration)
- **Linear**: For progress indicators only

### Animation Patterns

**1. State Transitions**
```css
Lights: Smooth color fade from gray → orange (500ms)
Climate: Mode icon swap with subtle scale (500ms)
Locks: Lock/unlock icon rotation + color shift (500ms)
```

**2. Hover Effects**
```css
Cards: Subtle scale (1.02) + border glow (200ms)
Buttons: Background opacity increase (200ms)
Icons: No animation (maintain stability)
```

**3. Loading States**
```css
Skeleton: Gentle pulse (1.5s loop)
Spinner: Smooth rotation (1s linear)
Progress: Smooth width transition (150ms)
```

---

## Layout & Composition

### Grid Inspiration: iOS Home Screen

**Principles:**
- **Flexible Grid**: Cards can be 1x1, 2x1, or 2x2
- **Organic Flow**: Browser handles placement automatically
- **Consistent Spacing**: Even gaps between all cards
- **No Orphans**: Grid adjusts to prevent awkward lone cards

### Visual Weight Balance

**Size Distribution:**
- **Small Cards (1x1)**: 60% of cards - quick controls
- **Medium Cards (2x1)**: 30% of cards - detailed controls
- **Large Cards (2x2)**: 10% of cards - complex interfaces

**Why?**
- Prevents overwhelming large card dominance
- Maintains scanability
- Feels organized not cluttered

---

## Imagery & Visual Assets

### Album Art Treatment (Media Card)
**Inspiration**: Apple Music iOS widget

**Technique:**
1. Sharp album art as focal point
2. Heavily blurred version as card background
3. Gradient overlay for text legibility
4. Color extraction for accent elements

**Effect**: 
- Immersive, music-focused experience
- Dynamic colors that match album
- Depth through blur layers

### Icons vs. Imagery
- **Icons**: Most cards (abstract representation)
- **Imagery**: Media, weather (when contextual photos add value)
- **No Generic Images**: Every image serves a purpose

---

## Interaction Patterns

### Touch & Tap Targets

**Inspiration**: iOS Human Interface Guidelines

**Sizing:**
- **Minimum**: 44px × 44px (Apple's recommendation)
- **Comfortable**: 48px × 48px (our standard buttons)
- **Generous**: 56px+ for primary actions

**Spacing:**
- **Minimum Gap**: 8px between interactive elements
- **Comfortable Gap**: 12px-16px standard
- **Visual Separation**: Clear clickable zones

### Feedback Mechanisms

**Visual Feedback:**
- **Instant**: Hover state appears immediately
- **Transition**: Smooth color/scale changes
- **Confirmation**: Visual state change after action

**Haptic Feedback (Future):**
- Light tap on toggle
- Stronger tap on important actions
- Failure vibration pattern

---

## Component Showcase

### Card Anatomy Reference

#### Light Card
```
┌─────────────────────────────────┐
│ Living Room         [💡]        │  ← Header: Title + Icon
│ Ceiling Light                   │  ← Subtitle
│                                 │
│ ████████████░░░░░░ 73%         │  ← Brightness Slider
│                                 │
│ [🎨] ──────●────── [🌡]        │  ← Color/Temp Selector
└─────────────────────────────────┘
```

#### Climate Card
```
┌─────────────────────────────────┐
│ Bedroom             [🌡]        │  ← Header
│ AC Unit                         │
│                                 │
│        72°F                     │  ← Large Temperature
│        ↑ 70°F                   │  ← Target (smaller)
│                                 │
│ [❄️] [💨] [🔥] [⚙️]              │  ← Mode Buttons
└─────────────────────────────────┘
```

#### Media Card (Small)
```
┌───────────────┐
│               │
│   [Album]     │  ← Full album art, click for details
│               │
└───────────────┘
```

---

## Design Tokens Summary

### Core Token Values
```css
/* Spacing Scale (4px base) */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 20px;
--space-2xl: 24px;

/* Border Radius */
--radius-card: 24px (rounded-3xl);
--radius-button: 9999px (rounded-full);
--radius-small: 8px (rounded-lg);

/* Backdrop Blur */
--blur-glass: 40px (backdrop-blur-xl);
--blur-medium: 24px (backdrop-blur-md);

/* Animation Duration */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 500ms;

/* Z-Index Hierarchy */
--z-base: 0;
--z-card-hover: 10;
--z-sticky-nav: 30;
--z-sticky-header: 40;
--z-modal: 50;
--z-edit-mode: 100;
```

---

## Reference Imagery

### Mood Reference Keywords
*Use these for image research and inspiration*

1. **"iOS widget dark mode"** - Card style reference
2. **"Apple HomeKit interface"** - Smart home patterns
3. **"Glassmorphism UI dark"** - Material effects
4. **"Premium dashboard interface"** - Overall aesthetic
5. **"Smart home control panel luxury"** - Target market feel
6. **"iOS music widget blur"** - Media card inspiration
7. **"Frosted glass UI elements"** - Glass morphism examples
8. **"Dark mode design system"** - Color and contrast
9. **"Apple weather widget"** - Information hierarchy
10. **"Minimalist dashboard dark"** - Layout simplicity

---

## Brand Personality

If this dashboard were a person:

**Sophisticated** - Knows good design, appreciates details
**Efficient** - Gets things done without fuss
**Welcoming** - Easy to approach, intuitive to use
**Confident** - Knows its purpose, executes perfectly
**Modern** - Current, not trendy; timeless, not dated

---

## Competitive Analysis

### What We Do Better Than:

**Generic Smart Home Dashboards:**
- More beautiful (glass morphism vs flat design)
- Better organized (room-based filtering)
- More flexible (adaptive card sizing)

**Home Assistant Default UI:**
- More modern aesthetic
- Better mobile experience
- More iOS-like polish

**Apple Home App:**
- More information density
- Customizable card sizes
- Better at-a-glance status

---

## Design Evolution Path

### Current State (v1.5)
✅ Core card types
✅ Glass morphism aesthetic
✅ Adaptive sizing
✅ Room-based filtering
✅ Edit mode
✅ Authentication system (Zustand store)
✅ User management with dropdown
✅ Theme customization (4 modes)
✅ Primary color selection (built-in accents + custom accent)
✅ Section-based navigation
✅ Settings page
✅ Empty states for all sections
✅ Drag & drop card and room reordering
✅ Export/import dashboard YAML config
✅ PWA installation

### Near Future
🎯 Animation polish
🎯 Haptic feedback
🎯 Additional theme refinements

### Long Term Vision (v2.0)
🔮 AI-powered layouts
🔮 Scene/automation cards
🔮 Multi-dashboard support
🔮 Advanced customization
🔮 Widget SDK for developers

---

## Usage Guidelines

### For Designers
- Reference this moodboard for new card designs
- Maintain visual consistency with existing patterns
- Test all designs at three card sizes
- Consider dark environment usage (no bright whites)

### For Developers
- Follow color token system strictly
- Maintain animation timing consistency
- Test on real devices (especially iOS)
- Optimize backdrop-blur performance

### For Stakeholders
- This is our design north star
- Decisions should align with this aesthetic
- User feedback should be filtered through this lens
- Feature requests should maintain design consistency

---

## Design Credits & Inspiration

**Primary Design Language:** Apple iOS Human Interface Guidelines
**Glassmorphism Movement:** Modern UI design trend (2020+)
**Home Automation:** Home Assistant, Apple HomeKit, Google Home
**Icon System:** Lucide React (MIT License)
**Color Theory:** Material Design color principles adapted for dark mode

---

*This moodboard is a living document. Update it as the design evolves.*
