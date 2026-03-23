# Navet Home Assistant Add-on

This add-on serves the Navet frontend through Home Assistant Ingress.

The add-on now builds from a self-contained `addons/navet/` context. The frontend assets are served from `addons/navet/www/`, which should be refreshed from the repo `dist/` output when preparing an add-on update.

## Configuration

- `hass_url`: Optional Home Assistant URL to prefill at runtime
- `token`: Optional long-lived access token to prefill at runtime

If these values are not provided, Navet falls back to manual setup in the UI.
