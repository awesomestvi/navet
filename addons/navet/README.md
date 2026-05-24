# Navet Home Assistant Add-on

This add-on serves the Navet frontend through Home Assistant Ingress.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fawesomestvi%2Fnavet)

The Home Assistant add-on pulls a prebuilt container image from GitHub Container Registry instead
of relying on checked-in frontend assets inside the add-on directory.

The image is built from the repository root in CI, which allows the add-on image to compile the frontend directly from source while still keeping the add-on metadata in `addons/navet/`.

## Configuration

- `dashboard_config_url`: Optional Navet dashboard YAML export to import on first launch in a fresh browser

When opened through Home Assistant Ingress, Navet uses the existing Home Assistant frontend session.
No Home Assistant URL or manual token is configured in the add-on.

Returning users: the old add-on `hass_url` and `token` options are ignored. They may remain in an
installed add-on's stored options during upgrade so Home Assistant can still validate the config, but
Navet does not use them. If you open Navet from the Home Assistant sidebar, you should not see a
separate Navet login screen. If you open the optional direct port instead, Navet is outside Ingress
and will ask you to sign in with Home Assistant OAuth. The direct host port is disabled by default to
avoid add-on start conflicts.

Dashboard layout changes are saved to the add-on data directory and shared with other browsers that
open the same Navet instance.
