# Navet — 60-second product motion film

Status: local review delivery. Brief approved September 5, 2026; framing revised September 6 following the user's visual review.

Create a 60-second, 16:9 film for self-hosted smart-home users. Use Navet's authentic interface, real working interactions, a new sparse Juniper take, and a new 120 BPM instrumental. Deliver 1920 × 1080 at 60 fps with a clean MP4, captioned MP4, SRT, authentic poster, and editable project containing assets, source audio, stems, timings, and render instructions. Use existing account credits without purchases or upgrades.

| Time | Product sequence | Narration |
| --- | --- | --- |
| 0–3 | Navet mark and Home reveal | Meet Navet. |
| 3–8 | Home, complete room tabs and summary pills, Kitchen island | Your home, at a glance. |
| 8–14 | Lighting overview into a complete Kitchen group; brightness 100% → 40% | Set the mood. |
| 14–20 | Actual Main floor temperature adjustment and resulting state; Climate overview | Get comfortable. |
| 20–26 | Security overview, complete camera cards, complete door status cards | Keep an eye on home. |
| 26–34 | Energy metrics, native particle orb, full usage graph | See where the energy goes. |
| 34–40 | Existing Media artwork, full Now Playing and library labels, grouped speakers | Put some music on. |
| 40–45 | Complete Unload dishwasher; 2/6 → 3/6 and actual Done state | Make room for the everyday. |
| 45–49 | Distinct Routines list and controls | Instrumental and interaction accents |
| 49–53 | Actual Appearance theme picker, Dark → Light | Make it yours. |
| 53–57 | Independently captured desktop, tablet, phone layouts | A smart home dashboard for every screen. |
| 57–60 | Official logo, descriptor, Open source. Self-hosted., Explore the demo · navet.app | Music resolves |

## Framing correction

The user identified cropped light ambience, chopped summary pills and Media headings, and requested removal of every eyebrow heading. Revision 2 uses padded source regions, complete component close-ups, bounded camera movement, and one small subtitle per scene. No editorial eyebrow remains. Narration and music are preserved across this visual revision.

## Product evidence

- Product identity and audience: `.agents/product-marketing.md`.
- Canonical descriptor and typography: Navet branding guidance and live `https://navet.app/`, measured against bundled Inter; recorded in the editable project.
- Authentic feature content and interactions: `packages/app/src/demo/` and the working local demo. Source capture paths and crop rectangles are recorded in asset provenance.
- Demo Climate actions: `packages/app/src/preview/runtime.ts`; the preview target settles at 22.5 °C and the existing card displays Heat to 23°C.
- Demo chores: `packages/app/src/demo/demo-chore-actions.ts` uses the existing production chore reducer locally and records the actual completion result.

No application API or schema changes. Production media remain in a separate ignored cache directory. Delivery metadata records output paths, format checks, provenance, and SHA-256 checksums under `marketing/content/deliveries/2026-09-06-navet-product-motion-film/`. Publication and website integration are separate work.
