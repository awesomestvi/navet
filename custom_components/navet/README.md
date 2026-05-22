# Navet Home Assistant Panel

This custom integration registers Navet as a native Home Assistant sidebar panel.

## Install with HACS

1. Add `https://github.com/awesomestvi/navet` as a HACS custom repository with category
   **Integration**.
2. Download **Navet** from HACS.
3. Restart Home Assistant.
4. Add **Navet** from **Settings -> Devices & services -> Add integration**.
5. Open **Navet** from the Home Assistant sidebar.

The integration registers the `/navet` panel, serves the bundled frontend from
`/api/navet/static/`, and loads `navet-panel.js` as a Home Assistant custom panel module.
The panel uses the current Home Assistant frontend session and does not ask for a separate Navet
URL or token.

## Development

Build the panel bundle from the repository root before packaging or installing:

```bash
pnpm build:ha-panel
```

The build writes static assets to `custom_components/navet/frontend/`. Home Assistant serves them
from `/api/navet/static/` and loads `navet-panel.js` as the panel module.
