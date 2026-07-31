---
title: Back up and restore Navet configuration
description: Export a local backup, import it later, or restore a server-backed profile revision.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/backup-and-restore.md
---

Use a local export before a large layout change. Use revision history when a server-backed profile
already contains the earlier state you need.

![Local config backup with Export config and Import config.](/docs/how-to/dashboards/backup-controls.webp)

## Export a backup

1. Open **Settings → Dashboard**.
2. Find **Local config backup**.
3. Choose **Export config**.
4. Store the downloaded file somewhere you control.

The export contains dashboard configuration. It is not a backup of your smart-home provider.

## Import a backup

1. Return to **Local config backup**.
2. Choose **Import config**.
3. Select a Navet configuration export.
4. Review the confirmation.
5. Import the file and allow the dashboard to refresh.

Import can replace current local configuration. Export the current state first if you may want it
back.

## Restore a revision

On installations with server-backed profile history:

1. Open **Settings → System → Connected devices**.
2. Choose **Revision history**.
3. Find the revision by time and device name.
4. Choose **Restore**.
5. Review the revision number and confirm.

Restoring creates a new current revision based on the earlier snapshot; it does not silently erase
the audit trail.

## If restore reports a newer revision

Reload revision history before trying again. Another device changed the profile after you opened
the list.
