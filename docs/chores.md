---
title: Household chores
description: Understand Navet's shared, installation-owned chores workspace.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/chores.md
---

Household chores keeps recurring home work in the same calm, shared interface as the rest of
Navet. The **Today** view answers four questions first: what needs doing, who should do it, when it
is due, and whether it is finished.

![Household Today with the one-row House pulse, overdue and upcoming chore cards, assignees, time, points, and the See rewards action.](/docs/how-to/everyday-control/household-today.webp)

Chores belong to the Navet installation. They are not copied from Home Assistant todo lists, and a
connected provider does not become the source of truth for assignments, schedules, or history.
Home Assistant can optionally receive a compact summary and action requests for automations.

## Where chores are available

Native chores are available in the Home Assistant add-on and in standalone Navet when it is paired
with a trusted Home Assistant installation. The Home Assistant custom panel does not provide the
shared file store required by the chores workspace. Homey-only and openHAB-only installations do
not currently provide that storage authority.

## The Household workspace

- **Today** puts overdue and due work before later chores. The one-row **House pulse** shows earned
  points, streak, completion, and a **See rewards** action without another progress bar.
- **Chores** is the searchable library for creating, editing, pausing, duplicating, and archiving
  recurring work.
- **Missions** and **Rewards** manage optional shared goals without changing the underlying chore
  workflow. Their supporting cards stay out of Today until **See rewards** is opened.
- **Progress** shows contributions and a weekly review without ranking the household.
- **Settings** manages people, motivation style, backups, restore, and recovery.
- **Routines** keeps provider automations, scenes, and scripts available beside native chores.

Chores are enabled by default. **Settings → Dashboard → Household chores** can hide or restore the
feature, its Home summary, and room chore surfaces without deleting chore definitions or history.

## Reading a chore card

The card header keeps the room and timing state above the chore title. Time and points sit together
at the top right; optional instructions use the middle; the assignee and the smaller secondary
**Mark done** action stay in the footer. Overdue work uses a red border and status treatment.
Completed work remains visible in a smaller card with a green earned-points badge and no time tag.

Active chores receive one of twelve stable automatic colour palettes from the chore ID, so a chore
keeps its colour without tying it to the dashboard accent. Choose **Edit → Card color** to override
the automatic colour. Completed and overdue state colours always take priority over that override.

## People and shared screens

A person in Household is a lightweight workflow profile. Profiles make assignment, completion,
approval, reminders, and activity understandable, but selecting a person from **Using this screen**
is not an account sign-in.

Every household keeps at least one manager. Managers can change people and chore definitions,
approve work, manage data, and optionally protect those changes with a management PIN. Ordinary
completion actions remain available on a shared screen after a PIN is configured.

## Assignment and schedules

A chore can belong to one person, be open to anyone, create one occurrence for everyone, or rotate
between selected people. Schedules support one-time, daily, weekly, bi-weekly, tri-weekly,
monthly, and after-completion recurrence. Navet stores the local due time and time zone so the
schedule remains stable through daylight-saving changes.

Optional approval separates “marked done” from final completion. Missed-work rules can skip an
occurrence, carry it forward, or leave it visible for review. Pausing a chore stops new occurrences
without deleting completed history.

## Motivation is optional

Core chores work with motivation turned off. **Light points**, **Family goals**, and
**Child-friendly adventure** add progressively more feedback while keeping assignments and
completion history unchanged. Missions and rewards are supporting surfaces, not prerequisites for
using Today.

Progress cards open an individual points view with the person's current balance and point history.
Balances may be negative when points have been reversed or removed. Household managers can add or
remove points with an optional note after unlocking management; every adjustment remains in the
person's immutable history.

## Data, history, and recovery

Chore changes are shared across authenticated Navet screens connected to the same installation.
Revision checks prevent one screen from silently overwriting a newer household change. Activity
history supports weekly review and JSON or CSV export.

Use **Settings → Data and recovery** to download a complete backup. Restoring with **Merge** keeps
the current workspace and remaps conflicts; **Replace** removes the current workspace before the
backup is restored. A damaged workspace keeps its saved file unchanged while Navet offers retry,
last-known-good recovery, and an explicit start-over path.

## Start using chores

- [Set up and complete household chores](/guide/everyday-control/household-chores/)
- [Manage, back up, and recover household chores](/guide/everyday-control/manage-household-chores/)
