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

- `hass_url`: Optional Home Assistant URL to prefill at runtime
- `token`: Optional long-lived access token to prefill at runtime
- `dashboard_config_url`: Optional Navet dashboard YAML export to import on first launch in a fresh browser

If connection values are not provided, Navet falls back to manual setup in the UI.
