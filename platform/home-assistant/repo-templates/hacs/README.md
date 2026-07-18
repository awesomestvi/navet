# Navet for Home Assistant

Navet has been downloaded through HACS. Complete the Home Assistant setup once, then open your
dashboard directly from the sidebar.

## Open Your Dashboard

1. Restart Home Assistant after downloading or updating Navet.
2. Go to **Settings -> Devices & services**.
3. Select **Add integration**, search for **Navet**, and confirm the setup.
4. Open **Navet** from the Home Assistant sidebar.

Navet uses your current Home Assistant session, so there is no separate URL, access token, or Navet
account to configure. Your rooms and devices should appear automatically.

## Use Navet Full Screen

Navet can hide the Home Assistant header and sidebar while its dashboard is open. Add the following
to `configuration.yaml`:

```yaml
frontend:
  extra_module_url:
    - /api/navet/static/navet-ha-shell.js
```

Restart Home Assistant after saving the change. The module is served locally by the Navet
integration.

## If Navet Does Not Appear

1. Confirm Home Assistant was restarted after the HACS download.
2. Check that **Navet** appears under **Settings -> Devices & services**.
3. If it is missing, add the integration manually and confirm the empty setup form.
4. Hard-refresh your browser if the sidebar still shows an older panel bundle.

Still stuck? Read the [Home Assistant guide](https://docs.navet.app/install/home-assistant/) or
[open a GitHub issue](https://github.com/awesomestvi/navet/issues). Include your Navet and Home
Assistant versions, the exact action that failed, and clear reproduction steps. Remove tokens,
private URLs, entity names, and household details from logs and screenshots first.
