# Marketing media capture

The files in this directory are captured from Navet's provider-free demo runtime. Use the capture
script instead of manually recreating cards or editing product screenshots.

## Refresh everything

From the repository root:

```bash
pnpm marketing:capture
```

The command starts the local demo on `127.0.0.1:4178`, opens it with Playwright, captures the
defined screenshots and walkthroughs, converts screenshot sources to JPG, WebP, and AVIF, then
stops the demo.

Capture only one media type:

```bash
pnpm marketing:capture:screenshots
pnpm marketing:capture:videos
```

To capture an already-running local or deployed demo:

```bash
pnpm marketing:capture -- --base-url=http://127.0.0.1:5173
NAVET_CAPTURE_BASE_URL=https://demo.navet.app pnpm marketing:capture
```

Do not point the script at a real household dashboard. Marketing media must contain demo data only.

## Screenshot set

The canonical scenarios live in `scripts/capture-marketing-media.mjs`:

- Home: 1536x1024 landscape, 1024x1366 portrait tablet, and 430x932 phone
- Energy: 1536x1024 landscape
- Security: 1536x1024 landscape
- Lights: 430x932 phone
- Media: 1366x1024 iPad Pro landscape and 430x932 iPhone portrait

Each screenshot is written to `screenshots/` with matching `.jpg`, `.webp`, and `.avif` filenames.
Website code should prefer AVIF and WebP sources with JPG as the fallback.

## Walkthrough set

Playwright records:

- `campaigns/live-product-tutorials/recordings/final/navet-dashboard-walkthrough.webm`
  - Home, Lights, Media Library, media players and screens, Energy, Security, then Home
- `campaigns/live-product-tutorials/recordings/final/navet-mobile-home-walkthrough.webm`
  - a paced scroll through the mobile Home dashboard

The walkthroughs are silent source recordings. Keep them as WebM for the web, or make an MP4 copy
for editing and wider distribution:

```bash
ffmpeg \
  -i assets/reference/marketing/campaigns/live-product-tutorials/recordings/final/navet-dashboard-walkthrough.webm \
  -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart \
  assets/reference/marketing/campaigns/live-product-tutorials/recordings/final/navet-dashboard-walkthrough.mp4
```

## Review checklist

Before committing refreshed media:

1. Confirm the screenshots show the current Navet cards, navigation, and spacing.
2. Check that demo fixtures contain no private URLs, credentials, entity names, or household data.
3. Review landscape, portrait, and phone crops for clipped controls or open overlays.
4. Play both walkthroughs through once and check that every transition settles before the next one.
5. Run `git diff --check` and inspect the website surfaces that consume the replaced assets.

When a dashboard route or capture story changes, update the scenario or walkthrough steps in the
capture script first, then regenerate the media.
