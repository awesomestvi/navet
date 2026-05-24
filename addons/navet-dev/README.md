# Navet Dev Home Assistant Add-on

This add-on serves the latest Navet development image through Home Assistant Ingress. It is intended
for testing changes before they are released through the regular `Navet` add-on.

The image is pulled from GitHub Container Registry using the `dev` tag:

```text
ghcr.io/awesomestvi/{arch}-navet-addon:dev
```

Fresh dev images publish on `main` pushes and can also be published by running the **Publish Home
Assistant Add-on** GitHub Actions workflow manually. After publishing, refresh the add-on repository
in Home Assistant and rebuild or reinstall this add-on.

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
