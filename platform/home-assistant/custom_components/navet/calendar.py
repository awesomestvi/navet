"""Read-only calendar of Navet chore occurrences."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .chore_store import ChoreAuthority, _parse_iso
from .const import DOMAIN


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Expose one installation-owned chore calendar."""
    async_add_entities([NavetChoresCalendar(entry.entry_id)])


class NavetChoresCalendar(CalendarEntity):
    """Project due work without creating an entity per chore."""

    _attr_has_entity_name = True
    _attr_name = "Chores"
    _attr_icon = "mdi:calendar-check-outline"

    def __init__(self, entry_id: str) -> None:
        self._attr_unique_id = f"{entry_id}_chores_calendar"
        self._authority: ChoreAuthority | None = None

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next active or upcoming chore."""
        now = dt_util.now()
        events = self._events(now, now + timedelta(days=180))
        return events[0] if events else None

    def _events(self, start: datetime, end: datetime) -> list[CalendarEvent]:
        if self._authority is None:
            return []
        data = self._authority.data
        events: list[CalendarEvent] = []
        for occurrence in data.get("occurrencesById", {}).values():
            if occurrence.get("status") in {"done", "skipped", "missed"}:
                continue
            definition: dict[str, Any] = data.get("definitionsById", {}).get(occurrence.get("definitionId"), {})
            if not definition or definition.get("archivedAt"):
                continue
            begins = _parse_iso(occurrence["scheduledAt"])
            due = _parse_iso(occurrence["dueAt"])
            finishes = max(due, begins + timedelta(minutes=1))
            if finishes <= start or begins >= end:
                continue
            events.append(CalendarEvent(
                start=begins, end=finishes, summary=str(definition.get("title", "Chore")),
                description=str(occurrence.get("status", "available")),
                uid=str(occurrence["id"]),
            ))
        return sorted(events, key=lambda item: (item.start, item.uid or ""))

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        """Return expanded chore occurrences within the requested window."""
        return self._events(start_date, end_date)

    async def async_added_to_hass(self) -> None:
        """Follow the durable authority's revisions."""
        await super().async_added_to_hass()
        authority = self.hass.data.get(DOMAIN, {}).get("chore_authority")
        if not isinstance(authority, ChoreAuthority):
            return
        self._authority = authority

        @callback
        def authority_updated(_document: dict[str, Any]) -> None:
            self.async_write_ha_state()
            self.async_update_event_listeners()

        self.async_on_remove(authority.subscribe(authority_updated))
