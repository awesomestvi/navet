# Navet Dev

> **Development channel:** Navet Dev contains unreleased changes and may be less stable than Navet.
> Use it to test upcoming features, not as the only dashboard your household depends on.

Navet Dev runs through Home Assistant Ingress and reuses your Home Assistant session. There is no
separate Home Assistant URL or access token to enter.

## Start Testing

1. Select **Start** and wait for the add-on to finish starting.
2. Select **Open Web UI** to open Navet Dev.
3. Enable **Show in sidebar** if you plan to test it regularly.
4. Before an important update, export any dashboard configuration you want to keep.

Stable Navet and Navet Dev may use different storage. Do not assume changes made in one channel
will appear in the other.

## When Something Breaks

1. Confirm the add-on status is **Running**.
2. Open the **Log** tab and capture the first relevant error.
3. Restart the add-on and repeat the action once.
4. Check whether the same action works in stable Navet. This helps separate a regression from a
   configuration problem.

[Open a GitHub issue](https://github.com/awesomestvi/navet/issues) with the Navet Dev version, your
Home Assistant version, the exact action that failed, and clear reproduction steps. Remove tokens,
private URLs, entity names, and household details from logs and screenshots first.

## Return to Stable

1. Export any dashboard configuration you need from Navet Dev.
2. Stop Navet Dev.
3. Start or install the stable **Navet** add-on.
4. Verify its configuration, then open its Web UI.

For update behavior, channel details, and advanced troubleshooting, see the
[Navet Dev guide](https://docs.navet.app/install/navet-dev/).
