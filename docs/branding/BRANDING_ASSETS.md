# Navet asset quick reference

For generation, platform requirements, and review rules, use the canonical
[brand asset system](ASSET_SYSTEM.md). The machine-readable contract is
[`asset-manifest.json`](../../assets/brand/source/asset-manifest.json).

## Core files

| Asset | Path | Intended use |
| --- | --- | --- |
| Hub mark | `assets/public/logo.svg` | Product identity, square placements, avatars |
| Dark-text lockup | `assets/public/logo-horizontal.svg` | Light neutral backgrounds |
| Light-text lockup | `assets/public/logo-horizontal-light.svg` | Dark neutral backgrounds |
| Favicon | `assets/public/favicon.svg` | Browser tabs and bookmarks |
| Install-icon source | `assets/brand/source/app-icon-maskable.svg` | iOS and maskable PWA exports |
| PWA install icons | `assets/public/pwa-192.png`, `pwa-512.png` | Ordinary install surfaces |
| PWA maskable icons | `assets/public/pwa-maskable-192.png`, `pwa-maskable-512.png` | Cropped install surfaces |
| Social preview | `assets/public/navet-social-card.jpg` | Open Graph and social previews |

The orange gradient, hub construction, proportions, and lockup relationship are locked. Do not
recolor, stretch, rotate, shadow, redraw, or place the mark on a background that obscures it.

## Reusable templates

Editable announcement, video, presentation, and README layouts live in
[`assets/brand/templates/`](../../assets/brand/templates/). They preserve the established website,
docs, and product-card language and include safe-area and export guidance.

## Generate and check

From the repository root:

```bash
pnpm brand:generate
pnpm check:brand
```

Commit approved sources and generated outputs together. Do not hand-edit the raster exports.
