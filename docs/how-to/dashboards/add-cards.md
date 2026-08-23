---
title: Add cards, devices, and widgets
description: Find provider entities and Navet widgets, choose placement, and configure a new card.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/add-cards.md
---

The Add Card library combines provider-backed entities with Navet-owned widgets. It excludes cards
already present in the target area where duplicates would not be useful.

![The Add Card phone cover sheet with All cards, Custom card, search, filters, and available entities.](/docs/how-to/dashboards/add-card-library.webp)

## Open Add Card

1. Open the target dashboard and room.
2. Enter edit mode.
3. Choose **Add card**.

## Find what you need

- Use **All cards** for devices and other normalized provider entities.
- Use **Custom card** for Navet content such as notes, RSS, photos, actions, maps, battery summaries,
  UPS status, and energy summaries.
- Search by the visible device or room name.
- Use an explicit native identifier when you need to find one exact provider entity.

![The Add Card phone cover sheet filtered to a matching Kitchen entity.](/docs/how-to/dashboards/add-card-search.webp)

On phones, Add Card opens as a full-height cover sheet with its own close action. On larger
screens, the same library keeps the navigation and results visible side by side.

Generic entity cards are available when Navet recognizes an entity but has no richer dedicated
card for it.

## Configure the card

Depending on the card type, choose:

- The room or Home overview where it belongs.
- A supported size.
- A display name or icon.
- Widget-specific content, source, or action.

Choose the add or save action. Navet places the card in the target area.

![A newly added card highlighted on Home.](/docs/how-to/dashboards/add-card-result.webp)

## If the entity is not listed

1. Clear the search.
2. Confirm that its provider is connected and selected.
3. Check **Settings → Dashboard → Entity visibility**.
4. Review [Rooms, devices, or entities are missing](/guide/troubleshooting/missing-entities/).

## Related guides

- [Add notes, photos, and RSS feeds](/guide/everyday-control/notes-photos-rss/)
- [Create actions, maps, and status widgets](/guide/everyday-control/actions-maps-status/)
- [Widget reference](/guide/widgets/)
