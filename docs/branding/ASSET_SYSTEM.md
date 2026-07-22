---
title: Brand asset system
description: Official Navet asset sources, exports, platform requirements, and validation.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/branding/ASSET_SYSTEM.md
---

This document defines how Navet's established logo, install icons, social artwork, and
Home Assistant brand exports move from an approved source into product distributions. It is an
asset-governance document, not permission to redraw or restyle the brand.

Use these machine-readable files with this guide:

- [`brand-tokens.json`](https://github.com/awesomestvi/navet/blob/main/assets/brand/source/brand-tokens.json) records the small set of
  cross-surface brand primitives that should not drift between product, website, and docs. It is
  a validation contract, not a runtime dependency; each surface keeps its native token layer and
  `pnpm check:brand` verifies alignment.
- [`asset-manifest.json`](https://github.com/awesomestvi/navet/blob/main/assets/brand/source/asset-manifest.json) records approved variants,
  intended output dimensions, formats, and committed distribution paths.
- [`assets/brand/README.md`](https://github.com/awesomestvi/navet/blob/main/assets/brand/README.md) explains the authoring and export
  boundary.

The [brand and trademark policy](https://docs.navet.app/brand/trademark/) governs every Navet mark, including copies
inside application and Home Assistant distributions.

## Authority and ownership

The source hierarchy is:

1. The visual and verbal rules in `docs/branding/` define what is on-brand.
2. `assets/brand/source/brand-tokens.json` and `assets/brand/source/asset-manifest.json` are the
   machine-readable contract for reusable primitives and asset outputs.
3. The approved logo, lockup, and favicon SVG masters live in `assets/public/` because every web
   surface consumes those exact stable paths. The manifest names each one explicitly. The
   full-bleed install-icon master lives in `assets/brand/source/` and generates both Apple and
   maskable PWA outputs.
4. Other files in `assets/public/` are checked-in runtime outputs. The folder is not a place for
   alternate concepts or one-off exports.
5. `platform/home-assistant/` contains platform-specific committed exports. Those files are
   distributions of the Navet identity, not independent masters.

When guidance and a generated file disagree, stop and compare the approved source and manifest.
Do not make the generated file the new design by accident.

## Approved core variants

| Variant | Approved use | Vector source | Intended output |
| --- | --- | --- | --- |
| Hub mark | App identity, product chrome, square placements | `assets/public/logo.svg` | SVG, 120 x 120 intrinsic canvas |
| Horizontal lockup, dark text | Light backgrounds | `assets/public/logo-horizontal.svg` | SVG, 200 x 60 intrinsic canvas |
| Horizontal lockup, light text | Dark backgrounds | `assets/public/logo-horizontal-light.svg` | SVG, 200 x 60 intrinsic canvas |
| Favicon | Browser tabs and bookmarks | `assets/public/favicon.svg` | SVG, 32 x 32 intrinsic canvas |
| Apple touch icon | Apple home-screen installs | `assets/brand/source/app-icon-maskable.svg` | Full-bleed SVG and PNG, 180 x 180 |
| PWA install icon | General install surfaces | `assets/public/logo.svg` | PNG, exactly 192 x 192 and 512 x 512 |
| PWA maskable icon | Cropped install surfaces | `assets/brand/source/app-icon-maskable.svg` | Full-bleed PNG, exactly 192 x 192 and 512 x 512 |
| Social preview | Open Graph and link previews | Website social-card composition | JPEG, exactly 1200 x 630 |

The orange gradient, hub construction, proportions, and wordmark relationship are locked. New
file formats or sizes must be exports of these variants, not revised variants.

## Distribution map

### Website, demo, docs, standalone, and Storybook

`assets/public/` is exposed directly through the following build configuration:

- `apps/standalone/vite.config.ts` uses it as Vite's `publicDir` and also declares the standalone
  PWA manifest.
- `apps/demo/vite.config.ts` and `apps/website/vite.config.ts` use it as Vite's `publicDir`.
- `apps/docs/astro.config.mjs` uses it as Astro's `publicDir`.
- `apps/storybook/.storybook/main.ts` exposes it through Storybook `staticDirs`.

Those builds copy files into ignored `dist/` directories. The build outputs are mirrors, never
authoring sources. Do not copy a file back from `dist/` into `assets/public/`.

The checked-in `assets/public/site.webmanifest` is the canonical install-metadata input. The
standalone Vite configuration reads it directly, changes only `start_url` and `scope` for relative
deployment, and lets Vite PWA emit the built manifest. Other public-directory consumers copy the
file but do not currently advertise themselves as installable PWAs. `pnpm check:brand` validates
every declared icon and verifies that standalone still consumes the shared source.

### Brand reference diagrams

`scripts/generate-brand-reference-visuals.mjs` rebuilds the logo, color, and card-reference SVGs.
It embeds the approved logo masters directly, renders symbols from the installed `lucide-react`
package, and crops the implemented climate card from the maintained demo Home screenshot. Do not
redraw those sources inside the diagrams. Run `pnpm brand:generate`, review the three rendered
SVGs, and update their locked manifest hashes only after that visual review.

### Social preview

Regenerate the complete asset set and social preview through:

```bash
pnpm brand:generate
```

`apps/website/scripts/generate-social-card.mjs` composes:

- `assets/reference/marketing/use-cases/navet-hero-background-room.png`
- `assets/reference/marketing/use-cases/navet-hero-dashboard-overlay.png`
- `assets/public/logo-horizontal-light.svg`
- copy and treatments embedded in the generator

The committed output is `assets/public/navet-social-card.jpg`. The normal website build does not
run this generator, so a copy or visual change that affects the card requires an explicit
regeneration and review. The generator reads the shared brand tokens and uses the established
public descriptor.

### Home Assistant panel and HACS integration

`node scripts/build-ha-panel.mjs` builds the panel, replaces
`platform/home-assistant/custom_components/navet/frontend/`, and explicitly copies
`assets/public/logo.svg` to that frontend directory. It also copies the runtime wallpapers.

`node scripts/export-hacs-integration.mjs` then copies the whole committed custom component,
including `brand/` and the panel frontend, to the sibling `navet-hacs` repository. The ignored
`dist/home-assistant/hacs-repo/` tree is an export snapshot and is not authoritative.

Home Assistant 2026.3 and later can read custom-integration images from the local `brand/`
directory. Navet keeps those committed exports under
`platform/home-assistant/custom_components/navet/brand/`. The supported filenames and behavior
are documented in the [Home Assistant developer announcement](https://developers.home-assistant.io/blog/2026/02/24/brands-proxy-api/),
while the [Home Assistant Brands image specification](https://github.com/home-assistant/brands#image-specification)
defines the normal-density 256 x 256 icon and 128-256 px shortest-side logo constraints used by
this asset system.

Navet exports the icon at 256 x 256 and 512 x 512. It exports the light-background lockup and the
white-text dark-theme lockup at a 256 px shortest side, plus 512 px high-density versions. The hub
mark itself remains legible on light and dark themes, so it does not need a separate dark icon.

### Home Assistant add-ons

The stable add-on reads `icon.png` and `logo.png` directly from
`platform/home-assistant/addons/navet/`. These are not copied by the HACS integration export.
Home Assistant recommends a square 128 x 128 PNG icon and a PNG logo around 250 x 100; Navet keeps
the established horizontal wordmark ratio, so its intended add-on logo export is 250 x 75. See
[Home Assistant: Presenting your app](https://developers.home-assistant.io/docs/apps/presentation/#app-icon--logo).

The `navet-dev` add-on is a separate store entry. `pnpm brand:generate` keeps its icon and lockup
synchronized with the stable add-on.

## Automated guarantees

Run:

```bash
pnpm check:brand
```

The check fails when:

- a source or declared output is missing
- an SVG, PNG, or JPEG has the wrong format or exact dimensions
- an asset ID or output path is duplicated
- a locked approved vector's checksum changes without an explicit manifest update
- a committed PNG or JPEG no longer matches its reviewed output checksum, even when its dimensions
  are unchanged
- the web and standalone PWA declarations drift from the approved icon list
- a maskable or Apple touch icon has a transparent canvas edge
- the Home Assistant frontend logo drifts from the approved public mark
- stable color, typography, shape, or motion tokens are malformed or unexpectedly changed
- the approved SVG gradient, docs accent/canvas/type/atmosphere, product card/control/pill radii,
  social atmosphere, or product motion drift from the machine-readable brand tokens

The dedicated maskable source keeps the established hub geometry inside the safe zone while its
orange background reaches the canvas edge. The [Web App Manifest icon-mask specification](https://www.w3.org/TR/appmanifest/#icon-masks)
defines the cropping behavior.

The horizontal SVG lockups intentionally preserve the established live system-type label; Navet
does not currently have a bespoke drawn wordmark. Vector rendering can therefore vary within the
approved system stack. Committed platform rasters are reviewed outputs, and generation is
repeatable only when the font environment is the same. A future outlined master would be an
identity-source change and needs explicit visual review; do not silently substitute a font outline
merely to make raster generation platform-independent.

## Format and export rules

- Preserve the SVG `viewBox`, proportions, geometry, and gradient colors.
- Use sRGB for web and platform raster exports.
- Keep PNG transparency where the consuming platform supports it. Maskable PWA and Apple touch
  outputs are the explicit exceptions: their background treatment must cover the full canvas so
  the platform can apply its own crop safely.
- Use lossless PNG optimization for icons and wordmarks. Do not introduce JPEG artifacts around
  high-contrast logo edges.
- Use JPEG only for photographic/composited previews such as the social card. The current social
  generator uses quality 88, progressive encoding, and 4:4:4 chroma subsampling.
- Do not upscale a small raster to make a larger nominal asset. Render each raster size from an
  approved vector or full-resolution composition input.
- A platform-specific export may add required transparent canvas, but it may not stretch, recolor,
  rotate, shadow, or redraw the mark.
- Review exports on both light and dark neutral backgrounds and at their smallest intended display
  size.

## Change procedure

1. Confirm that the request is an export or application of the established identity. Changes to
   hub geometry, gradient, wordmark construction, or logo relationship require explicit brand
   review.
2. Update the approved source, never a file copied from a build directory.
3. Update `asset-manifest.json` before adding a new required variant or distribution path.
4. Run the approved generator. Do not hand-edit raster outputs. For live-type lockup rasters, use
   the same font environment as the reviewed output or expect a deliberate visual diff.
5. Validate JSON, output existence, exact pixel dimensions, SVG intrinsic dimensions, approved
   raster checksums, and declared PWA sizes and purposes.
6. Compare generated files visually on their actual product surface.
7. Build or export only the affected distributions. A Home Assistant panel build can replace the
   entire committed frontend directory, while a HACS export writes to a separate repository; use
   those workflows deliberately.
8. Commit source and generated outputs together, with any intentional exception documented here.

## Licensing and trademark requirements

- Navet source code is licensed under `AGPL-3.0-only`; that license does not grant a right to use
  the Navet name, hub mark, wordmark, or derivative brand identifiers.
- Official Navet asset use must follow the [brand and trademark policy](https://docs.navet.app/brand/trademark/).
- Modified distributions and forks must not ship the Navet marks in a way that implies official
  affiliation, sponsorship, endorsement, or an official Navet release.
- Do not bundle third-party provider marks into the Navet asset system as if Navet owns them.
  Provider logos remain subject to their owners' terms and should be used only where factual
  identification is necessary.
- Product screenshots can include the Navet interface under the screenshot guidance, but private
  household data, credentials, personal images, addresses, and provider account information must
  be removed before distribution.
