---
title: Use Local Habits
description: Enable the experimental habits feature and review safe suggested routines.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/local-habits.md
---

Local Habits is experimental. It observes supported local interaction patterns and can suggest
bounded routines without sending household activity to a Navet-operated cloud.

![Experimental settings with Local Habits available.](/docs/how-to/everyday-control/local-habits-enable.webp)

## Enable the feature

1. Open **Settings → Experimental**.
2. Enable **Local habits**.
3. Open the new **Habits** settings tab.

## Review a suggestion

The Habits page summarizes observations and suggestions. Review the proposed trigger and action
before creating a routine.

When provider automation creation is supported, Navet asks the provider to create the routine.
Otherwise it can retain the supported local rule.

## Safety boundary

Locks, alarms, cameras, garage-like controls, and similar risky actions are blocked from v1
suggestion and rule creation.

## Turn it off

Return to **Settings → Experimental** and disable Local Habits. Existing provider automations are
not silently deleted.
