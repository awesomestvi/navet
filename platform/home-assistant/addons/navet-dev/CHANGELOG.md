# Changelog

## 0.17.3-beta.1

## Improvements and bug fixes

- Expose the startup and session-recovery screen as the main app content.
- Expose a main landmark while the authenticated dashboard connects.
- Browser Zoom choices now persist on this device after a reload.
- Confirmation alerts now appear as centered dialogs on phones and larger screens instead of phone cover sheets.
- Climate now shows environmental readings from devices that also have controls, such as air purifiers and thermostats.
- Thermostat cards show the target temperature while idle or off, so setpoint changes stay visible.
- Climate and humidifier knobs no longer show a solid glow shape on low-effects devices.
- Climate, Media, and Security grouping controls use a compact icon menu, leaving more room for section tabs.
- Name the dashboard section editor, show keyboard focus, and translate the skip link.
- Keep dashboard card grids within narrow screen widths.
- Expose a main landmark for each authenticated dashboard section.
- Add a keyboard shortcut to skip dashboard navigation and reach its content.
- Give dashboard dialogs one accessible title and a semantic visible heading.
- Improve contrast of the Energy source link in light mode.
- Keep keyboard and screen-reader focus on the error screen while recovery is needed.
- Keep dashboard views tied to a chosen provider steady when the current provider changes.
- Reuse entity alias lookups across dashboard card updates.
- Avoid duplicate Home dashboard collection work while editing sections.
- Reuse one lookup for stored dashboard icon names and components.
- Keep chore date and time fields inside the editor on iPhone Safari.
- Make mobile dashboard scroll areas keyboard accessible and restore main landmarks in Household and Settings.
- Reduced app distribution size by excluding documentation-only screenshots from runtime builds.
- Load a smaller Homey logo in sign-in and provider settings.
- Fixed mobile dashboard cards, media controls, chore fields, and the browser zoom preference in Safari.
- Give Security controls and activity scrolling useful screen reader roles while keeping media sliders correctly named.
- Limit dashboard chore updates to the active room view.
- Avoid room placement updates in disabled device collections.
- Keep closed notification panels from doing dashboard work and expose the bell state.
- Improve text contrast on accent-colored actions and navigation.
- Keep unrelated dashboard sections steady when room groups change while preserving kiosk navigation.
- Keep invalid article URLs out of RSS card links in every card size.
- Reduce the app stylesheet by generating marketing-only styles for the website alone.

## Security

- Reject malformed relative image paths that could resolve to another host.

## 0.17.2-beta.4

## Improvements and bug fixes

- Fixed the Home security summary badge counting ordinary open covers, such as blinds, as security warnings.
- Verified release notes across distribution channels and kept public changelogs readable when release information cannot be refreshed.

## 0.17.2-beta.3

## Improvements and bug fixes

- Fixed the Home security summary badge counting ordinary open covers, such as blinds, as security warnings.
- Verified release notes across distribution channels and kept public changelogs readable when release information cannot be refreshed.

## In Progress

- Current Navet Dev scope since `v0.17.1`.
- Align cover security badges (#179)
- Improve agent approval and communication (#178)
- Simplify contribution workflow (#177)
- Queue work without public bot prompts (#176)
- Add agentic development control plane (#175)
