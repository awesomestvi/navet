---
title: Rooms, devices, or entities are missing
description: Check filters, visibility, provider selection, room assignment, and capability support.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/troubleshooting/missing-entities.md
---

Work from the provider toward the dashboard. Recreating a missing entity as a widget can hide the
real connection or visibility problem.

![A missing-device checklist from provider connection to dashboard placement.](/docs/how-to/troubleshooting/missing-entity-checklist.webp)

## 1. Confirm the provider

Open **Settings → System → Providers** and confirm that the owning provider is connected and
selected. Make it active if the missing feature requires a single active provider.

## 2. Clear navigation and search filters

Return to **All rooms**, clear search, and open the section that normally owns the entity.

## 3. Check room assignment

Open the Rooms workspace and inspect:

- The expected room.
- **Not in a room**.
- **Hidden** devices.

Move or show the device if needed.

## 4. Check entity visibility

Open **Settings → Dashboard → Entity visibility**. Restore removed entities, or search the Add
Card library for a generic entity card.

![Entity visibility and Add Card search used to restore an entity.](/docs/how-to/troubleshooting/restore-missing-entity.webp)

## 5. Check provider capability

An entity can exist while an advanced Navet section is unavailable. Homey and openHAB do not
currently supply all Home Assistant feature services.

## If state is stale

Reload once and check provider connection status. Persistent stale state belongs in a support
report with the provider, entity ID, Navet version, installation mode, and visible error.
