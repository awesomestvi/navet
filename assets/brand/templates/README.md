# Navet brand templates

These SVG templates turn the established Navet identity into repeatable working files. They use
the current hub mark geometry, system typography, `#06080d` canvas, orange identity accent,
restrained blue atmosphere, fine borders, and the rounded modular geometry seen across
`navet.app`, `docs.navet.app`, and the Navet product cards.

They are production starting points, not new brand directions. Do not recolor or redraw the mark,
substitute a display typeface, or add a campaign palette.

## Templates

| File | Canvas | Recommended use | Safe area |
| --- | ---: | --- | ---: |
| `social-announcement.svg` | 1200 × 630 | Release, feature, or project announcement | 72 px |
| `video-title-card.svg` | 1920 × 1080 | Tutorial title or chapter card | 120 px |
| `presentation-title-slide.svg` | 1920 × 1080 | Presentation cover slide | 96 px |
| `readme-banner.svg` | 1600 × 500 | Repository or project README banner | 56 px |

Each SVG includes a hidden `safe-area-guide` group. Change its `display="none"` attribute to
`display="inline"` while editing, then hide it again before export.

## Edit the content

1. Open the SVG in Figma, Illustrator, Inkscape, or a text editor.
2. Edit text only inside the `editable-content` group. Text elements and placeholder lines have
   descriptive IDs such as `editable-headline`, `editable-support`, and `editable-meta`.
3. Keep the headline to the existing number of lines. Shorten the message before reducing its
   size. Use sentence case and one concrete user outcome.
4. Replace the `replace-product-proof` group with a current Navet screenshot or product crop. Clip
   the image to the existing rounded rectangle. Do not reconstruct or embellish the dashboard.
5. Update the root `<title>` and `<desc>` so the exported SVG has an accurate accessible name.

The sample copy demonstrates hierarchy only. Verify feature, provider, privacy, release, and
numeric claims against current product sources before publishing.

## Product proof

Product imagery should come from the current, public-safe Navet demo or the approved marketing
capture library under `assets/reference/marketing/`. Prefer one readable crop over a collage.
Preserve the real card colors: those colors describe state, content, or device context and are not
a decorative campaign palette.

When inserting an image directly in SVG, keep it inside the existing clip path:

```svg
<image
  href="path/to/current-product-capture.png"
  x="0"
  y="0"
  width="100%"
  height="100%"
  preserveAspectRatio="xMidYMid slice"
/>
```

Embed the image as a data URI when the finished SVG must be portable. Otherwise, export to PNG or
JPG before distribution so relative image paths cannot break.

## Logo and type

- The inline lockup uses the exact established hub geometry and locked orange gradient. Do not
  edit the symbol contents. The repository's asset manifest checksums each approved template so
  an inline lockup cannot drift silently; change it only through explicit brand review.
- Keep clear space around the lockup equal to at least 10% of its height.
- Do not reduce the square mark below 32 px in a final digital asset.
- Keep the system stack: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- If an editor substitutes a font, export from a platform with a native system sans or outline
  only the finished campaign text. Keep an editable source copy.

## Accessibility and contrast

- Primary text is white on the near-black canvas. Supporting text uses at least 64% white at the
  supplied sizes; do not lower its opacity.
- Orange and blue glows are atmosphere, never the only carrier of meaning.
- Keep essential text away from the product image and high-energy glow areas.
- Use the supplied type sizes as minimums for these canvases. If copy does not fit, edit the copy.
- Check the final crop at the actual display size, including a mobile social feed and a README in
  both light and dark browser themes.
- Do not put required information only in the raster image. Repeat the key outcome in live text or
  accessible alt text wherever the asset is published.

## Export

Export SVG when the destination reliably supports SVG and all linked images are embedded. For
social, video, and presentation tools, export a raster copy at the canvas's native dimensions.

From the repository root, Sharp can render a review PNG without changing the source:

```bash
node -e "import('sharp').then(({default: sharp}) => sharp('assets/brand/templates/social-announcement.svg').png().toFile('/tmp/navet-social-announcement.png'))"
```

Use PNG for type- and UI-heavy artwork. Use high-quality JPG only when a photographic background
makes the PNG unnecessarily large. Do not stretch an export to a different aspect ratio.
