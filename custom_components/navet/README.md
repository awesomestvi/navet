# Navet Home Assistant Panel

This custom integration registers Navet as a Home Assistant sidebar panel.

## Install With HACS

1. Add `https://github.com/awesomestvi/navet` as a HACS custom repository with category
   `Integration`.
2. Download `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Open Navet from the Home Assistant sidebar.

## Current Behavior

- registers the `/navet` panel
- serves bundled assets from `/api/navet/static/`
- loads `navet-panel.js`
- uses the current Home Assistant frontend session
- does not prompt for a separate Navet login

## Development

Build the panel bundle from the repo root before packaging or testing:

```bash
pnpm build:ha-panel
```
