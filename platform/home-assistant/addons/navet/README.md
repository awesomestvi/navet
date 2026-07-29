# Navet

Navet is installed and ready to use through Home Assistant. It reuses your Home Assistant session,
so there is no separate Home Assistant URL or access token to enter.

## Open Your Dashboard

1. Select **Start** and wait for the add-on to finish starting.
2. Select **Open Web UI** to open Navet through Home Assistant Ingress.
3. Enable **Show in sidebar** for quicker access next time.
4. Enable **Start on boot** if you want Navet available whenever Home Assistant starts.

Your rooms and devices should appear automatically. From there, arrange the dashboard around the
controls, status, and routines you use most.

Home Assistant provides the add-on with persistent `/data` storage automatically. Navet keeps its
dashboard profile and optional secondary-provider sessions there, so normal add-on restarts and
updates retain them. Home Assistant itself continues to use your current Ingress session.

## If Navet Does Not Open

1. Confirm the add-on status is **Running**.
2. Open the **Log** tab and look for the first error shown during startup.
3. Restart the add-on, then open it with **Open Web UI** or the Home Assistant sidebar.
4. Keep the optional direct port disabled unless you intentionally need standalone-style access.
   Direct access does not reuse the Home Assistant Ingress session.

Still stuck? Read the [Home Assistant guide](https://docs.navet.app/install/home-assistant/) or
[open a GitHub issue](https://github.com/awesomestvi/navet/issues). Include your Navet and Home
Assistant versions, what you were doing, and the smallest set of steps that reproduces the problem.
Remove tokens, private URLs, entity names, and household details from logs and screenshots first.
