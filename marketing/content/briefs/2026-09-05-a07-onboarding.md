# A07 — Onboarding: from login to your first Home

Status: **User approved and published publicly to Navet YouTube on 2026-09-05**.
[Watch the walkthrough](https://youtu.be/XEjrLwt5xiQ). Source duration is 6:28; YouTube displays 6:29.
Part of the [Navet tutorial series](2026-09-05-navet-tutorial-series-plan.md).

## Outcome and format

Start with installed standalone Navet, show provider connection and the blank Home Assistant
login form, then complete All entities → language/formats → appearance → welcome → Enter my
dashboard. Explore Kitchen, add the first card to Home, change preferences in Settings, and
restart onboarding. Explain Blank and Import without executing those branches.

The user authorized the connected Home Assistant session and Playwright recording. The final
video uses continuous footage of the real application, with actual clicks and transitions,
**Dark theme, Orange accent, and no wallpaper**. There is no added explanatory sidebar or
browser chrome; Navet's own navigation remains available throughout the dashboard demonstration.

Master: 1920 × 1080 H.264, 30 fps, AAC 48 kHz; fresh synthetic Juniper narration, 12 chapters,
and 104 optional English caption cues. The voice retains its original speed and pitch. No music
bed. Technical decode and visual checkpoint checks passed. The user accepted the pilot and
authorized publication. The previous 3:19 screenshot review is superseded.

## Deliverables

- [Live narrated MP4](../../../.cache/navet-content/tutorial-series/a07-onboarding/navet-onboarding-walkthrough-1080p.mp4)
- [Captions](../../../.cache/navet-content/tutorial-series/a07-onboarding/navet-onboarding-walkthrough.srt)
- [Script and measured chapter timings](../../../.cache/navet-content/tutorial-series/a07-onboarding/script.md)
- [Shot list and checklist](../../../.cache/navet-content/tutorial-series/a07-onboarding/shot-list.md)
- [Implementation and connected evidence](../../../.cache/navet-content/tutorial-series/a07-onboarding/evidence.md)
- [Validation](../../../.cache/navet-content/tutorial-series/a07-onboarding/validation.txt)
- [Editable-source instructions](../../../.cache/navet-content/tutorial-series/a07-onboarding/README.md)

These workspace links follow the [content storage policy](../README.md). Keep private capture
runtime state out of media packages; move approved deliverables to durable media storage.
Public YouTube publication and metadata are recorded in
[the publication record](../published/2026-09-05-a07-onboarding/youtube.json).

## Verified scope and corrected guidance

Navet 0.15.8, checkout c70dcb2d. First enrollment, Home Assistant sign-in, all-entities onboarding,
formats/appearance, welcome, room navigation, Add Card, restart, and reload were exercised.
Dark/Orange, 24-hour/Celsius, completion, and the new Home card persisted after reload.
No household device control was actuated. The existing localhost:5200 installation was preserved;
the capture runtime uses localhost:5201 and separate installation state.

- All entities makes room entities visible; Home has an independently composed layout.
- Continue to my dashboard leads to a welcome screen with **Enter my dashboard**.
- Onboarding shows language buttons; the later Localization settings use a language combobox.
- Restart reopens setup while retaining the provider connection and existing layout.
- A new localhost port alone retains installation state when it uses the same working directory.
- A token HTTP failure can show the generic reachability message; it does not prove a network outage.
- Load or reload a first-enrollment URL so its pairing fragment can be consumed.
- Onboarding offers manual themes and built-in wallpapers; Settings adds Auto and upload/removal.
- YAML import applies directly and bypasses formats/theme; source-verified, not performed here.
- Blank clears Home/custom cards and hides entities on completion; not performed here.

Updated the quick-start, Add Card, restart, Appearance, backup, connection troubleshooting, and
Home Assistant setup guides where they disagreed with current behavior. The docs build passed.
No product or translation code changed.

## Checklist

- [x] Cross-check current implementation and rehearse the connected workflow.
- [x] Reconcile affected docs, script, and shot list with supported behavior.
- [x] Record continuous viewport footage in Dark theme with Orange accent.
- [x] Show login without recording credential entry.
- [x] Demonstrate onboarding, room navigation, first Home card, Settings, and restart.
- [x] Confirm completion, preferences, and Home card after reload.
- [x] Produce fresh Juniper narration, aligned captions, and the 6:28 edit.
- [x] Decode the export, inspect chapter checkpoints, and correct the closing take.
- [x] Receive user acceptance of the pilot and authorization to publish.
- [x] Publish publicly on Navet YouTube with captions, chapters, and thumbnail; record the URL.
- [ ] Archive editable source media separately from the local cache.

Next lesson: **B01 — Set up a dashboard from start to finish**.
