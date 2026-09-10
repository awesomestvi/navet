# Navet

Navet gives your household a calm, room-first dashboard for everyday control across wall panels,
tablets, desktops, and phones.

It runs locally alongside Home Assistant and uses your existing Home Assistant session. There is
no separate Home Assistant URL or access token to enter.

## Open Your Dashboard

1. Select **Start** and wait for the add-on to finish starting.
2. Select **Open Web UI** to open Navet inside Home Assistant.
3. Enable **Show in sidebar** for quicker access next time.
4. Enable **Start on boot** if you want Navet available whenever Home Assistant starts.

Your rooms and devices should appear automatically. Arrange the dashboard around the controls,
status, and routines your household uses most. Navet keeps your dashboard data through normal
add-on restarts and updates.

## If Navet Does Not Open

1. Confirm the add-on status is **Running**.
2. Open the **Log** tab and look for the first error shown during startup.
3. Restart the add-on, then open it with **Open Web UI** or the Home Assistant sidebar.

### Enable a direct address

Direct access is optional and disabled by default. In the add-on's **Network** settings, assign
any available host port to the optional direct Navet web interface, save, and restart Navet. For
example, assigning `8234` makes Navet available at `http://homeassistant.local:8234`.

The direct interface uses its own Home Assistant sign-in. **Open Web UI** and the sidebar continue
to use Home Assistant Ingress and do not require a separate login. Remove the Network port to
disable direct access again.

Still stuck? Read the [Home Assistant guide](https://docs.navet.app/install/home-assistant/) or
[open a GitHub issue](https://github.com/awesomestvi/navet/issues). Include your Navet and Home
Assistant versions, what you were doing, and the smallest set of steps that reproduces the problem.
Remove tokens, private URLs, entity names, and household details from logs and screenshots first.
