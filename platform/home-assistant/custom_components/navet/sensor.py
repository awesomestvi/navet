"""Chore summary projection for Home Assistant automations."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import CHORE_PROJECTION_EVENT, DOMAIN


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the deliberately small Navet chore projection."""
    async_add_entities([NavetChoresSensor(entry.entry_id)])


class NavetChoresSensor(SensorEntity):
    """Expose one summary entity backed by rich provider-neutral attributes."""

    _attr_has_entity_name = True
    _attr_icon = "mdi:clipboard-check-outline"
    _attr_name = "Chores"

    def __init__(self, entry_id: str) -> None:
        self._attr_unique_id = f"{entry_id}_chores"
        self._snapshot: dict[str, Any] = {
            "state": "idle",
            "counts": {
                "dueNow": 0,
                "overdue": 0,
                "awaitingApproval": 0,
                "completedToday": 0,
            },
            "next": [],
        }

    @property
    def native_value(self) -> str:
        """Return the highest-priority household chore state."""
        return str(self._snapshot.get("state", "idle"))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return bounded summary details for templates and automations."""
        counts = self._snapshot.get("counts")
        return {
            "contract_version": self._snapshot.get("contractVersion", 1),
            "generated_at": self._snapshot.get("generatedAt"),
            "revision": self._snapshot.get("revision"),
            "counts": counts if isinstance(counts, dict) else {},
            "next": self._snapshot.get("next", [])[:10]
            if isinstance(self._snapshot.get("next"), list)
            else [],
        }

    async def async_added_to_hass(self) -> None:
        """Subscribe to projection updates from Navet."""
        await super().async_added_to_hass()

        @callback
        def async_projection_received(event: Event) -> None:
            if not isinstance(event.data, dict) or event.data.get("contractVersion") != 1:
                return
            self._snapshot = dict(event.data)
            self.async_write_ha_state()

        self.async_on_remove(
            self.hass.bus.async_listen(CHORE_PROJECTION_EVENT, async_projection_received)
        )
