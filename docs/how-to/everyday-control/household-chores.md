---
title: Share and complete household chores
description: Add people, schedule recurring chores, and work through the Today list from any shared Navet screen.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/household-chores.md
---

Open **Household** to keep ordinary home work beside the routines that already run your smart
home.

Native chores are currently available in the Home Assistant add-on and in standalone Navet when it
is paired with a trusted Home Assistant installation. The Home Assistant custom panel does not have
the shared file store required by this feature.

## Add the people at home

1. Open **Household**.
2. Choose **Add person**.
3. Enter a name.
4. Turn on **Can manage and approve chores** for a household organizer.
5. Choose **Add person**.

These are lightweight household profiles used for assignment and attribution. Choosing a profile on
a shared screen is not an account sign-in or a security boundary.

## Add a chore

1. Open the **Chores** tab.
2. Choose **Add chore**.
3. Name the work and choose an assignment:
   - **One person** assigns every occurrence to the selected person.
   - **Anyone can do it** creates one shared occurrence.
   - **Everyone does it** creates one occurrence per person.
   - **Rotate between people** moves through the active participant list in order.
4. Choose when it repeats and its due time.
5. Optionally require approval when at least one person can approve chores.
6. Choose **Add chore**.

Navet schedules dates in the chore's local time zone, including daylight-saving changes.

## Work through Today

Use **Using this screen** to choose the person currently completing or approving work. The day rail
shows overdue work first, then what is due and what is coming later.

- Choose **Mark done** to complete assigned work.
- Choose **Approve** to finish a chore that requires approval.
- Choose **Send back** when the chore needs to be done again.

Completed work remains in shared activity history. Changes use revision checks, so a screen refreshes
and retries against the newest household list when another screen saves first.

## Pause a chore

Open **Chores** and choose **Pause**. Existing history stays intact, but Navet stops creating new
occurrences. Choose **Resume** when the chore should return.

## Find automations and scripts

Open the **Routines** tab. Provider automations, scenes, and scripts still live here; native chores do
not replace them.
