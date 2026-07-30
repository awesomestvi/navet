---
title: Restore removed entities
description: Add hidden dashboard entities back or restart the first-run dashboard choices.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/restore-entities.md
---

Hiding a provider-backed card removes it from the dashboard presentation; it does not delete the
entity from the provider.

![Entity visibility settings showing a summary of removed entities.](/docs/how-to/dashboards/entity-visibility.webp)

## Add removed entities back

1. Open **Settings → Dashboard**.
2. Find **Entity visibility**.
3. Review the hidden-entity summary.
4. Choose **Add all removed entities**.
5. Confirm **Add all**.

Navet restores eligible automatically generated cards. You can hide individual cards again in Home
edit mode.

## Restart onboarding

Choose **Restart onboarding** when you want to repeat the initial dashboard choices rather than
restore every hidden entity directly.

![The confirmation for restoring entities or restarting onboarding.](/docs/how-to/dashboards/entity-visibility-confirmation.webp)

Restarting onboarding changes the dashboard setup flow; it does not reset provider credentials.

## If one entity still does not appear

Open Add Card and search for it. Generic entity cards may be available even when the entity does
not have a dedicated Navet card.

If it is absent from both places, follow
[Rooms, devices, or entities are missing](/guide/troubleshooting/missing-entities/).
