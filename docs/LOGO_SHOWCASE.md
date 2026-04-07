# Navet Logo Showcase

Visual reference for all Navet logo variations and use cases.

## Logo Variations

### Square Logo (Primary)

<div align="center">
  <img src="../public/logo.svg" alt="Navet Square Logo" width="120" />
  <p><em>logo.svg - 120x120px</em></p>
</div>

**Use for:**
- App icons and PWA icons
- Social media profile pictures
- Square placements
- Mobile applications

---

### Horizontal Logo (Light Backgrounds)

<div align="center" style="background: #f5f5f5; padding: 20px;">
  <img src="../public/logo-horizontal.svg" alt="Navet Horizontal Logo" width="200" />
  <p><em>logo-horizontal.svg - 200x60px</em></p>
</div>

**Use for:**
- Website headers on light backgrounds
- Documentation and presentations
- Email signatures
- Light-themed interfaces

---

### Horizontal Logo (Dark Backgrounds)

<div align="center" style="background: #1a1a1a; padding: 20px;">
  <img src="../public/logo-horizontal-light.svg" alt="Navet Horizontal Logo Light" width="200" />
  <p><em>logo-horizontal-light.svg - 200x60px</em></p>
</div>

**Use for:**
- Website headers on dark backgrounds
- Dark mode interfaces
- Dark-themed presentations
- Night mode documentation

---

## Favicon Variations

### Standard Favicon

<div align="center">
  <img src="../public/favicon.svg" alt="Navet Favicon" width="32" />
  <p><em>favicon.svg - 32x32px</em></p>
</div>

**Use for:**
- Browser tab icons
- Bookmarks
- Progressive Web Apps
- Browser favorites

---

### Apple Touch Icon

<div align="center">
  <img src="../public/apple-touch-icon.svg" alt="Navet Apple Touch Icon" width="120" />
  <p><em>apple-touch-icon.svg - 180x180px</em></p>
</div>

**Use for:**
- iOS home screen icons
- Safari pinned tabs
- iOS Shortcuts
- PWA on iOS devices

---

## Logo Concept Breakdown

### Design Elements

```
        ○          Top node (device)
       /|\
      / | \        Radiating connections
     /  |  \
    ○   ●   ○      Center hub (Navet)
     \  |  /       
      \ | /        Network pattern
       \|/
        ○          Bottom node (device)
```

**Symbolism:**
- **● Center Circle** = Navet (your smart home hub)
- **8 Outer ○** = Connected devices and systems
- **─ Lines** = Communication and control paths
- **Network Pattern** = Unified, interconnected system
- **Orange Gradient** = Warm, welcoming, energetic

### Color Palette

**Primary Gradient:**
```
Start: #f97316 (Tailwind orange-500)
End:   #ea580c (Tailwind orange-600)
```

**Logo Elements:**
```
White: #ffffff with 95% opacity
Background: Orange gradient
```

---

## Usage Examples

### ✅ Correct Usage

1. **On Clean Backgrounds**
   - White or light gray backgrounds with horizontal logo
   - Dark backgrounds with light text version
   - Transparent backgrounds with sufficient contrast

2. **Proper Spacing**
   - Minimum 10% clear space around logo
   - No text or elements crowding the logo
   - Adequate padding on all sides

3. **Appropriate Sizing**
   - Minimum 32px for favicons
   - Minimum 60px for full logos
   - Maintain aspect ratio when scaling

### ❌ Incorrect Usage

1. **Don't Modify Colors**
   - ❌ Changing gradient colors
   - ❌ Making logo monochrome (except approved versions)
   - ❌ Adding color overlays

2. **Don't Distort**
   - ❌ Stretching or squashing
   - ❌ Rotating at odd angles
   - ❌ Skewing or perspective distortion

3. **Don't Add Effects**
   - ❌ Drop shadows
   - ❌ Outer glows
   - ❌ 3D effects
   - ❌ Gradients on top

4. **Don't Use on Busy Backgrounds**
   - ❌ Patterned backgrounds
   - ❌ Photos with insufficient contrast
   - ❌ Competing colors

---

## Technical Implementation

### HTML Meta Tags

```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/svg+xml" sizes="32x32" href="/favicon-32x32.svg" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.svg" />

<!-- Web App Manifest -->
<link rel="manifest" href="/site.webmanifest" />
```

### React/JSX Usage

```jsx
import logo from '/logo.svg';
import logoHorizontal from '/logo-horizontal.svg';

// Square logo
<img src={logo} alt="Navet" width="60" height="60" />

// Horizontal logo
<img src={logoHorizontal} alt="Navet" width="200" height="60" />
```

### CSS Background

```css
.logo {
  background-image: url('/logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  width: 60px;
  height: 60px;
}
```

---

## File Locations

All logo files are located in `/public/`:

```
public/
├── logo.svg                    (120x120 - Square logo)
├── logo-horizontal.svg         (200x60 - Horizontal, dark text)
├── logo-horizontal-light.svg   (200x60 - Horizontal, light text)
├── favicon.svg                 (32x32 - Browser icon)
├── favicon-32x32.svg           (32x32 - Alternative)
├── apple-touch-icon.svg        (180x180 - iOS icon)
└── README.md                   (Asset documentation)
```

---

## Brand Resources

For complete brand guidelines, see:
- [BRANDING.md](branding/BRANDING.md) - Full brand guidelines
- [public/README.md](../public/README.md) - Logo asset documentation

---
**Last Updated:** April 8, 2026
