# Navet motion promo: every dashboard

Status: Revision 7 review export. Uses the user's latest ElevenLabs Juniper
Generation 1. Website-matched Inter Semibold promotional headlines, smaller Inter Bold
dashboard labels, restrained motion, and synchronized captions. Not published.

## Pitch

**Your smart home. In one place.**

A fast tour of Home, Energy, Climate, Security, Lighting, Media, Household,
Routines, and Settings, using actual provider-free Navet demo screens.
The opening and ending use a mosaic of all nine views. The ownership statement
remains “Open source. Self-hosted.” The CTA is navet.app.

Format: 1920 × 1080 landscape, 30 fps, 27.5 seconds. Synthetic narration selected
by the user, burned-in Inter captions, and original instrumental music.

## Selected narration

This is Navet.

Your smart home, in one place.

See how your home's doing, at a glance.

Follow where the energy's going.

Keep every room comfortable.

Check the cameras and doors.

Get the lighting right.

Put some music on.

Even the everyday stuff — chores and routines — has a place.

And you can make it look the way you want.

Open source.

Self-hosted.

Take a look at navet.app.

Voice: ElevenLabs Juniper – Grounded and Professional, Eleven v3, Generation 1.
The user regenerated and selected this take. Source duration is 25.54775 seconds;
pitch and playback speed are unchanged. Navet is supplied as “Nah-vet” to speech
synthesis for pronunciation; displayed copy uses the normal brand spelling.

## Scene timing

| Time | View |
|---|---|
| 0.00–3.97 | Introduction |
| 3.97–6.49 | Home |
| 6.49–8.13 | Energy |
| 8.13–10.13 | Climate |
| 10.13–12.01 | Security |
| 12.01–13.47 | Lighting |
| 13.47–14.97 | Media |
| 14.97–17.07 | Household |
| 17.07–18.71 | Routines |
| 18.71–21.27 | Settings |
| 21.27–24.01 | Open source. Self-hosted. |
| 24.01–27.50 | Invitation |

## Visual and product evidence

- Titles: self-hosted Inter from `assets/public/fonts/inter`, checked against
  `docs/branding/VISUAL_IDENTITY.md`. All 14 title blocks were verified through
  Chrome's rendered-font API. Dashboard headings are 64px Bold 700 with -0.025em tracking.
- Promotional title treatment: measured directly from `MarketingHeroSection.tsx`
  in Chrome. Inter Semibold 600, -0.06em letter spacing, 0.94 line height.
  The intro, Settings promotional copy, and CTA now match this website recipe.
  The previously preferred ownership statement retains its typography.
- Product screens: provider-free demo captures from 2026-09-05 at 1440 × 960 CSS
  pixels, 3× density, lossless PNG. No real household was captured.
- Native component edges and spacing are retained. No added card borders,
  rotation, or continuous floating. Product layers enter briefly and settle.
- Routines and Settings crops include their product padding. All nine views are
  covered; Home receives one scene.
- Advanced features shown use the Home Assistant demo. The final frame states
  that features vary by provider; Homey/openHAB parity is not claimed.
- Source and self-hosting claims follow `README.md` and the AGPL-3.0 license.

Reference requested: https://x.com/chddaniel/status/2095775049475313943/video/1
The saved browser permission blocked inspection. This is an original treatment
based on the user's motion-graphics direction.

## Review usage and production files

The chosen voice was generated on ElevenLabs' free plan. Commercial clearance
is not claimed. Free-plan content is restricted to non-commercial use with
attribution; commercial rights require generation during a paid subscription.
No subscription purchase, external publication, or repository commit occurred.

Working project: `.cache/navet-content/navet-motion-promo/`.

- Composition: `tour-v7/index.html`.
- Review video: `tour-v7/navet-dashboard-tour-v7-1080p.mp4`.
- Captions: `tour-v7/navet-dashboard-tour.srt`.
- Editable project: `navet-dashboard-tour-v7-editable.zip`.
- Voice source and exact take record: inside `tour-v7/`.

Generated binaries remain in ignored local storage. Copy approved deliverables
to durable storage before publication.
