# Navet Home Assistant Add-on

This add-on serves the Navet frontend through Home Assistant Ingress.

The Home Assistant add-on now pulls a prebuilt container image from GitHub Container Registry instead of relying on committed frontend build artifacts in `addons/navet/www/`.

The image is built from the repository root in CI, which allows the add-on image to compile the frontend directly from source while still keeping the add-on metadata in `addons/navet/`.

## Configuration

- `hass_url`: Optional Home Assistant URL to prefill at runtime
- `token`: Optional long-lived access token to prefill at runtime

If these values are not provided, Navet falls back to manual setup in the UI.
