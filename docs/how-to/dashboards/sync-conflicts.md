---
title: Resolve a dashboard synchronization conflict
description: Choose between local and remote changes, then restore a revision if needed.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/sync-conflicts.md
---

A conflict means the shared profile changed elsewhere while the current device had a different
local version. It is not usually a sign that the profile is corrupted.

![Connected devices showing that dashboard synchronization needs attention.](/docs/how-to/troubleshooting/sync-conflict.webp)

## Choose which version to keep

- Choose **Keep mine** when the current device contains the changes you want to save.
- Choose the remote or reload action when the other device's saved version should replace the
  current local state.

Make the decision on one device first. Avoid continuing to edit both versions.

## Check the result

1. Wait for the status to return to **Synced**.
2. Reload the other registered device.
3. Confirm that both show the expected dashboard.

## Restore an earlier version

If the wrong version was kept:

1. Open **Settings → System → Connected devices**.
2. Choose **Revision history**.
3. Find the revision created before the conflict.
4. Choose **Restore** and confirm.

## If the notice returns repeatedly

- Confirm that both devices can reach the Navet profile endpoint.
- Stop editing on the older or offline device.
- Reload it after the chosen version has synchronized.
- Remove an abandoned device record only when that browser is no longer used.
