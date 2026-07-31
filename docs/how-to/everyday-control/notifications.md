---
title: Use notifications and provider actions
description: Review attention items, hide or clear notifications, and use supported update actions.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/notifications.md
---

Navet combines supported provider notifications into an attention surface. Available actions
depend on the provider service that produced the item.

![The notification surface showing that there are no current attention items.](/docs/how-to/everyday-control/notifications.webp)

## Review an item

1. Open the notification indicator.
2. Select an item to read its details.
3. Use **View changes** or another provided action when available.

## Hide or clear items

- **Hide** removes one item from the current surface.
- The clear-all action removes all current notifications after confirmation.

Clearing in Navet does not necessarily erase an independent alert history maintained by the
provider.

## Use update or restart actions

When the active provider registers administration services, an update or restart action can appear
on the relevant notification. Review the target and provider before confirming.

## If no notifications appear

An empty state can mean that there is nothing requiring attention or that the connected provider
does not supply notification services. Check the [capability matrix](/integrations/).
