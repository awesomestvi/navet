# 🎨 Navet Branding Assets - Quick Reference

A quick visual reference for all Navet brand assets.

---

## 🔷 Logo Variations

### 1. Square Logo (Primary)
**File:** `/public/logo.svg` | **Size:** 120×120px

<img src="../../public/logo.svg" width="120" alt="Navet Square Logo" />

**Best for:** App icons • Social media • Square placements

---

### 2. Horizontal Logo (Dark Text)
**File:** `/public/logo-horizontal.svg` | **Size:** 200×60px

<img src="../../public/logo-horizontal.svg" width="200" alt="Navet Horizontal Logo" />

**Best for:** Light backgrounds • Website headers • Documentation

---

### 3. Horizontal Logo (Light Text)
**File:** `/public/logo-horizontal-light.svg` | **Size:** 200×60px

<img src="../../public/logo-horizontal-light.svg" width="200" alt="Navet Horizontal Logo Light" style="background: #1a1a1a; padding: 10px;" />

**Best for:** Dark backgrounds • Dark mode • Night theme

---

## 🔸 Favicons & Icons

### 4. Browser Favicon
**File:** `/public/favicon.svg` | **Size:** 32×32px

<img src="../../public/favicon.svg" width="32" alt="Navet Favicon" />

**Best for:** Browser tabs • Bookmarks • PWA icons

---

### 5. Apple Touch Icon
**File:** `/public/apple-touch-icon.svg` | **Size:** 180×180px

<img src="../../public/apple-touch-icon.svg" width="120" alt="Navet Apple Touch Icon" />

**Best for:** iOS home screen • Safari tabs • iOS shortcuts

---

## 🎨 Color Palette

### Primary Gradient
```
Start: #f97316 (Tailwind orange-500)
End:   #ea580c (Tailwind orange-600)
```

### Visual Sample
<div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); width: 200px; height: 60px; border-radius: 8px;"></div>

---

## 📋 Quick Reference Table

| Asset | File | Size | Use Case |
|-------|------|------|----------|
| Square Logo | `logo.svg` | 120×120 | App icons, social media |
| Horizontal (Dark) | `logo-horizontal.svg` | 200×60 | Light backgrounds |
| Horizontal (Light) | `logo-horizontal-light.svg` | 200×60 | Dark backgrounds |
| Favicon | `favicon.svg` | 32×32 | Browser tabs |
| Apple Icon | `apple-touch-icon.svg` | 180×180 | iOS home screen |

---

## 🔗 Related Documentation

- **[BRANDING.md](BRANDING.md)** - Complete brand guidelines
- **[docs/LOGO_SHOWCASE.md](../LOGO_SHOWCASE.md)** - Visual showcase with examples
- **[public/README.md](../../public/README.md)** - Technical specifications

---

## ⚡ Quick Copy-Paste

### HTML
```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
<meta name="theme-color" content="#f97316" />
```

### React/JSX
```jsx
import logo from '/logo.svg';
<img src={logo} alt="Navet" width="60" height="60" />
```

### Markdown
```markdown
![Navet Logo](../../public/logo.svg)
```

---

**All assets are located in `/public/` directory**

*Last Updated: April 8, 2026*
