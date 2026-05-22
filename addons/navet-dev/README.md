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

- `hass_url`: Optional Home Assistant URL. Leave blank to enter a browser-reachable Home Assistant
  URL on the Navet login screen.
- `token`: Optional Home Assistant long-lived access token. Set this to open Navet without the login
  form.
- `dashboard_config_url`: Optional Navet dashboard YAML export to import on first launch in a fresh browser

When `hass_url` and `token` are blank, Navet opens the login page with the internal Home Assistant
URL prefilled. Enter a long-lived access token to connect through Ingress.
