# Navet Home Assistant Add-on

This add-on serves the Navet frontend through Home Assistant Ingress.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fawesomestvi%2Fnavet)

The Home Assistant add-on pulls a prebuilt container image from GitHub Container Registry instead
of relying on checked-in frontend assets inside the add-on directory.

The image is built from the repository root in CI, which allows the add-on image to compile the frontend directly from source while still keeping the add-on metadata in `addons/navet/`.

## Configuration

- `hass_url`: Optional Home Assistant URL to prefill at runtime
- `token`: Optional long-lived access token to prefill at runtime
- `dashboard_config_url`: Optional Navet dashboard YAML export to import on first launch in a fresh browser

If connection values are not provided, Navet falls back to manual setup in the UI.
Home Assistant credentials entered in one browser and dashboard layout changes are saved to the
add-on data directory and shared with other browsers that open the same Navet instance.
