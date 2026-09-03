"""Durable Home Assistant authority for the Navet household chores domain.

The browser is a client of this module in native-panel mode.  The add-on has a
separate NJS authority, so this module deliberately stores only Home Assistant
panel data in Home Assistant's private storage area.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import secrets
from collections.abc import Callable, Mapping
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN

CONTRACT_VERSION = 1
SCHEMA_VERSION = 2
STORE_VERSION = 1
WORKSPACE_KEY = "navet.chores"
LAST_GOOD_KEY = "navet.chores.last_good"
HISTORY_KEY = "navet.chores.history"
JOURNAL_KEY = "navet.chores.journal"
SECURITY_KEY = "navet.chores.security"
MAX_ACTIVITY_ITEMS = 5000
MAX_OUTBOX_ITEMS = 5000
MAX_JOURNAL_ITEMS = 500
MAX_HISTORY_ITEMS = 100_000
MAX_WORKSPACE_BYTES = 2 * 1024 * 1024
MAX_JOURNAL_BYTES = 512 * 1024
MAX_HISTORY_BYTES = 64 * 1024 * 1024
MAX_SECURITY_BYTES = 16 * 1024
RETENTION_DAYS = 90
MATERIALIZATION_DAYS = 45
BACKGROUND_INTERVAL = timedelta(seconds=60)
MANAGEMENT_SESSION_SECONDS = 30 * 60
PIN_PATTERN = set("0123456789")

AUTOMATION_EVENT_TYPES = {
    "occurrence_created",
    "due",
    "overdue",
    "claimed",
    "completed",
    "approved",
    "rejected",
    "skipped",
    "reopened",
    "reassigned",
    "missed",
}

DEFAULT_RETENTION = {"maxAgeDays": 730, "maxEvents": 50_000}


class ChoreAuthorityError(Exception):
    """Expected, user-visible authority error."""

    code = "invalid_request"


class ChoreConflictError(ChoreAuthorityError):
    """The client wrote against an old revision."""

    code = "stale_revision"


class ChoreStorageError(ChoreAuthorityError):
    """The durable workspace cannot currently be read or written."""

    code = "storage_unavailable"


def _now() -> datetime:
    return dt_util.utcnow().replace(tzinfo=timezone.utc)


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _parse_time(value: str) -> tuple[int, int]:
    try:
        hour, minute = value.split(":", 1)
        result = int(hour), int(minute)
    except (AttributeError, ValueError):
        raise ChoreAuthorityError(f"Invalid chore time: {value}") from None
    if not (0 <= result[0] <= 23 and 0 <= result[1] <= 59):
        raise ChoreAuthorityError(f"Invalid chore time: {value}")
    return result


def _parse_iso(value: str) -> datetime:
    if not isinstance(value, str):
        raise ChoreAuthorityError("Invalid chore timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ChoreAuthorityError("Invalid chore timestamp") from None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _zone(value: str) -> ZoneInfo:
    try:
        return ZoneInfo(value or "UTC")
    except ZoneInfoNotFoundError:
        raise ChoreAuthorityError(f"Unsupported chore time zone: {value}") from None


def _empty_data() -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "participantsById": {},
        "definitionsById": {},
        "occurrencesById": {},
        "activity": [],
        "outbox": [],
        "historyRetention": dict(DEFAULT_RETENTION),
        "experience": {
            "version": 1,
            "gamificationMode": "off",
            "presentationByDefinitionId": {},
            "missionsById": {},
            "rewardGoalsById": {},
            "earnedPointsByParticipant": {},
            "householdBonusPoints": 0,
            "awardedMissionIds": [],
        },
    }


def _normalize_data(value: Any) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise ChoreStorageError("Chore workspace data is invalid")
    if value.get("schemaVersion") == 1:
        data = dict(value)
        data["schemaVersion"] = SCHEMA_VERSION
        data["outbox"] = []
        data["historyRetention"] = dict(DEFAULT_RETENTION)
        data["experience"] = _empty_data()["experience"]
        value = data
    if value.get("schemaVersion") != SCHEMA_VERSION:
        raise ChoreStorageError("Unsupported chore workspace schema")
    if (
        not isinstance(value.get("participantsById"), Mapping)
        or not isinstance(value.get("definitionsById"), Mapping)
        or not isinstance(value.get("occurrencesById"), Mapping)
        or not isinstance(value.get("activity"), list)
        or not isinstance(value.get("outbox"), list)
        or len(value["activity"]) > MAX_ACTIVITY_ITEMS
        or len(value["outbox"]) > MAX_OUTBOX_ITEMS
        or any(not _valid_activity(item) for item in value["activity"])
        or any(not _valid_outbox_item(item) for item in value["outbox"])
    ):
        raise ChoreStorageError("Chore workspace data is invalid")
    data = json.loads(json.dumps(value))
    data.setdefault("historyRetention", dict(DEFAULT_RETENTION))
    data.setdefault("experience", _empty_data()["experience"])
    retention = data["historyRetention"]
    if (
        not isinstance(retention, Mapping)
        or not isinstance(retention.get("maxAgeDays"), int)
        or not 30 <= retention["maxAgeDays"] <= 3650
        or not isinstance(retention.get("maxEvents"), int)
        or not 1000 <= retention["maxEvents"] <= 100000
    ):
        raise ChoreStorageError("Chore history retention policy is invalid")
    return data


def _valid_timestamp(value: Any) -> bool:
    try:
        _parse_iso(value)
    except ChoreAuthorityError:
        return False
    return True


def _valid_activity(value: Any) -> bool:
    return (
        isinstance(value, Mapping)
        and isinstance(value.get("commandId"), str)
        and 0 < len(value["commandId"]) <= 200
        and isinstance(value.get("type"), str)
        and _valid_timestamp(value.get("timestamp"))
        and (
            "pointsDelta" not in value
            or (
                isinstance(value["pointsDelta"], int)
                and not isinstance(value["pointsDelta"], bool)
                and abs(value["pointsDelta"]) <= 10_000
            )
        )
        and all(
            key not in value or isinstance(value[key], str)
            for key in (
                "occurrenceId",
                "definitionId",
                "participantId",
                "actorParticipantId",
                "reason",
            )
        )
    )


def _valid_outbox_item(value: Any) -> bool:
    return (
        isinstance(value, Mapping)
        and isinstance(value.get("id"), str)
        and bool(value["id"])
        and isinstance(value.get("activityId"), str)
        and bool(value["activityId"])
        and isinstance(value.get("eventType"), str)
        and value.get("status") in {"pending", "delivered", "failed"}
        and isinstance(value.get("attempts"), int)
        and value["attempts"] >= 0
        and _valid_timestamp(value.get("createdAt"))
        and _valid_timestamp(value.get("nextAttemptAt"))
    )


def _activity(command_id: str, timestamp: str, event_type: str, **fields: Any) -> dict[str, Any]:
    result = {
        "id": f"activity:{command_id}",
        "commandId": command_id,
        "type": event_type,
        "timestamp": timestamp,
    }
    result.update({key: value for key, value in fields.items() if value is not None})
    return result


def _outbox(activity: Mapping[str, Any]) -> dict[str, Any]:
    timestamp = str(activity["timestamp"])
    return {
        "id": f"outbox:{activity['id']}",
        "activityId": activity["id"],
        "eventType": activity["type"],
        "status": "pending",
        "attempts": 0,
        "createdAt": timestamp,
        "nextAttemptAt": timestamp,
        **({key: activity[key] for key in ("occurrenceId", "participantId") if key in activity}),
    }


def _next_delivery_at(
    timestamp: datetime,
    participant: Mapping[str, Any],
    fallback_time_zone: str,
) -> str:
    preferences = participant.get("reminderPreferences") or {}
    quiet_hours = preferences.get("quietHours") or {}
    if not quiet_hours or quiet_hours.get("start") == quiet_hours.get("end"):
        return _iso(timestamp)
    time_zone = str(quiet_hours.get("timeZone") or fallback_time_zone or "UTC")
    local = timestamp.astimezone(_zone(time_zone))
    start_hour, start_minute = _parse_time(str(quiet_hours.get("start")))
    end_hour, end_minute = _parse_time(str(quiet_hours.get("end")))
    current_minutes = local.hour * 60 + local.minute
    start_minutes = start_hour * 60 + start_minute
    end_minutes = end_hour * 60 + end_minute
    crosses_midnight = start_minutes > end_minutes
    inside = (
        current_minutes >= start_minutes or current_minutes < end_minutes
        if crosses_midnight
        else start_minutes <= current_minutes < end_minutes
    )
    if not inside:
        return _iso(timestamp)
    end_date = local.date()
    if crosses_midnight and current_minutes >= start_minutes:
        end_date += timedelta(days=1)
    quiet_end = datetime(
        end_date.year,
        end_date.month,
        end_date.day,
        end_hour,
        end_minute,
        tzinfo=_zone(time_zone),
    )
    return _iso(quiet_end)


def _reminder_outbox(
    definition: Mapping[str, Any],
    occurrence: Mapping[str, Any],
    participant: Mapping[str, Any],
    event_type: str,
    event_key: str,
    timestamp: datetime,
) -> dict[str, Any]:
    preferences = participant.get("reminderPreferences") or {}
    destination = preferences.get("destination") or {}
    return {
        "id": f"outbox:reminder:{event_key}:{participant['id']}",
        "activityId": f"scheduler:{event_key}",
        "eventType": event_type,
        "status": "pending",
        "attempts": 0,
        "createdAt": _iso(timestamp),
        "nextAttemptAt": _next_delivery_at(
            timestamp,
            participant,
            str((definition.get("schedule") or {}).get("timeZone") or "UTC"),
        ),
        "occurrenceId": occurrence["id"],
        "participantId": participant["id"],
        "destination": destination.get("type", "in_app"),
        **(
            {"destinationTarget": destination["target"]}
            if destination.get("target")
            else {}
        ),
    }


def _active_manager(data: Mapping[str, Any], participant_id: str) -> bool:
    participant = data["participantsById"].get(participant_id)
    return bool(
        isinstance(participant, Mapping)
        and not participant.get("pausedAt")
        and "manage" in participant.get("capabilities", [])
    )


def _require_manager(data: Mapping[str, Any], participant_id: str) -> None:
    if not _active_manager(data, participant_id):
        raise ChoreAuthorityError("Only a household manager can change chores and profiles")


def _require_capability(data: Mapping[str, Any], participant_id: str, capability: str) -> Mapping[str, Any]:
    participant = data["participantsById"].get(participant_id)
    if not isinstance(participant, Mapping) or participant.get("pausedAt"):
        raise ChoreAuthorityError("Chore participant is not active")
    if capability not in participant.get("capabilities", []):
        raise ChoreAuthorityError(f"Chore participant cannot {capability} chores")
    return participant


def _occurrence_id(definition_id: str, scheduled_at: str, slot: str) -> str:
    return f"{definition_id}:{scheduled_at}:{slot}"


def _scheduled_at(local_date: date, time_value: str, time_zone: str) -> datetime:
    hour, minute = _parse_time(time_value)
    return datetime(
        local_date.year,
        local_date.month,
        local_date.day,
        hour,
        minute,
        tzinfo=_zone(time_zone),
    ).astimezone(timezone.utc)


def _date_keys(definition: Mapping[str, Any], start: datetime, end: datetime) -> list[date]:
    schedule = definition.get("schedule", {})
    if not isinstance(schedule, Mapping):
        return []
    time_zone = str(schedule.get("timeZone") or "UTC")
    local_start = start.astimezone(_zone(time_zone)).date()
    local_end = end.astimezone(_zone(time_zone)).date()
    frequency = schedule.get("frequency")
    if frequency == "once":
        try:
            candidate = date.fromisoformat(str(schedule["date"]))
        except (KeyError, ValueError):
            return []
        return [candidate] if local_start <= candidate <= local_end else []
    try:
        cursor = date.fromisoformat(str(schedule.get("startDate")))
    except ValueError:
        return []
    end_date = date.fromisoformat(str(schedule["endDate"])) if schedule.get("endDate") else None
    excluded = set(str(item) for item in schedule.get("excludedDates", []))
    result: list[date] = []
    while cursor <= local_end:
        if cursor >= local_start and (end_date is None or cursor <= end_date) and cursor.isoformat() not in excluded:
            days = (cursor - date.fromisoformat(str(schedule.get("startDate")))).days
            weekday = (cursor.weekday() + 1) % 7
            include = False
            if frequency == "daily":
                include = days % max(1, int(schedule.get("intervalDays", 1))) == 0
                days_of_week = schedule.get("daysOfWeek")
                include = include and (not days_of_week or weekday in days_of_week)
            elif frequency == "weekly":
                include = (days // 7) % max(1, int(schedule.get("intervalWeeks", 1))) == 0 and weekday in schedule.get("daysOfWeek", [])
            elif frequency == "monthly":
                nth = schedule.get("nthWeekday")
                if isinstance(nth, Mapping):
                    ordinal = int(nth.get("ordinal", 0))
                    if weekday == int(nth.get("weekday", -1)):
                        if ordinal == -1:
                            include = (cursor + timedelta(days=7)).month != cursor.month
                        else:
                            include = ((cursor.day - 1) // 7) + 1 == ordinal
                else:
                    import calendar

                    include = cursor.day == min(int(schedule.get("dayOfMonth", 1)), calendar.monthrange(cursor.year, cursor.month)[1])
            if include:
                result.append(cursor)
        cursor += timedelta(days=1)
    return result


def _assignment_slots(definition: Mapping[str, Any], data: Mapping[str, Any], index: int) -> list[tuple[str, list[str]]]:
    assignment = definition.get("assignment", {})
    ids = [
        item
        for item in assignment.get("participantIds", [])
        if item in data["participantsById"]
        and not data["participantsById"][item].get("pausedAt")
        and "complete" in data["participantsById"][item].get("capabilities", [])
    ]
    if not ids:
        return []
    mode = assignment.get("mode")
    if mode == "everyone":
        return [(item, [item]) for item in ids]
    if mode == "rotation":
        cursor = max(0, int(assignment.get("rotationCursor", 0)))
        item = ids[(cursor + index) % len(ids)]
        return [(item, [item])]
    if mode == "person":
        return [(ids[0], [ids[0]])]
    return [("shared", ids)]


def _rotation_index_for_date(
    dates: list[date], index: int, reset: str | None
) -> int:
    """Match the core/NJS weekly and monthly rotation reset semantics."""
    if reset not in {"weekly", "monthly"}:
        return index

    def group(candidate: date) -> str:
        if reset == "monthly":
            return candidate.strftime("%Y-%m")
        return (candidate - timedelta(days=candidate.weekday())).isoformat()

    expected = group(dates[index])
    first = index
    while first > 0 and group(dates[first - 1]) == expected:
        first -= 1
    return index - first


def _next_imported_id(source_id: str, occupied: set[str]) -> str:
    if source_id not in occupied:
        return source_id
    index = 2
    while f"{source_id}~import-{index}" in occupied:
        index += 1
    return f"{source_id}~import-{index}"


def _merge_imported_workspace(
    current: Mapping[str, Any],
    current_events: list[dict[str, Any]],
    imported: Mapping[str, Any],
    imported_events: list[dict[str, Any]],
    timestamp: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Merge an interchange document without replacing colliding identities."""
    data = json.loads(json.dumps(current))
    participant_map: dict[str, str] = {}
    occupied_participants = set(data["participantsById"])
    for source in imported["participantsById"].values():
        source_id = str(source["id"])
        if data["participantsById"].get(source_id) == source:
            participant_map[source_id] = source_id
            continue
        target_id = _next_imported_id(source_id, occupied_participants)
        occupied_participants.add(target_id)
        participant_map[source_id] = target_id
        data["participantsById"][target_id] = {
            **json.loads(json.dumps(source)),
            "id": target_id,
            "updatedAt": timestamp,
        }

    definition_map: dict[str, str] = {}
    occupied_definitions = set(data["definitionsById"])
    for source in imported["definitionsById"].values():
        remapped = json.loads(json.dumps(source))
        assignment = remapped.get("assignment", {})
        assignment["participantIds"] = [
            participant_map.get(item, item)
            for item in assignment.get("participantIds", [])
        ]
        overrides = assignment.get("participantScheduleOverrides")
        if isinstance(overrides, Mapping):
            assignment["participantScheduleOverrides"] = {
                participant_map.get(item, item): value
                for item, value in overrides.items()
            }
        approval = remapped.get("approval", {})
        approval["approverIds"] = [
            participant_map.get(item, item)
            for item in approval.get("approverIds", [])
        ]
        remapped["updatedAt"] = timestamp
        source_id = str(source["id"])
        if data["definitionsById"].get(source_id) == remapped:
            definition_map[source_id] = source_id
            continue
        target_id = _next_imported_id(source_id, occupied_definitions)
        occupied_definitions.add(target_id)
        definition_map[source_id] = target_id
        remapped["id"] = target_id
        data["definitionsById"][target_id] = remapped

    occurrence_map: dict[str, str] = {}
    occupied_occurrences = set(data["occurrencesById"])
    imported_occurrences: list[dict[str, Any]] = []
    for source in imported["occurrencesById"].values():
        source_id = str(source["id"])
        target_id = _next_imported_id(source_id, occupied_occurrences)
        occupied_occurrences.add(target_id)
        occurrence_map[source_id] = target_id
        remapped = {
            **json.loads(json.dumps(source)),
            "id": target_id,
            "definitionId": definition_map.get(
                str(source.get("definitionId", "")), source.get("definitionId")
            ),
            "assigneeIds": [
                participant_map.get(item, item)
                for item in source.get("assigneeIds", [])
            ],
            "updatedAt": timestamp,
        }
        for key in ("claimedBy", "completedBy", "approvedBy", "skippedBy"):
            if remapped.get(key):
                remapped[key] = participant_map.get(remapped[key], remapped[key])
        imported_occurrences.append(remapped)
    for occurrence in imported_occurrences:
        for key in ("carriedForwardFrom", "carriedForwardTo"):
            if occurrence.get(key) in occurrence_map:
                occurrence[key] = occurrence_map[occurrence[key]]
        data["occurrencesById"][occurrence["id"]] = occurrence

    events = json.loads(json.dumps(current_events))
    occupied_events = {str(item.get("id", "")) for item in events}
    additions: list[dict[str, Any]] = []
    for source in imported_events:
        remapped = json.loads(json.dumps(source))
        source_id = str(source.get("id", ""))
        remapped["id"] = _next_imported_id(source_id, occupied_events)
        occupied_events.add(remapped["id"])
        remapped["commandId"] = f"import:{source['commandId']}"
        for key, identity_map in (
            ("occurrenceId", occurrence_map),
            ("definitionId", definition_map),
            ("participantId", participant_map),
            ("actorParticipantId", participant_map),
        ):
            if remapped.get(key):
                remapped[key] = identity_map.get(remapped[key], remapped[key])
        for key in ("assigneeIds", "previousAssigneeIds"):
            if isinstance(remapped.get(key), list):
                remapped[key] = [
                    participant_map.get(item, item) for item in remapped[key]
                ]
        additions.append(remapped)
        events.append(remapped)
    data["activity"] = (list(data.get("activity", [])) + additions)[
        -MAX_ACTIVITY_ITEMS:
    ]
    data["outbox"] = list(current.get("outbox", []))
    return data, events


def _materialize(data: dict[str, Any], range_start: str, range_end: str, timestamp: str, command_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    start = _parse_iso(range_start)
    end = _parse_iso(range_end)
    if end < start or end - start > timedelta(days=180):
        raise ChoreAuthorityError("Chore materialization range is invalid")
    occurrences = dict(data["occurrencesById"])
    additions: list[dict[str, Any]] = []
    for definition in data["definitionsById"].values():
        if not definition.get("enabled") or definition.get("archivedAt"):
            continue
        schedule = definition.get("schedule", {})
        if schedule.get("frequency") == "after_completion":
            completed = sorted(
                occurrence["completedAt"]
                for occurrence in occurrences.values()
                if occurrence.get("definitionId") == definition.get("id")
                and isinstance(occurrence.get("completedAt"), str)
            )
            time_zone = str(schedule.get("timeZone") or "UTC")
            if completed:
                anchor = _parse_iso(completed[-1]).astimezone(_zone(time_zone)).date()
                candidate = anchor + timedelta(days=max(1, int(schedule.get("intervalDays", 1))))
            else:
                try:
                    candidate = date.fromisoformat(str(schedule.get("startDate")))
                except ValueError:
                    candidate = end.date() + timedelta(days=1)
            local_start = start.astimezone(_zone(time_zone)).date()
            local_end = end.astimezone(_zone(time_zone)).date()
            end_date = date.fromisoformat(str(schedule["endDate"])) if schedule.get("endDate") else None
            dates = [candidate] if (
                local_start <= candidate <= local_end
                and (end_date is None or candidate <= end_date)
                and candidate.isoformat() not in schedule.get("excludedDates", [])
            ) else []
        else:
            dates = _date_keys(definition, start, end)
        times = schedule.get("times") or [schedule.get("time", "00:00")]
        for index, local_date in enumerate(dates):
            rotation_index = _rotation_index_for_date(
                dates,
                index,
                definition.get("assignment", {}).get("rotationReset"),
            )
            for slot, assignees in _assignment_slots(
                definition, data, rotation_index
            ):
                override = definition.get("assignment", {}).get("participantScheduleOverrides", {}).get(assignees[0]) if len(assignees) == 1 else None
                if isinstance(override, Mapping):
                    if override.get("daysOfWeek") and ((local_date.weekday() + 1) % 7) not in override["daysOfWeek"]:
                        continue
                    times_for_slot = override.get("times") or times
                else:
                    times_for_slot = times
                for time_value in times_for_slot:
                    scheduled = _scheduled_at(local_date, str(time_value), str(schedule.get("timeZone") or "UTC"))
                    if not (start <= scheduled <= end):
                        continue
                    scheduled_iso = _iso(scheduled)
                    occurrence_id = _occurrence_id(str(definition["id"]), scheduled_iso, slot)
                    if occurrence_id in occurrences:
                        continue
                    due = scheduled + timedelta(minutes=max(0, int(definition.get("dueWindowMinutes", 0))))
                    occurrences[occurrence_id] = {
                        "id": occurrence_id,
                        "definitionId": definition["id"],
                        "scheduledAt": scheduled_iso,
                        "dueAt": _iso(due),
                        "assigneeIds": assignees,
                        "assignmentSlot": slot,
                        "status": "available",
                        "updatedAt": scheduled_iso,
                    }
                    additions.append(_activity(f"{command_id}:created:{occurrence_id}", timestamp, "occurrence_created", occurrenceId=occurrence_id, definitionId=definition["id"], assigneeIds=assignees))
    retention = _now() - timedelta(days=RETENTION_DAYS)
    occurrences = {
        key: value
        for key, value in occurrences.items()
        if not (value.get("status") in {"done", "skipped"} and _parse_iso(value.get("scheduledAt", timestamp)) < retention)
    }
    return {**data, "occurrencesById": occurrences}, additions


def _experience_point_balances(data: Mapping[str, Any], experience: Mapping[str, Any]) -> dict[str, int]:
    persisted = experience.get("earnedPointsByParticipant")
    if isinstance(persisted, Mapping) and persisted:
        return {
            str(key): int(value)
            for key, value in persisted.items()
            if isinstance(value, int) and not isinstance(value, bool)
        }
    balances: dict[str, int] = {}
    presentation = experience.get("presentationByDefinitionId", {})
    for occurrence in data.get("occurrencesById", {}).values():
        if occurrence.get("status") != "done" or not occurrence.get("completedBy"):
            continue
        metadata = presentation.get(occurrence.get("definitionId"), {})
        points = metadata.get("points", 0) if isinstance(metadata, Mapping) else 0
        if isinstance(points, int) and not isinstance(points, bool):
            participant_id = str(occurrence["completedBy"])
            balances[participant_id] = balances.get(participant_id, 0) + points
    return balances


def _update_experience_points(
    data: Mapping[str, Any],
    previous: Mapping[str, Any],
    current: Mapping[str, Any],
) -> tuple[dict[str, Any], str | None, int]:
    experience = dict(data.get("experience") or _empty_data()["experience"])
    if experience.get("gamificationMode") == "off":
        return experience, None, 0
    metadata = experience.get("presentationByDefinitionId", {}).get(previous.get("definitionId"), {})
    points = metadata.get("points", 0) if isinstance(metadata, Mapping) else 0
    became_final = previous.get("status") != "done" and current.get("status") == "done"
    stopped_being_final = previous.get("status") == "done" and current.get("status") != "done"
    participant_id = current.get("completedBy") if became_final else previous.get("completedBy") if stopped_being_final else None
    if (
        not isinstance(points, int)
        or isinstance(points, bool)
        or not points
        or not isinstance(participant_id, str)
    ):
        return experience, None, 0
    points_delta = points if became_final else -points
    balances = _experience_point_balances(data, experience)
    balances[participant_id] = balances.get(participant_id, 0) + points_delta
    experience["earnedPointsByParticipant"] = balances
    return experience, participant_id, points_delta


def _apply_occurrence(data: dict[str, Any], occurrence_id: str, command: Mapping[str, Any], timestamp: str, command_id: str) -> dict[str, Any]:
    occurrence = data["occurrencesById"].get(occurrence_id)
    if not occurrence:
        raise ChoreAuthorityError("Chore occurrence is no longer available")
    definition = data["definitionsById"].get(occurrence.get("definitionId"))
    if not definition or definition.get("archivedAt"):
        raise ChoreAuthorityError("Chore definition is no longer available")
    participant_id = str(command.get("participantId", ""))
    action_type = str(command.get("type", ""))
    capability = "approve" if action_type in {"approve", "reject"} and not command.get("managerOverride") else "manage" if action_type in {"approve", "reject", "skip", "reopen", "reassign"} else "complete"
    _require_capability(data, participant_id, capability)
    next_occurrence = dict(occurrence)
    if action_type == "claim":
        if participant_id not in occurrence.get("assigneeIds", []):
            raise ChoreAuthorityError("Participant is not assigned to this chore occurrence")
        claim = definition.get("claimPolicy") or {}
        expired = bool(occurrence.get("claimedAt") and claim.get("allowSteal") and claim.get("expiresAfterMinutes") is not None and _parse_iso(timestamp) >= _parse_iso(occurrence["claimedAt"]) + timedelta(minutes=int(claim["expiresAfterMinutes"])))
        if occurrence.get("status") != "available" and not expired:
            raise ChoreAuthorityError("Only available chores can be claimed")
        next_occurrence.update(status="claimed", claimedBy=participant_id, claimedAt=timestamp)
        event_type = "claimed"
    elif action_type == "complete":
        if participant_id not in occurrence.get("assigneeIds", []):
            raise ChoreAuthorityError("Participant is not assigned to this chore occurrence")
        if occurrence.get("status") not in {"available", "claimed", "missed"}:
            raise ChoreAuthorityError("Only available, claimed, or missed chores can be completed")
        if occurrence.get("claimedBy") and occurrence.get("claimedBy") != participant_id:
            raise ChoreAuthorityError("A claimed chore can only be completed by its claimant")
        if occurrence.get("status") == "available" and (definition.get("claimPolicy") or {}).get("required"):
            raise ChoreAuthorityError("This chore must be claimed before it can be completed")
        next_occurrence.update(status="awaiting_approval" if (definition.get("approval") or {}).get("required") else "done", claimedBy=occurrence.get("claimedBy") or participant_id, claimedAt=occurrence.get("claimedAt") or timestamp, completedBy=participant_id, completedAt=timestamp, missedAt=None)
        event_type = "completed"
    elif action_type in {"approve", "reject"}:
        approval = definition.get("approval") or {}
        if not approval.get("required") or (participant_id not in approval.get("approverIds", []) and not command.get("managerOverride")):
            raise ChoreAuthorityError("Participant cannot approve this chore")
        if command.get("managerOverride") and not str(command.get("reason", "")).strip():
            raise ChoreAuthorityError("A manager approval override requires a reason")
        if occurrence.get("status") != "awaiting_approval":
            raise ChoreAuthorityError("Only completed chores awaiting approval can be approved")
        if action_type == "approve":
            next_occurrence.update(status="done", approvedBy=participant_id, approvedAt=timestamp)
            event_type = "approved"
        else:
            next_occurrence.update(status="available", claimedBy=None, claimedAt=None, completedBy=None, completedAt=None, approvedBy=None, approvedAt=None)
            event_type = "rejected"
    elif action_type in {"skip", "reopen", "reassign"}:
        reason = str(command.get("reason", "")).strip()
        if not reason:
            raise ChoreAuthorityError(f"{action_type.capitalize()}ing a chore requires a reason")
        if action_type == "skip":
            if occurrence.get("status") in {"done", "skipped"}:
                raise ChoreAuthorityError("Completed or skipped chores cannot be skipped")
            next_occurrence.update(status="skipped", skippedBy=participant_id, skippedAt=timestamp)
            event_type = "skipped"
        elif action_type == "reopen":
            if occurrence.get("status") not in {"done", "skipped", "missed"}:
                raise ChoreAuthorityError("Only completed, skipped, or missed chores can be reopened")
            for key in ("claimedBy", "claimedAt", "completedBy", "completedAt", "approvedBy", "approvedAt", "skippedBy", "skippedAt", "missedAt", "carriedForwardTo"):
                next_occurrence.pop(key, None)
            next_occurrence.update(status="available")
            event_type = "reopened"
        else:
            assignee_ids = list(dict.fromkeys(str(item) for item in command.get("assigneeIds", [])))
            if not assignee_ids or any(item not in data["participantsById"] or data["participantsById"][item].get("pausedAt") or "complete" not in data["participantsById"][item].get("capabilities", []) for item in assignee_ids):
                raise ChoreAuthorityError("Chore reassignment includes an ineligible participant")
            if occurrence.get("status") not in {"available", "claimed"}:
                raise ChoreAuthorityError("Only available or claimed chores can be reassigned")
            next_occurrence.update(assigneeIds=assignee_ids, assignmentSlot=f"manager:{','.join(sorted(assignee_ids))}", status="available", claimedBy=None, claimedAt=None)
            event_type = "reassigned"
    else:
        raise ChoreAuthorityError("Unsupported chore action")
    next_occurrence["updatedAt"] = timestamp
    experience, point_participant_id, points_delta = _update_experience_points(
        data, occurrence, next_occurrence
    )
    data = {
        **data,
        "occurrencesById": {**data["occurrencesById"], occurrence_id: next_occurrence},
        "experience": experience,
    }
    return data, _activity(
        command_id,
        timestamp,
        event_type,
        occurrenceId=occurrence_id,
        definitionId=definition["id"],
        participantId=point_participant_id or participant_id,
        actorParticipantId=participant_id,
        pointsDelta=points_delta or None,
        reason=str(command.get("reason", "")).strip() or None,
        assigneeIds=next_occurrence.get("assigneeIds") if action_type == "reassign" else None,
        previousAssigneeIds=occurrence.get("assigneeIds") if action_type == "reassign" else None,
    )


class ChoreAuthority:
    """Serialized, durable Navet chores authority for a Home Assistant entry."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._lock = asyncio.Lock()
        self._loaded = False
        self._document: dict[str, Any] | None = None
        self._history: list[dict[str, Any]] = []
        self._journal: list[dict[str, Any]] = []
        self._security: dict[str, Any] | None = None
        self._sessions: dict[str, dict[str, Any]] = {}
        self._subscribers: set[Callable[[dict[str, Any]], None]] = set()
        self._unsub_interval: Callable[[], None] | None = None
        self._last_scheduler_run_at: str | None = None
        self._last_delivery_error: str | None = None
        self._recovery: dict[str, Any] | None = None
        self._stores = {
            "primary": Store(hass, STORE_VERSION, WORKSPACE_KEY, private=True, atomic_writes=True),
            "last_good": Store(hass, STORE_VERSION, LAST_GOOD_KEY, private=True, atomic_writes=True),
            "history": Store(hass, STORE_VERSION, HISTORY_KEY, private=True, atomic_writes=True),
            "journal": Store(hass, STORE_VERSION, JOURNAL_KEY, private=True, atomic_writes=True),
            "security": Store(hass, STORE_VERSION, SECURITY_KEY, private=True, atomic_writes=True),
        }

    async def async_initialize(self) -> None:
        run_initial_tick = True
        async with self._lock:
            if self._loaded:
                return
            primary = await self._stores["primary"].async_load()
            history = await self._stores["history"].async_load()
            journal = await self._stores["journal"].async_load()
            security = await self._stores["security"].async_load()
            if primary is None:
                last_good = await self._stores["last_good"].async_load()
                if isinstance(last_good, Mapping) and isinstance(last_good.get("data"), Mapping):
                    primary = last_good
                else:
                    primary = {"contractVersion": CONTRACT_VERSION, "revision": 0, "updatedAt": _iso(_now()), "data": _empty_data()}
            repaired_primary = False
            try:
                data = _normalize_data(primary.get("data")) if isinstance(primary, Mapping) else _empty_data()
            except ChoreAuthorityError:
                backup = await self._stores["last_good"].async_load()
                try:
                    if not isinstance(backup, Mapping):
                        raise ChoreStorageError("No healthy chore backup is available")
                    data = _normalize_data(backup.get("data"))
                except ChoreAuthorityError:
                    data = _empty_data()
                    primary_revision = (
                        int(primary.get("revision", 0))
                        if isinstance(primary, Mapping)
                        else 0
                    )
                    primary = {
                        "contractVersion": CONTRACT_VERSION,
                        "revision": primary_revision,
                        "updatedAt": _iso(_now()),
                        "data": data,
                    }
                    self._recovery = {
                        "backupAvailable": False,
                        "pinConfigured": isinstance(security, Mapping),
                        "reason": "workspace_invalid",
                    }
                    run_initial_tick = False
                else:
                    primary = {
                        **backup,
                        "revision": int(backup.get("revision", 0)) + 1,
                        "updatedAt": _iso(_now()),
                        "data": data,
                    }
                    repaired_primary = True
            self._document = {
                "contractVersion": CONTRACT_VERSION,
                "revision": int(primary.get("revision", 0)),
                "updatedAt": str(primary.get("updatedAt", _iso(_now()))),
                "data": data,
            }
            self._history = list(history.get("events", [])) if isinstance(history, Mapping) else []
            self._journal = list(journal.get("commands", [])) if isinstance(journal, Mapping) else []
            self._security = dict(security) if isinstance(security, Mapping) else None
            self._loaded = True
            if repaired_primary:
                await self._stores["primary"].async_save(primary)
        if run_initial_tick:
            await self.async_tick(_now())

    async def async_start(self) -> None:
        await self.async_initialize()
        if self._unsub_interval is None:
            self._unsub_interval = async_track_time_interval(self.hass, self.async_tick, BACKGROUND_INTERVAL)

    async def async_stop(self) -> None:
        if self._unsub_interval:
            self._unsub_interval()
            self._unsub_interval = None

    @property
    def revision(self) -> int:
        return int((self._document or {}).get("revision", 0))

    @property
    def data(self) -> dict[str, Any]:
        return (self._document or {"data": _empty_data()})["data"]

    def _public_document(self) -> dict[str, Any]:
        return {
            "contractVersion": CONTRACT_VERSION,
            "revision": self.revision,
            "updatedAt": self._document["updatedAt"] if self._document else _iso(_now()),
            "data": json.loads(json.dumps(self.data)),
            "management": {"pinConfigured": self._security is not None},
        }

    def _raise_if_recovery_required(self) -> None:
        if self._recovery:
            error = ChoreStorageError(
                "Chore data could not be read. Repair it from the last healthy copy or start over."
            )
            error.code = "workspace_invalid"
            raise error

    def projection(self) -> dict[str, Any]:
        now = _now()
        counts = {"dueNow": 0, "overdue": 0, "awaitingApproval": 0, "completedToday": 0}
        next_items: list[dict[str, Any]] = []
        for occurrence in self.data.get("occurrencesById", {}).values():
            status = occurrence.get("status")
            if status == "awaiting_approval":
                counts["awaitingApproval"] += 1
            if status == "done" and occurrence.get("completedAt", "")[:10] == _iso(now)[:10]:
                counts["completedToday"] += 1
            if status in {"available", "claimed", "awaiting_approval"}:
                due = _parse_iso(occurrence.get("dueAt", _iso(now)))
                if now > due:
                    counts["overdue"] += 1
                elif now >= _parse_iso(occurrence.get("scheduledAt", _iso(now))):
                    counts["dueNow"] += 1
                next_items.append({"occurrenceId": occurrence.get("id"), "definitionId": occurrence.get("definitionId"), "scheduledAt": occurrence.get("scheduledAt"), "status": status})
        next_items.sort(key=lambda item: str(item.get("scheduledAt", "")))
        state = "overdue" if counts["overdue"] else "awaiting_approval" if counts["awaitingApproval"] else "due" if counts["dueNow"] else "idle"
        return {"contractVersion": 1, "generatedAt": _iso(now), "revision": self.revision, "state": state, "counts": counts, "next": next_items[:10]}

    def subscribe(self, callback_fn: Callable[[dict[str, Any]], None]) -> Callable[[], None]:
        self._subscribers.add(callback_fn)

        def unsubscribe() -> None:
            self._subscribers.discard(callback_fn)

        return unsubscribe

    async def _save(self, next_document: dict[str, Any], previous: dict[str, Any]) -> None:
        retention = next_document["data"].get("historyRetention") or DEFAULT_RETENTION
        boundary = _now() - timedelta(days=int(retention["maxAgeDays"]))
        self._history = [
            event
            for event in self._history
            if _valid_timestamp(event.get("timestamp"))
            and _parse_iso(event["timestamp"]) >= boundary
        ][-min(MAX_HISTORY_ITEMS, int(retention["maxEvents"])):]
        payloads = {
            "primary": next_document,
            "last_good": previous,
            "history": {"contractVersion": CONTRACT_VERSION, "events": self._history},
            "journal": {"contractVersion": CONTRACT_VERSION, "commands": self._journal[-MAX_JOURNAL_ITEMS:]},
        }
        limits = {
            "primary": MAX_WORKSPACE_BYTES,
            "last_good": MAX_WORKSPACE_BYTES,
            "history": MAX_HISTORY_BYTES,
            "journal": MAX_JOURNAL_BYTES,
        }
        if any(
            len(json.dumps(payload, separators=(",", ":")).encode()) > limits[key]
            for key, payload in payloads.items()
        ):
            raise ChoreStorageError("Chore workspace is too large")
        try:
            await self._stores["last_good"].async_save(payloads["last_good"])
            await self._stores["primary"].async_save(payloads["primary"])
            await self._stores["history"].async_save(payloads["history"])
            await self._stores["journal"].async_save(payloads["journal"])
        except Exception as err:  # noqa: BLE001
            raise ChoreStorageError("Chore storage could not finish the request") from err
        self._document = next_document
        self._recovery = None
        projection = self.projection()
        for subscriber in tuple(self._subscribers):
            try:
                subscriber(self._public_document())
            except Exception:  # noqa: BLE001
                continue
        self.hass.bus.async_fire("navet_chore_projection", projection)

    async def _commit_locked(self, data: dict[str, Any], activities: list[dict[str, Any]], command_id: str, timestamp: str) -> dict[str, Any]:
        previous = dict(self._document or {})
        previous["data"] = json.loads(json.dumps(self.data))
        self._history.extend(activity for activity in activities if activity["id"] not in {item.get("id") for item in self._history})
        data["activity"] = (list(data.get("activity", [])) + activities)[-MAX_ACTIVITY_ITEMS:]
        existing_outbox = {item.get("id") for item in data.get("outbox", [])}
        additions = [
            _outbox(activity)
            for activity in activities
            if activity["type"] != "points_adjusted"
            and _outbox(activity)["id"] not in existing_outbox
        ]
        data["outbox"] = (list(data.get("outbox", [])) + additions)[-MAX_OUTBOX_ITEMS:]
        next_document = {"contractVersion": CONTRACT_VERSION, "revision": self.revision + 1, "updatedAt": timestamp, "data": data}
        if command_id:
            self._journal.append({"commandId": command_id, "revision": next_document["revision"], "timestamp": timestamp})
        await self._save(next_document, previous)
        return self._public_document()

    async def _reset_locked(self, timestamp: str) -> dict[str, Any]:
        previous = dict(self._document or {})
        previous["data"] = json.loads(json.dumps(self.data))
        self._history = []
        self._journal = []
        self._security = None
        self._sessions.clear()
        next_document = {
            "contractVersion": CONTRACT_VERSION,
            "revision": self.revision + 1,
            "updatedAt": timestamp,
            "data": _empty_data(),
        }
        await self._save(next_document, previous)
        for store_name in ("last_good", "history", "journal"):
            await self._stores[store_name].async_remove()
        await self._stores["security"].async_remove()
        result = self._public_document()
        result["management"] = {"pinConfigured": False}
        return result

    async def async_command(self, request: Mapping[str, Any], user_id: str | None = None) -> dict[str, Any]:
        await self.async_initialize()
        self._raise_if_recovery_required()
        command_id = str(request.get("commandId", ""))
        if not command_id or len(command_id) > 200:
            raise ChoreAuthorityError("Chore command is invalid")
        async with self._lock:
            if any(item.get("commandId") == command_id for item in self._journal) or any(item.get("commandId") == command_id for item in self.data.get("activity", [])):
                return self._public_document()
            base_revision = request.get("baseRevision")
            if not isinstance(base_revision, int) or base_revision != self.revision:
                raise ChoreConflictError("Chore workspace changed on another client")
            action = request.get("action")
            if not isinstance(action, Mapping):
                raise ChoreAuthorityError("Chore command is invalid")
            if self._security and self._requires_management(action) and not self._session_valid(str(request.get("managementSessionToken", "")), user_id):
                raise ChoreAuthorityError("Unlock chore management to continue")
            timestamp = _iso(_now())
            data = json.loads(json.dumps(self.data))
            activities: list[dict[str, Any]] = []
            if action.get("type") == "occurrence_action":
                data, activity = _apply_occurrence(data, str(action.get("occurrenceId", "")), action.get("action", {}), timestamp, command_id)
                activities.append(activity)
            elif action.get("type") == "materialize_occurrences":
                data, additional = _materialize(data, str(action.get("rangeStart")), str(action.get("rangeEnd")), timestamp, command_id)
                activities.append(_activity(command_id, timestamp, "workspace_materialized"))
                activities.extend(additional)
            else:
                data, activity = self._apply_workspace_action(data, action, timestamp, command_id)
                activities.append(activity)
            return await self._commit_locked(data, activities, command_id, timestamp)

    @staticmethod
    def _requires_management(action: Mapping[str, Any]) -> bool:
        return str(action.get("type")) in {"participant_create", "participant_update", "definition_create", "definition_update", "definition_archive", "definition_restore", "definition_delete", "retention_update", "experience_update", "experience_points_adjust"}

    def _apply_workspace_action(self, data: dict[str, Any], action: Mapping[str, Any], timestamp: str, command_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
        action_type = str(action.get("type"))
        actor = str(action.get("actorParticipantId", ""))
        if action_type == "participant_create":
            participant = dict(action.get("participant", {}))
            participant_id = str(participant.get("id", ""))
            if not participant_id or participant_id in data["participantsById"]:
                raise ChoreAuthorityError("Household profile already exists")
            if data["participantsById"] and not _active_manager(data, actor):
                raise ChoreAuthorityError("Only a household manager can change chores and profiles")
            if not data["participantsById"] and "manage" not in participant.get("capabilities", []):
                raise ChoreAuthorityError("The first household profile must be a manager")
            data["participantsById"] = {**data["participantsById"], participant_id: participant}
            return data, _activity(command_id, timestamp, "participant_created", participantId=participant_id, actorParticipantId=actor or None)
        if action_type == "participant_update":
            _require_manager(data, actor)
            participant = dict(action.get("participant", {}))
            current = data["participantsById"].get(participant.get("id"))
            if not current or participant.get("createdAt") != current.get("createdAt"):
                raise ChoreAuthorityError("Household profile update is invalid")
            participants = {**data["participantsById"], participant["id"]: participant}
            if not any(not item.get("pausedAt") and "manage" in item.get("capabilities", []) for item in participants.values()):
                raise ChoreAuthorityError("The household needs an active manager")
            data["participantsById"] = participants
            return data, _activity(command_id, timestamp, "participant_updated", participantId=participant["id"], actorParticipantId=actor)
        if action_type in {"definition_create", "definition_update"}:
            _require_manager(data, actor)
            definition = dict(action.get("definition", {}))
            definition_id = str(definition.get("id", ""))
            if not definition_id or (action_type == "definition_create" and definition_id in data["definitionsById"]) or (action_type == "definition_update" and definition_id not in data["definitionsById"]):
                raise ChoreAuthorityError("Chore is no longer available")
            for participant_id in definition.get("assignment", {}).get("participantIds", []):
                _require_capability(data, str(participant_id), "complete")
            for participant_id in definition.get("approval", {}).get("approverIds", []):
                _require_capability(data, str(participant_id), "approve")
            data["definitionsById"] = {**data["definitionsById"], definition_id: definition}
            return data, _activity(command_id, timestamp, "definition_created" if action_type == "definition_create" else "definition_updated", definitionId=definition_id, actorParticipantId=actor)
        if action_type in {"definition_archive", "definition_restore"}:
            _require_manager(data, actor)
            definition_id = str(action.get("definitionId", ""))
            definition = data["definitionsById"].get(definition_id)
            if not definition:
                raise ChoreAuthorityError("Chore is no longer available")
            next_definition = {**definition, "enabled": action_type == "definition_restore", "updatedAt": timestamp}
            if action_type == "definition_archive":
                next_definition["archivedAt"] = timestamp
                data["occurrencesById"] = {key: item for key, item in data["occurrencesById"].items() if item.get("definitionId") != definition_id or item.get("status") in {"done", "skipped"}}
            else:
                next_definition.pop("archivedAt", None)
            data["definitionsById"] = {**data["definitionsById"], definition_id: next_definition}
            return data, _activity(command_id, timestamp, "definition_archived" if action_type == "definition_archive" else "definition_updated", definitionId=definition_id, actorParticipantId=actor)
        if action_type == "definition_delete":
            _require_manager(data, actor)
            definition_id = str(action.get("definitionId", ""))
            if definition_id not in data["definitionsById"]:
                raise ChoreAuthorityError("Chore is no longer available")
            data["definitionsById"].pop(definition_id)
            removed_occurrence_ids = {
                occurrence_id
                for occurrence_id, occurrence in data["occurrencesById"].items()
                if occurrence.get("definitionId") == definition_id
            }
            removed_activity_ids = {
                activity.get("id")
                for activity in data.get("activity", [])
                if activity.get("occurrenceId") in removed_occurrence_ids
            }
            data["occurrencesById"] = {
                occurrence_id: occurrence
                for occurrence_id, occurrence in data["occurrencesById"].items()
                if occurrence_id not in removed_occurrence_ids
            }
            data["outbox"] = [
                item
                for item in data.get("outbox", [])
                if (not item.get("occurrenceId") or item.get("occurrenceId") not in removed_occurrence_ids)
                and item.get("activityId") not in removed_activity_ids
            ]
            experience = data.get("experience", {})
            experience.get("presentationByDefinitionId", {}).pop(definition_id, None)
            missions = {}
            for mission_id, mission in experience.get("missionsById", {}).items():
                definition_ids = [item for item in mission.get("definitionIds", []) if item != definition_id]
                if definition_ids:
                    missions[mission_id] = {**mission, "definitionIds": definition_ids}
            experience["missionsById"] = missions
            if "awardedMissionIds" in experience:
                experience["awardedMissionIds"] = [
                    mission_id for mission_id in experience["awardedMissionIds"] if mission_id in missions
                ]
            return data, _activity(command_id, timestamp, "definition_deleted", definitionId=definition_id, actorParticipantId=actor)
        if action_type == "retention_update":
            _require_manager(data, actor)
            policy = dict(action.get("policy", {}))
            if not (30 <= int(policy.get("maxAgeDays", 0)) <= 3650 and 1000 <= int(policy.get("maxEvents", 0)) <= 100000):
                raise ChoreAuthorityError("Chore history retention policy is invalid")
            data["historyRetention"] = policy
            return data, _activity(command_id, timestamp, "retention_updated", actorParticipantId=actor)
        if action_type == "experience_update":
            _require_manager(data, actor)
            data["experience"] = dict(action.get("experience", {}))
            return data, _activity(command_id, timestamp, "experience_updated", actorParticipantId=actor)
        if action_type == "experience_points_adjust":
            _require_manager(data, actor)
            participant_id = str(action.get("participantId", ""))
            if participant_id not in data["participantsById"]:
                raise ChoreAuthorityError("Chore participant is no longer available")
            points_delta = action.get("pointsDelta")
            if (
                not isinstance(points_delta, int)
                or isinstance(points_delta, bool)
                or points_delta == 0
                or abs(points_delta) > 10_000
            ):
                raise ChoreAuthorityError("Point adjustment must be a non-zero whole number up to 10000")
            reason_value = action.get("reason")
            if reason_value is not None and not isinstance(reason_value, str):
                raise ChoreAuthorityError("Point adjustment reason must be text")
            reason = reason_value.strip() if isinstance(reason_value, str) else None
            experience = dict(data.get("experience") or _empty_data()["experience"])
            balances = _experience_point_balances(data, experience)
            next_balance = balances.get(participant_id, 0) + points_delta
            if abs(next_balance) > 1_000_000_000:
                raise ChoreAuthorityError("Point balance must stay between -1000000000 and 1000000000")
            balances[participant_id] = next_balance
            experience["earnedPointsByParticipant"] = balances
            data["experience"] = experience
            return data, _activity(
                command_id,
                timestamp,
                "points_adjusted",
                actorParticipantId=actor,
                participantId=participant_id,
                pointsDelta=points_delta,
                reason=reason or None,
            )
        if action_type == "reminder_acknowledge":
            actor_record = _require_capability(data, actor, "complete")
            outbox_id = str(action.get("outboxId", ""))
            target = next((item for item in data["outbox"] if item.get("id") == outbox_id and str(item.get("eventType", "")).startswith("reminder_")), None)
            if not target or (target.get("participantId") != actor and "manage" not in actor_record.get("capabilities", [])):
                raise ChoreAuthorityError("Participant cannot acknowledge this chore reminder")
            data["outbox"] = [{**item, "status": "delivered", "deliveredAt": timestamp, "lastAttemptAt": timestamp} if item.get("id") == outbox_id else item for item in data["outbox"]]
            return data, _activity(command_id, timestamp, "reminder_acknowledged", outboxId=outbox_id, participantId=target.get("participantId"), actorParticipantId=actor)
        if action_type == "outbox_delivery_update":
            outbox_id = str(action.get("outboxId", ""))
            if not any(item.get("id") == outbox_id for item in data["outbox"]):
                raise ChoreAuthorityError("Chore outbox item is no longer available")
            status = str(action.get("status"))
            if status not in {"delivered", "failed"}:
                raise ChoreAuthorityError("Chore delivery status is invalid")
            data["outbox"] = [{**item, "status": status, "attempts": int(item.get("attempts", 0)) + 1, "lastAttemptAt": timestamp, "deliveredAt": timestamp if status == "delivered" else None, "lastError": str(action.get("error", "")) if status == "failed" else None, "nextAttemptAt": _iso(_parse_iso(timestamp) + timedelta(milliseconds=min(3_600_000, (2 ** min(int(item.get("attempts", 0)) + 1, 10)) * 30_000))) if status == "failed" else item.get("nextAttemptAt")} if item.get("id") == outbox_id else item for item in data["outbox"]]
            return data, _activity(command_id, timestamp, "outbox_delivery_updated", outboxId=outbox_id, reason=str(action.get("error", "")) if status == "failed" else None)
        raise ChoreAuthorityError("Unsupported chore workspace action")

    def _session_valid(self, token: str, user_id: str | None) -> bool:
        session = self._sessions.get(token)
        if not session or session["expiresAt"] <= _now().timestamp() or session.get("userId") != user_id:
            self._sessions.pop(token, None)
            return False
        return True

    async def async_verify_pin(self, pin: str, user_id: str | None) -> dict[str, Any]:
        await self.async_initialize()
        if not self._security:
            raise ChoreAuthorityError("A management PIN has not been configured")
        if not isinstance(pin, str) or len(pin) < 4 or len(pin) > 8 or any(item not in PIN_PATTERN for item in pin):
            raise ChoreAuthorityError("The management PIN is incorrect")
        candidate = hashlib.sha256(f"{self._security['salt']}:{pin}".encode()).hexdigest()
        if not hmac.compare_digest(candidate, str(self._security.get("pinHash", ""))):
            raise ChoreAuthorityError("The management PIN is incorrect")
        token = secrets.token_urlsafe(32)
        expires = _now().timestamp() + MANAGEMENT_SESSION_SECONDS
        self._sessions[token] = {"userId": user_id, "expiresAt": expires}
        return {"pinConfigured": True, "sessionToken": token, "expiresAt": datetime.fromtimestamp(expires, timezone.utc).isoformat().replace("+00:00", "Z")}

    async def async_configure_pin(self, actor_id: str, pin: str, token: str | None, user_id: str | None) -> dict[str, Any]:
        await self.async_initialize()
        _require_manager(self.data, actor_id)
        if not isinstance(pin, str) or len(pin) < 4 or len(pin) > 8 or any(item not in PIN_PATTERN for item in pin):
            raise ChoreAuthorityError("Use a 4 to 8 digit PIN for an active manager")
        if self._security and not self._session_valid(token or "", user_id):
            raise ChoreAuthorityError("Unlock chore management before changing its PIN")
        salt = secrets.token_hex(24)
        self._security = {"contractVersion": CONTRACT_VERSION, "salt": salt, "pinHash": hashlib.sha256(f"{salt}:{pin}".encode()).hexdigest(), "updatedAt": _iso(_now())}
        if len(json.dumps(self._security, separators=(",", ":")).encode()) > MAX_SECURITY_BYTES:
            raise ChoreStorageError("Chore management security is too large")
        await self._stores["security"].async_save(self._security)
        return await self.async_verify_pin(pin, user_id)

    async def async_remove_pin(
        self,
        actor_id: str,
        token: str | None,
        user_id: str | None,
    ) -> dict[str, Any]:
        await self.async_initialize()
        _require_manager(self.data, actor_id)
        if not self._security:
            raise ChoreAuthorityError("A management PIN has not been configured")
        if not self._session_valid(token or "", user_id):
            raise ChoreAuthorityError("Unlock chore management before removing its PIN")
        self._security = None
        self._sessions.clear()
        await self._stores["security"].async_remove()
        return {"pinConfigured": False}

    async def async_recover(self, request: Mapping[str, Any], user_id: str | None) -> dict[str, Any]:
        await self.async_initialize()
        if str(request.get("action")) not in {"restore_backup", "reset"}:
            raise ChoreAuthorityError("Choose repair or start over to recover chores")
        expected_confirmation = "REPAIR CHORES" if request.get("action") == "restore_backup" else "RESET CHORES"
        if request.get("confirmation") != expected_confirmation:
            raise ChoreAuthorityError("Choose repair or start over to recover chores")
        if self._security and not self._session_valid(str(request.get("managementSessionToken", "")), user_id):
            raise ChoreAuthorityError("Unlock chore management to continue")
        async with self._lock:
            timestamp = _iso(_now())
            if request.get("action") == "restore_backup":
                backup = await self._stores["last_good"].async_load()
                if not isinstance(backup, Mapping):
                    raise ChoreAuthorityError("No healthy chore backup is available")
                data = _normalize_data(backup.get("data"))
            else:
                return await self._reset_locked(timestamp)
            return await self._commit_locked(
                data,
                [_activity(f"recovery:{timestamp}", timestamp, "workspace_imported")],
                "",
                timestamp,
            )

    async def async_restore(self, request: Mapping[str, Any], user_id: str | None) -> dict[str, Any]:
        await self.async_initialize()
        document = request.get("document")
        if (
            not isinstance(document, Mapping)
            or document.get("contract") != "navet.chores"
            or document.get("version") != 1
            or not _valid_timestamp(document.get("exportedAt"))
            or not isinstance(document.get("workspace"), Mapping)
            or not isinstance(document.get("events", []), list)
            or any(
                not _valid_activity(item) for item in document.get("events", [])
            )
        ):
            raise ChoreAuthorityError("Chore backup is invalid")
        if self._security and not self._session_valid(str(request.get("managementSessionToken", "")), user_id):
            raise ChoreAuthorityError("Unlock chore management to continue")
        async with self._lock:
            command_id = str(request.get("commandId", ""))
            if not command_id or not isinstance(request.get("baseRevision"), int):
                raise ChoreAuthorityError("Chore administration request is invalid")
            if any(item.get("commandId") == command_id for item in self._journal):
                return self._public_document()
            if request["baseRevision"] != self.revision:
                raise ChoreConflictError("Chore workspace changed on another client")
            imported = _normalize_data(document["workspace"])
            actor_id = str(request.get("actorParticipantId", ""))
            if self.data["participantsById"]:
                _require_manager(self.data, actor_id)
            else:
                _require_manager(imported, actor_id)
            mode = str(request.get("mode", "replace"))
            if mode not in {"merge", "replace"}:
                raise ChoreAuthorityError("Chore restore mode is invalid")
            if mode == "replace":
                data = {**imported, "outbox": []}
                self._history = list(document.get("events", []))[-MAX_HISTORY_ITEMS:]
            else:
                data, merged_events = _merge_imported_workspace(
                    self.data,
                    self._history,
                    imported,
                    list(document.get("events", [])),
                    _iso(_now()),
                )
                self._history = merged_events[-MAX_HISTORY_ITEMS:]
            timestamp = _iso(_now())
            return await self._commit_locked(data, [_activity(command_id, timestamp, "workspace_imported")], command_id, timestamp)

    async def async_reset(self, request: Mapping[str, Any], user_id: str | None) -> dict[str, Any]:
        await self.async_initialize()
        if request.get("confirmation") != "DELETE ALL CHORES":
            raise ChoreAuthorityError("Chore reset confirmation is invalid")
        if self._security and not self._session_valid(str(request.get("managementSessionToken", "")), user_id):
            raise ChoreAuthorityError("Unlock chore management to continue")
        async with self._lock:
            command_id = str(request.get("commandId", ""))
            if any(item.get("commandId") == command_id for item in self._journal):
                return self._public_document()
            if not command_id or request.get("baseRevision") != self.revision:
                raise ChoreConflictError("Chore workspace changed on another client")
            _require_manager(self.data, str(request.get("actorParticipantId", "")))
            timestamp = _iso(_now())
            return await self._reset_locked(timestamp)

    async def async_tick(self, _when: datetime | None = None) -> None:
        await self.async_initialize()
        if self._recovery:
            return
        async with self._lock:
            now = _now()
            timestamp = _iso(now)
            range_start = _iso(now - timedelta(days=RETENTION_DAYS))
            range_end = _iso(now + timedelta(days=MATERIALIZATION_DAYS))
            data, materialized = _materialize(json.loads(json.dumps(self.data)), range_start, range_end, timestamp, f"scheduler:materialize:{timestamp[:10]}")
            activities = list(materialized)
            existing = {item.get("id") for item in data.get("activity", [])} | {item.get("id") for item in self._history}
            occurrences = dict(data["occurrencesById"])
            for occurrence_id, occurrence_value in list(occurrences.items()):
                occurrence = dict(occurrence_value)
                due = _parse_iso(occurrence.get("dueAt", timestamp))
                if now >= due and f"activity:scheduler:due:{occurrence['id']}" not in existing:
                    activities.append({"id": f"activity:scheduler:due:{occurrence['id']}", "commandId": f"scheduler:due:{occurrence['id']}", "occurrenceId": occurrence["id"], "definitionId": occurrence["definitionId"], "assigneeIds": occurrence.get("assigneeIds", []), "type": "due", "timestamp": occurrence["dueAt"]})
                if now > due and occurrence.get("status") in {"available", "claimed", "awaiting_approval"} and f"activity:scheduler:overdue:{occurrence['id']}" not in existing:
                    activities.append({"id": f"activity:scheduler:overdue:{occurrence['id']}", "commandId": f"scheduler:overdue:{occurrence['id']}", "occurrenceId": occurrence["id"], "definitionId": occurrence["definitionId"], "assigneeIds": occurrence.get("assigneeIds", []), "type": "overdue", "timestamp": occurrence["dueAt"]})
                if occurrence.get("status") not in {"available", "claimed"}:
                    continue
                definition = data["definitionsById"].get(occurrence.get("definitionId"), {})
                missed = definition.get("missedPolicy") or {}
                grace = missed.get("graceMinutes")
                if not isinstance(grace, int) or now < due + timedelta(minutes=grace):
                    continue
                policy_action = missed.get("action")
                if policy_action not in {"skip", "carry_forward"}:
                    continue
                occurrence["status"] = "skipped" if policy_action == "skip" else "missed"
                occurrence["updatedAt"] = timestamp
                if policy_action == "skip":
                    occurrence["skippedAt"] = timestamp
                else:
                    occurrence["missedAt"] = timestamp
                activities.append(
                    _activity(
                        f"scheduler:missed:{occurrence_id}:{timestamp}",
                        timestamp,
                        "skipped" if policy_action == "skip" else "missed",
                        occurrenceId=occurrence_id,
                        definitionId=occurrence.get("definitionId"),
                        reason="Missed-work policy",
                    )
                )
                if policy_action == "carry_forward":
                    carry_days = max(1, int(missed.get("carryForwardDays", 1)))
                    carried_scheduled = _parse_iso(occurrence["scheduledAt"]) + timedelta(days=carry_days)
                    carried_due = due + timedelta(days=carry_days)
                    slot = f"carry:{occurrence_id}"
                    carried_id = _occurrence_id(
                        str(occurrence["definitionId"]),
                        _iso(carried_scheduled),
                        slot,
                    )
                    occurrence["carriedForwardTo"] = carried_id
                    if carried_id not in occurrences:
                        occurrences[carried_id] = {
                            "id": carried_id,
                            "definitionId": occurrence["definitionId"],
                            "scheduledAt": _iso(carried_scheduled),
                            "dueAt": _iso(carried_due),
                            "assigneeIds": occurrence.get("assigneeIds", []),
                            "assignmentSlot": slot,
                            "status": "available",
                            "carriedForwardFrom": occurrence_id,
                            "updatedAt": timestamp,
                        }
                        activities.append(
                            _activity(
                                f"scheduler:created:{carried_id}",
                                timestamp,
                                "occurrence_created",
                                occurrenceId=carried_id,
                                definitionId=occurrence["definitionId"],
                                assigneeIds=occurrence.get("assigneeIds", []),
                                reason="Carried forward from missed chore",
                            )
                        )
                occurrences[occurrence_id] = occurrence
            data["occurrencesById"] = occurrences

            existing_outbox = {item.get("id") for item in data.get("outbox", [])}
            reminders: list[dict[str, Any]] = []

            def add_reminder(
                definition: Mapping[str, Any],
                occurrence: Mapping[str, Any],
                participant_id: str,
                event_type: str,
                event_key: str,
            ) -> None:
                participant = data["participantsById"].get(participant_id)
                preferences = participant.get("reminderPreferences") if isinstance(participant, Mapping) else None
                if not isinstance(participant, Mapping) or participant.get("pausedAt") or (preferences or {}).get("enabled") is False:
                    return
                item = _reminder_outbox(definition, occurrence, participant, event_type, event_key, now)
                if item["id"] in existing_outbox:
                    return
                existing_outbox.add(item["id"])
                reminders.append(item)

            for occurrence in occurrences.values():
                definition = data["definitionsById"].get(occurrence.get("definitionId"), {})
                policy = definition.get("reminderPolicy") or {}
                if not policy.get("enabled") or definition.get("archivedAt"):
                    continue
                due = _parse_iso(occurrence.get("dueAt", timestamp))
                if occurrence.get("status") in {"available", "claimed"}:
                    for offset in dict.fromkeys(policy.get("beforeDueMinutes", [])):
                        if due - timedelta(minutes=int(offset)) <= now < due:
                            for participant_id in occurrence.get("assigneeIds", []):
                                add_reminder(definition, occurrence, participant_id, "reminder_before_due", f"before:{occurrence['id']}:{offset}")
                    if policy.get("atDue") and now >= due:
                        for participant_id in occurrence.get("assigneeIds", []):
                            add_reminder(definition, occurrence, participant_id, "reminder_due", f"due:{occurrence['id']}")
                    interval = policy.get("overdueEveryMinutes")
                    if isinstance(interval, int) and interval > 0 and now >= due + timedelta(minutes=interval):
                        elapsed = int((now - due).total_seconds() // (interval * 60))
                        slots = min(elapsed, int(policy.get("maxOverdueReminders", elapsed)))
                        for slot in range(1, slots + 1):
                            for participant_id in occurrence.get("assigneeIds", []):
                                add_reminder(definition, occurrence, participant_id, "reminder_overdue", f"overdue:{occurrence['id']}:{slot}")
                approval_delay = policy.get("approvalAfterMinutes")
                if occurrence.get("status") == "awaiting_approval" and isinstance(approval_delay, int) and occurrence.get("completedAt") and now >= _parse_iso(occurrence["completedAt"]) + timedelta(minutes=approval_delay):
                    for participant_id in (definition.get("approval") or {}).get("approverIds", []):
                        add_reminder(definition, occurrence, participant_id, "reminder_approval", f"approval:{occurrence['id']}")

            if data != self.data or activities or reminders:
                if activities:
                    data["activity"] = (data.get("activity", []) + activities)[-MAX_ACTIVITY_ITEMS:]
                    data["outbox"] = (
                        data.get("outbox", [])
                        + [
                            _outbox(item)
                            for item in activities
                            if item["type"] != "points_adjusted"
                            and _outbox(item)["id"] not in existing_outbox
                        ]
                    )[-MAX_OUTBOX_ITEMS:]
                if reminders:
                    data["outbox"] = (data.get("outbox", []) + reminders)[-MAX_OUTBOX_ITEMS:]
                previous = dict(self._document or {})
                previous["data"] = json.loads(json.dumps(self.data))
                self._history.extend(item for item in activities if item["id"] not in {event.get("id") for event in self._history})
                next_document = {"contractVersion": CONTRACT_VERSION, "revision": self.revision + 1, "updatedAt": timestamp, "data": data}
                await self._save(next_document, previous)
            self._last_scheduler_run_at = timestamp
        await self._deliver_pending()

    async def _deliver_pending(self) -> None:
        pending = [item for item in self.data.get("outbox", []) if str(item.get("eventType", "")).startswith("reminder_") and item.get("destination") == "home_assistant" and item.get("status") in {"pending", "failed"} and _parse_iso(item.get("nextAttemptAt", _iso(_now()))) <= _now()][:10]
        for item in pending:
            occurrence = self.data.get("occurrencesById", {}).get(item.get("occurrenceId"), {})
            definition = self.data.get("definitionsById", {}).get(occurrence.get("definitionId"), {})
            title = str(definition.get("title", "Navet chore"))
            try:
                target = str(item.get("destinationTarget", "")).strip()
                if target.startswith("notify."):
                    target = target.removeprefix("notify.")
                if target and (
                    len(target) > 128
                    or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789_" for character in target)
                ):
                    raise ChoreAuthorityError("Invalid Home Assistant notification target")
                if target:
                    await self.hass.services.async_call("notify", target, {"title": title, "message": title, "data": {"choreOccurrenceId": item.get("occurrenceId"), "choreDefinitionId": occurrence.get("definitionId")}}, blocking=True)
                else:
                    await self.hass.services.async_call("persistent_notification", "create", {"title": title, "message": title, "notification_id": f"navet_chore_{item.get('id')}"}, blocking=True)
                await self.async_command({"commandId": f"delivery:{item['id']}:{item.get('attempts', 0) + 1}", "baseRevision": self.revision, "action": {"type": "outbox_delivery_update", "outboxId": item["id"], "status": "delivered"}})
            except Exception as err:  # noqa: BLE001
                self._last_delivery_error = str(err)
                try:
                    await self.async_command({"commandId": f"delivery:{item['id']}:{item.get('attempts', 0) + 1}", "baseRevision": self.revision, "action": {"type": "outbox_delivery_update", "outboxId": item["id"], "status": "failed", "error": str(err)}})
                except Exception:  # noqa: BLE001
                    continue

    async def async_info(self) -> dict[str, Any]:
        await self.async_initialize()
        return {
            "contractVersion": CONTRACT_VERSION,
            "schemaVersion": SCHEMA_VERSION,
            "authority": "home_assistant_panel",
            "backgroundScheduling": True,
            "backgroundNotifications": True,
            "projectionOwnedByAuthority": True,
            "actionServices": True,
            "lastSchedulerRunAt": self._last_scheduler_run_at,
            "pendingDeliveryCount": sum(
                1
                for item in self.data.get("outbox", [])
                if str(item.get("eventType", "")).startswith("reminder_")
                and item.get("destination") == "home_assistant"
                and item.get("status") in {"pending", "failed"}
            ),
            "lastDeliveryError": self._last_delivery_error,
        }

    async def async_handle_ws(self, message: Mapping[str, Any], user_id: str | None) -> Any:
        message_type = str(message.get("type"))
        if message_type == "navet/chores/info":
            return await self.async_info()
        if message_type == "navet/chores/workspace/get":
            await self.async_initialize()
            self._raise_if_recovery_required()
            if isinstance(message.get("revision"), int) and message["revision"] == self.revision:
                return {"notModified": True, "revision": self.revision}
            return self._public_document()
        if message_type == "navet/chores/workspace/subscribe":
            return self._public_document()
        if message_type == "navet/chores/command":
            return await self.async_command(message, user_id)
        if message_type == "navet/chores/definitions/get":
            await self.async_initialize()
            definitions = sorted(self.data["definitionsById"].values(), key=lambda item: str(item.get("title", "")).lower())
            return {"contractVersion": CONTRACT_VERSION, "revision": self.revision, "definitions": definitions}
        if message_type == "navet/chores/occurrences/get":
            await self.async_initialize()
            occurrences = list(self.data["occurrencesById"].values())
            if participant_id := message.get("participantId"):
                occurrences = [
                    item
                    for item in occurrences
                    if participant_id in item.get("assigneeIds", [])
                ]
            if definition_id := message.get("definitionId"):
                occurrences = [
                    item
                    for item in occurrences
                    if item.get("definitionId") == definition_id
                ]
            if message.get("from"):
                occurrences = [item for item in occurrences if _parse_iso(item["scheduledAt"]) >= _parse_iso(str(message["from"]))]
            if message.get("to"):
                occurrences = [item for item in occurrences if _parse_iso(item["scheduledAt"]) <= _parse_iso(str(message["to"]))]
            return {"contractVersion": CONTRACT_VERSION, "revision": self.revision, "occurrences": sorted(occurrences, key=lambda item: item.get("scheduledAt", ""))[:5000]}
        if message_type == "navet/chores/history/get":
            return {"contractVersion": CONTRACT_VERSION, "events": list(self._history)}
        if message_type == "navet/chores/events/get":
            after = max(0, int(message.get("after", 0)))
            events = [item for item in self._history[after:] if item.get("type") in AUTOMATION_EVENT_TYPES][: min(500, max(1, int(message.get("limit", 200))))]
            return {"contractVersion": CONTRACT_VERSION, "cursor": str(after + len(events)), "hasMore": after + len(events) < len(self._history), "events": events}
        if message_type == "navet/chores/backup/get":
            await self.async_initialize()
            return {"contract": "navet.chores", "version": 1, "exportedAt": _iso(_now()), "workspace": self.data, "events": self._history}
        if message_type == "navet/chores/restore":
            return await self.async_restore(message, user_id)
        if message_type == "navet/chores/reset":
            return await self.async_reset(message, user_id)
        if message_type == "navet/chores/recovery":
            return await self.async_recover(message, user_id)
        if message_type == "navet/chores/management/verify":
            return await self.async_verify_pin(str(message.get("pin", "")), user_id)
        if message_type == "navet/chores/management/pin":
            return await self.async_configure_pin(str(message.get("actorParticipantId", "")), str(message.get("pin", "")), str(message.get("managementSessionToken", "")) or None, user_id)
        if message_type == "navet/chores/management/pin/remove":
            return await self.async_remove_pin(str(message.get("actorParticipantId", "")), str(message.get("managementSessionToken", "")) or None, user_id)
        raise ChoreAuthorityError("Unsupported Navet chores command")

    async def async_service_action(
        self,
        service: str,
        service_data: Mapping[str, Any],
        context_id: str,
    ) -> dict[str, Any]:
        """Execute a registered ``navet.*`` action without a browser client."""
        await self.async_initialize()
        occurrence_action: dict[str, Any] = {
            "type": service,
            "participantId": str(service_data.get("participant_id", "")),
        }
        if reason := service_data.get("reason"):
            occurrence_action["reason"] = reason
        if assignee_ids := service_data.get("assignee_ids"):
            occurrence_action["assigneeIds"] = list(assignee_ids)
        return await self.async_command(
            {
                "commandId": (
                    f"ha:{context_id}:{service}:"
                    f"{service_data.get('occurrence_id', '')}"
                ),
                "baseRevision": self.revision,
                "action": {
                    "type": "occurrence_action",
                    "occurrenceId": str(service_data.get("occurrence_id", "")),
                    "action": occurrence_action,
                },
            }
        )


@callback
def register_chore_websocket_commands(hass: HomeAssistant) -> None:
    """Register the authenticated panel transport commands."""
    for command in (
        "navet/chores/info",
        "navet/chores/workspace/get",
        "navet/chores/workspace/subscribe",
        "navet/chores/command",
        "navet/chores/definitions/get",
        "navet/chores/occurrences/get",
        "navet/chores/events/get",
        "navet/chores/history/get",
        "navet/chores/backup/get",
        "navet/chores/restore",
        "navet/chores/reset",
        "navet/chores/recovery",
        "navet/chores/management/pin",
        "navet/chores/management/pin/remove",
        "navet/chores/management/verify",
    ):
        schema = websocket_api.BASE_COMMAND_MESSAGE_SCHEMA.extend(
            {vol.Required("type"): command},
            extra=vol.ALLOW_EXTRA,
        )
        websocket_api.async_register_command(
            hass,
            command,
            websocket_chore_command,
            schema,
        )


@websocket_api.async_response
async def websocket_chore_command(hass: HomeAssistant, connection: websocket_api.ActiveConnection, message: dict[str, Any]) -> None:
    """Handle Navet chores commands from an authenticated native panel."""
    authority: ChoreAuthority | None = hass.data.get(DOMAIN, {}).get("chore_authority")
    if authority is None:
        connection.send_error(message["id"], "not_ready", "Navet chores are not ready")
        return
    try:
        if message.get("type") == "navet/chores/workspace/subscribe":
            def send_update(document: dict[str, Any]) -> None:
                connection.send_event(message["id"], document)

            connection.subscriptions[message["id"]] = authority.subscribe(send_update)
            connection.send_result(message["id"])
            send_update(authority._public_document())
            return
        result = await authority.async_handle_ws(message, connection.user.id if connection.user else None)
        connection.send_result(message["id"], result)
    except ChoreConflictError as err:
        connection.send_message(
            {
                "id": message["id"],
                "type": "result",
                "success": False,
                "error": {
                    "code": err.code,
                    "message": str(err),
                    "data": {"revision": authority.revision},
                },
            }
        )
    except ChoreStorageError as err:
        connection.send_message(
            {
                "id": message["id"],
                "type": "result",
                "success": False,
                "error": {
                    "code": err.code,
                    "message": str(err),
                    "data": {
                        "recovery": authority._recovery
                        or {
                            "backupAvailable": True,
                            "pinConfigured": authority._security is not None,
                            "reason": "storage_unavailable",
                        }
                    },
                },
            }
        )
    except ChoreAuthorityError as err:
        connection.send_error(message["id"], err.code, str(err))
    except Exception as err:  # noqa: BLE001
        connection.send_error(message["id"], "unknown_error", str(err))
