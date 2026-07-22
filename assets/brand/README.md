# Navet Brand Assets

This directory is the source and working area for Navet's established brand identity. It separates
approved authoring inputs from application runtime files so an export cannot quietly become a new
logo or visual direction.

## Source of truth

- [`source/brand-tokens.json`](source/brand-tokens.json) contains stable cross-surface brand
  primitives as a validation contract. Product and site code keep their native token systems;
  `pnpm check:brand` compares the locked values instead of making runtime builds import this file.
- [`source/asset-manifest.json`](source/asset-manifest.json) defines approved variants, templates,
  formats, intended dimensions, locked-source checksums, and approved raster-output checksums.
- The approved logo, lockup, and favicon SVG masters remain at their stable runtime paths in
  `../public/`; the manifest names them explicitly. The full-bleed install-icon master lives under
  `source/` and generates the Apple and maskable PWA outputs.
- [`templates/`](templates/) contains reusable communication layouts. Product builds do not depend
  on those working files.

The detailed workflow, current audit, Home Assistant export rules, and change checklist live in
[`docs/branding/ASSET_SYSTEM.md`](../../docs/branding/ASSET_SYSTEM.md).

## Runtime boundary

`assets/public/` remains Navet's checked-in web runtime distribution. Vite, Astro, and Storybook
copy that directory into their build outputs. Home Assistant-specific exports remain under
`platform/home-assistant/`.

Treat both locations as output contracts:

- do not store alternate logo concepts in them
- do not edit raster icons by hand
- do not copy an ignored `dist/` artifact back into source
- generate all required sizes from approved vector or full-resolution inputs
- keep the manifest and generated outputs in the same change

From the repository root:

```bash
pnpm brand:generate
pnpm check:brand
```

The generator rebuilds the brand-reference diagrams from approved logo masters, installed Lucide
icons, and the maintained demo Home capture. It also produces raster install and Home Assistant
assets from the approved vectors, keeps exact mirrors synchronized, and rebuilds the social
preview. The check enforces formats, dimensions, approved raster content, manifest declarations,
token alignment, maskable coverage, and mirror equality.

## Brand protection

The brand files are not covered by the repository's code license. All use of the Navet name,
wordmark, hub mark, and derived brand identifiers is governed by
[`docs/branding/TRADEMARK_POLICY.md`](../../docs/branding/TRADEMARK_POLICY.md).
