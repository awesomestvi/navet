# Navet Home Assistant Panel

This custom integration registers Navet as a Home Assistant sidebar panel.
This directory is the canonical monorepo source exported to `awesomestvi/navet-home-assistant`.
The generated `frontend/` bundle is assembled during export and is tracked only in the published
HACS repository, not in this monorepo.

## Install With HACS

1. Add `https://github.com/awesomestvi/navet-home-assistant` as a HACS custom repository with
   category `Integration`.
2. Download `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Open Navet from the Home Assistant sidebar.

## Already Installed From `navet-hacs`?

No action is required. The repository was renamed from `awesomestvi/navet-hacs` to
`awesomestvi/navet-home-assistant`, and GitHub redirects the old address.

If HACS cannot fetch an update, remove only the old custom repository entry, add
`https://github.com/awesomestvi/navet-home-assistant` as an `Integration` repository, then
redownload Navet and restart Home Assistant. Keep the Navet integration installed; you do not need
to clear your dashboard configuration.

## Current Behavior

- registers the `/navet` panel
- serves bundled assets from `/api/navet/static/`
- loads `navet-panel.js`
- also exposes `navet-ha-shell.js` for `frontend.extra_module_url` host-shell integration
- uses the current Home Assistant frontend session
- does not prompt for a separate Navet login

## Development

Generate the publishable HACS repository payload from the repo root with:

```bash
pnpm sync:hacs
```

That command builds the current panel bundle first, then exports the publishable HACS payload into
`../navet-hacs` for local review.
