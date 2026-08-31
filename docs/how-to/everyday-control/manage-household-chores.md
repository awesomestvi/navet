---
title: Manage and recover household chores
description: Edit recurring work, review progress, protect management, and back up or restore the shared chores workspace.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/manage-household-chores.md
---

Use the management views when the household plan changes. Daily completion stays in **Today** so
setup and recovery controls do not compete with work that needs attention.

![The Chore library with one-row filters and ChoreBaseCard rows showing room, schedule, points, assignee, Edit, and more actions.](/docs/how-to/everyday-control/household-chore-library.webp)

## Edit, pause, or archive a chore

1. Open **Household → Chores**.
2. Search by name or filter by room, person, schedule, or status.
3. Choose **Edit** on the chore card.
4. Update its title, Lucide icon, card colour, instructions, room, time, points, assignment,
   schedule, missed-work behavior, approval, or reminders.
5. Choose **Save changes**.

The card colour is automatic unless someone overrides it. Automatic colours are stable from the
chore ID and are not based on the selected dashboard accent. Overdue red and completed green remain
semantic and cannot be replaced by the custom colour.

Open the card's **More actions** menu, then choose **Pause** to stop creating new occurrences while
keeping the chore and its history. Choose **Archive** when the definition should leave the active
library; archived chores can be restored later. Deleting a chore stops future reminders but
preserves completed history.

## Review progress without ranking people

1. Open **Progress**.
2. Choose the last 7 or 30 days.
3. Filter to one person when you need their activity only.
4. Review completed and missed work, the upcoming week, and the workload note.
5. Export CSV or JSON when you need a copy of the filtered history.

An uneven-workload note is a suggestion. Navet does not silently reassign future chores.

## Manage missions and rewards

Open **Missions** or **Rewards** to create and edit supporting goals. Their cards follow the same
chore card geometry, but they do not appear in Today by default. From Today, choose **See rewards**
in House pulse when you want to reveal the current mission and reward cards for that visit.

## Hide household chores

Chores are enabled by default. To hide the feature, open **Settings → Dashboard**, find
**Household chores**, and choose **Off**. Navet removes the Household chores workspace, Home and
room summary pills, and pending chore cards from room dashboards. Your chore definitions and
history stay saved, so choosing **On** later restores the feature with its existing data.

## Protect management changes

Open **Settings** and configure a management PIN when a shared wall screen should allow completion
but not planning changes. The PIN protects people, definitions, motivation, retention, restore, and
reset actions. It is a household-screen boundary, not an account password, and it is not included
in chores backups.

## Finish setup after a management PIN error

If **Open Today** reports **Unlock chore management to continue**, the PIN was saved but the
temporary management session was lost before setup finished. The people, chores, and rewards
already entered are still saved.

1. Keep the setup window open. If it was closed, return to **Household**, choose
   **Create your chore list**, and advance to the final review.
2. Choose **Open Today**. Navet opens **Unlock chore management** when the saved PIN is locked.
3. Enter the management PIN created during setup and choose **Unlock**.
4. Navet retries the final setup step automatically and opens **Today** when it succeeds.

If the PIN is rejected, check the digits and wait 30 seconds after five unsuccessful attempts. If
the unlock succeeds but the same sync error returns, restart the Navet add-on, reopen its
**Web UI**, and repeat the steps above. Restarting does not remove the saved chore workspace.

## Restore a backup during first setup

If this is a new Navet installation and you already have a Navet chores backup, you do not need to
repeat the guided setup.

1. Open **Household**.
2. On the welcome screen, choose **Import backup**.
3. Select the saved Navet chores JSON file.
4. Review the confirmation and choose **Import backup**.

Navet validates the backup before replacing the empty workspace. The backup must contain an active
household manager. A completed backup opens the restored household directly; an incomplete backup
returns to the appropriate setup state.

## Download a backup

1. Open **Household → Settings**.
2. Choose **Data and recovery**.
3. Choose **Download backup**.
4. Store the downloaded `navet.chores` file somewhere protected.

![Chore settings open to Data and recovery with Download backup, Import backup, and Reset chores controls.](/docs/how-to/everyday-control/household-data-recovery.webp)

## Restore a backup

1. In **Data and recovery**, choose **Import backup**.
2. Select a Navet chores backup, a supported Home Assistant todo export, or a normalized ChoreOps
   export.
3. Choose **Merge** to keep current chores and remap conflicts, or **Replace** to remove the current
   workspace first.
4. Review the confirmation before restoring.

Download a fresh backup before using **Replace** if the current household may be needed later.

## Recover damaged chore data

If Navet cannot read the current workspace, it leaves the saved file unchanged and shows **Chores
need attention**.

1. Choose **Try again** after checking that the installation storage is writable.
2. Choose **Repair chores** when a healthy last-known-good copy is available.
3. Use **Start over** only when neither copy can be recovered and the existing data is no longer
   needed.

Starting over requires explicit confirmation and preserves the damaged primary file for diagnosis
before an empty workspace is created.
