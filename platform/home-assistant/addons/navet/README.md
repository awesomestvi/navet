# Navet

Navet is installed and ready to use through Home Assistant. It reuses your Home Assistant session,
so there is no separate Home Assistant URL or access token to enter.

## Open Your Dashboard

1. Select **Start** and wait for the add-on to finish starting.
2. Select **Open Web UI** to open Navet inside Home Assistant.
3. Enable **Show in sidebar** for quicker access next time.
4. Enable **Start on boot** if you want Navet available whenever Home Assistant starts.

Your rooms and devices should appear automatically. From there, arrange the dashboard around the
controls, status, and routines you use most.

Home Assistant saves Navet's data automatically. Normal add-on restarts and updates keep your
dashboard. Navet also uses your current Home Assistant sign-in.

## If Navet Does Not Open

1. Confirm the add-on status is **Running**.
2. Open the **Log** tab and look for the first error shown during startup.
3. Restart the add-on, then open it with **Open Web UI** or the Home Assistant sidebar.

### A direct address shows 403 Forbidden

The add-on opens through Home Assistant Ingress only. A direct address such as
`http://homeassistant.local:8234` cannot reuse your Home Assistant session and is blocked.

1. Update the add-on if an older version still offers a network port setting, and remove any
   manually configured port mapping.
2. Open Navet with **Open Web UI** or the Home Assistant sidebar.
3. Replace any bookmark pointing to the direct port with the Home Assistant page you just opened.

For a separate dashboard URL, use
[standalone Docker](https://docs.navet.app/install/home-assistant/#option-3-install-with-docker),
which supports its own Home Assistant sign-in.

Still stuck? Read the [Home Assistant guide](https://docs.navet.app/install/home-assistant/) or
[open a GitHub issue](https://github.com/awesomestvi/navet/issues). Include your Navet and Home
Assistant versions, what you were doing, and the smallest set of steps that reproduces the problem.
Remove tokens, private URLs, entity names, and household details from logs and screenshots first.
