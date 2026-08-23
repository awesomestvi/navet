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

To refresh one screenshot without replacing the rest of the set:

```bash
pnpm marketing:capture:screenshots -- --scenario=navet-ipad-landscape-home
```

Do not point the script at a real household dashboard. Marketing media must contain demo data only.

## Screenshot set

The canonical scenarios live in `scripts/capture-marketing-media.mjs`:

- Home: 1448x1012 framed iPad landscape, 1024x1366 portrait tablet, and a 390x766
  safe-area-aware phone viewport exported at 2x
- Energy: 1536x1024 landscape
- Climate: 1536x1024 landscape
- Security: 1536x1024 landscape
- Lights: 430x932 phone
- Media: 1366x1024 iPad Pro landscape and 430x932 iPhone portrait
- Household and Routines: 1536x1024 landscape

Each screenshot is written to `screenshots/` with matching `.jpg`, `.webp`, and `.avif` filenames.
Website code should prefer AVIF and WebP sources with JPG as the fallback.

## Public docs reuse

The public how-to guides reuse the canonical WebP captures for full dashboard views. After
refreshing the scenarios, copy the matching files into `assets/public/docs/how-to/`:

| Scenario | Public docs image |
|---|---|
| `navet-ipad-landscape-home` | `quick-start/first-15-minutes-overview.webp` |
| `navet-ipad-landscape-energy` | `everyday-control/energy-dashboard.webp` |
| `navet-ipad-landscape-climate` | `everyday-control/climate-dashboard.webp` |
| `navet-ipad-landscape-security` | `everyday-control/security-dashboard.webp` |
| `navet-mobile-pwa-media-or-lights` | `everyday-control/lights-dashboard.webp` |
| `navet-ipad-pro-landscape-media` | `everyday-control/media-dashboard.webp` |
| `navet-ipad-landscape-household` | `everyday-control/household-today.webp` |
| `navet-ipad-landscape-routines` | `everyday-control/tasks-dashboard.webp` |

Dialog screenshots should come from the exact Storybook story. The Add Card guide uses
`Pages/Dashboard/Add Card Dialog / Phone Cover Sheet`, including its search state, rather than a
hand-drawn dialog or a real household dashboard. Other branch-sensitive guide images use:

- `Pages/Dashboard/Multiple Dashboards/Create Dialog / Phone Sheet` for dashboard creation;
- `Components/Shared/Card Size Selector / Phone Sheet` for responsive resizing;
- `Cards/Entity/Alarm Panel / All Supported Modes` with **Emergency Trigger** open for the alarm
  confirmation sheet.

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
