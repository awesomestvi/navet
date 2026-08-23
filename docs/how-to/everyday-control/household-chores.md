---
title: Set up and complete household chores
description: Create the household, schedule recurring work, and use the Today list from a shared Navet screen.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/household-chores.md
---

Open **Household** to keep ordinary home work beside the routines that already run your smart
home. **Today** leads with overdue and due work, then remaining work and completed chores.

![The current Household Today dashboard with House pulse, needs-attention chores, remaining work, and completed chores.](/docs/how-to/everyday-control/household-today.webp)

Native chores are currently available in the Home Assistant add-on and in standalone Navet when it
is paired with a trusted Home Assistant installation. The Home Assistant custom panel does not have
the shared file store required by this feature.

## Complete the guided setup

1. Open **Household**.
2. Choose **Set up chores**.
3. In **Profile**, add everyone who will be assigned work. At least one person must have the
   **Manager** role.
4. In **Customize**, choose each person's colour, icon or photo, and optional reminder quiet
   hours.
5. In **Chores**, add one or more recurring jobs.
6. In **Rewards**, choose a motivation style. **Off** keeps the experience focused only on work
   and completion.
7. In **Access**, optionally create a management PIN, review the setup, and choose **Finish setup**.

![The Profile step of guided setup with the add-person form and the six setup destinations.](/docs/how-to/everyday-control/household-setup-people.webp)

These are lightweight household profiles used for assignment and attribution. Choosing a profile
on a shared screen is not an account sign-in. The optional management PIN protects planning and
recovery actions without turning profiles into user accounts.

## Add another chore

1. Open **Household → Chores**.
2. Choose **Add chore**.
3. In **Chore name**, add the title and choose a suggested Lucide icon or paste another Lucide icon
   name. Navet previews the icon before you continue. Add optional instructions, room, estimated
   time, points, and a child-friendly title when needed.
4. Leave **Card color** automatic to use the stable colour assigned from the chore ID, or choose a
   custom colour. Overdue and completed state colours still take priority.
5. In **Assignment**, choose who owns the work:
   - **One person** assigns every occurrence to the selected person.
   - **Anyone can do it** creates one shared occurrence.
   - **Everyone does it** creates one occurrence per person.
   - **Rotate between people** moves through the active participant list in order.
6. In **Repeat**, choose once, daily, weekly, bi-weekly, tri-weekly, monthly, or after completion,
   then set the due time and any date limits.
7. In **More options**, configure missed-work behavior or reminders when needed.
8. Choose **Add chore**.

![The first Add a chore step with title, Lucide icon preview, automatic or custom card colour, and instructions.](/docs/how-to/everyday-control/household-add-chore.webp)

Navet schedules dates in the chore's local time zone, including daylight-saving changes.

## Work through Today

Use **Using this screen** to choose the person currently completing or approving work. The Today
list shows **Needs attention** first, followed by remaining work. Completed chores stay
visible as smaller cards, without a time tag, and show the points that were earned.

- Choose **Mark done** to complete assigned work.
- Choose **Claim** first when a shared chore requires someone to take ownership.
- Choose **Approve** to finish a chore that requires approval.
- Choose **Send back** when the chore needs to be done again.

Completed work remains in shared activity history. Changes use revision checks, so a screen refreshes
and retries against the newest household list when another screen saves first.

## Read House pulse and rewards

House pulse keeps the daily summary in one row. When work is overdue, it leads with **Needs
attention**, the overdue count, remaining work, and completed chores. Otherwise it shows earned
points, current streak, and completed chores.
Choose **See rewards** to reveal the supporting mission and reward cards below the banner. They stay
hidden from Today until requested, while **Missions** and **Rewards** remain available as separate
management destinations.

Home shows a Chores summary pill when work remains. Rooms with chores show their own summary, and a
pending chore also appears as a room card. An overdue chore changes the relevant summary pill to the
same restrained red alert treatment used by Security.

## What to do next

- Use **Missions** or **Rewards** only when a shared goal helps the household. Core chores work
  without points.
- Open **Progress** for a weekly review and history export.
- Follow [Manage and recover household chores](/guide/everyday-control/manage-household-chores/)
  to pause work, protect management, or create and restore backups.

## Find automations and scripts

Open the **Routines** tab. Provider automations, scenes, and scripts still live here; native chores
do not replace them.
