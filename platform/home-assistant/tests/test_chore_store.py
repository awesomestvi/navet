"""Dependency-light contract tests for the Home Assistant chore authority.

The production integration is exercised through the same Store, service, timer,
and WebSocket-facing methods while tiny host fakes keep this suite runnable in
the main Navet CI job without installing Home Assistant itself.
"""

from __future__ import annotations

import copy
import importlib.util
import json
import pathlib
import sys
import types
import unittest
from datetime import datetime, timezone

_TRACKED_INTERVALS = []


class _Schema:
    def extend(self, _value, **_kwargs):
        return self


class _Store:
    values: dict[str, object] = {}

    def __init__(self, _hass, _version, key, **_kwargs):
        self.key = key

    async def async_load(self):
        return copy.deepcopy(self.values.get(self.key))

    async def async_save(self, value):
        self.values[self.key] = copy.deepcopy(value)

    async def async_remove(self):
        self.values.pop(self.key, None)


class _Bus:
    def __init__(self):
        self.events = []

    def async_fire(self, event_type, data):
        self.events.append((event_type, copy.deepcopy(data)))


class _Services:
    def __init__(self):
        self.calls = []
        self.error = None

    async def async_call(self, domain, service, data, **kwargs):
        self.calls.append((domain, service, copy.deepcopy(data), kwargs))
        if self.error:
            raise self.error


class _Hass:
    def __init__(self):
        self.data = {}
        self.bus = _Bus()
        self.services = _Services()


class _Connection:
    def __init__(self, user_id="ha-user-1"):
        self.user = types.SimpleNamespace(id=user_id)
        self.subscriptions = {}
        self.results = []
        self.events = []
        self.errors = []
        self.messages = []

    def send_result(self, message_id, result=None):
        self.results.append((message_id, copy.deepcopy(result)))

    def send_event(self, message_id, event):
        self.events.append((message_id, copy.deepcopy(event)))

    def send_error(self, message_id, code, message):
        self.errors.append((message_id, code, message))

    def send_message(self, message):
        self.messages.append(copy.deepcopy(message))


class _SensorEntity:
    def __init__(self):
        self._remove_callbacks = []
        self.write_count = 0

    async def async_added_to_hass(self):
        return None

    def async_on_remove(self, callback):
        self._remove_callbacks.append(callback)

    def async_write_ha_state(self):
        self.write_count += 1


def _install_host_fakes() -> None:
    voluptuous = types.ModuleType("voluptuous")
    voluptuous.Required = lambda value: value
    voluptuous.ALLOW_EXTRA = object()
    sys.modules["voluptuous"] = voluptuous

    websocket_api = types.ModuleType("homeassistant.components.websocket_api")
    websocket_api.ActiveConnection = object
    websocket_api.BASE_COMMAND_MESSAGE_SCHEMA = _Schema()
    websocket_api.async_register_command = lambda *_args, **_kwargs: None
    websocket_api.async_response = lambda function: function

    homeassistant = types.ModuleType("homeassistant")
    components = types.ModuleType("homeassistant.components")
    components.websocket_api = websocket_api
    sensor_component = types.ModuleType("homeassistant.components.sensor")
    sensor_component.SensorEntity = _SensorEntity
    core = types.ModuleType("homeassistant.core")
    core.HomeAssistant = object
    core.Event = object
    core.callback = lambda function: function
    config_entries = types.ModuleType("homeassistant.config_entries")
    config_entries.ConfigEntry = object
    helpers = types.ModuleType("homeassistant.helpers")
    event = types.ModuleType("homeassistant.helpers.event")

    def track_interval(_hass, callback, interval):
        registration = {
            "callback": callback,
            "interval": interval,
            "cancelled": False,
        }
        _TRACKED_INTERVALS.append(registration)

        def cancel():
            registration["cancelled"] = True

        return cancel

    event.async_track_time_interval = track_interval
    storage = types.ModuleType("homeassistant.helpers.storage")
    storage.Store = _Store
    entity_platform = types.ModuleType("homeassistant.helpers.entity_platform")
    entity_platform.AddConfigEntryEntitiesCallback = object
    util = types.ModuleType("homeassistant.util")
    dt = types.ModuleType("homeassistant.util.dt")
    dt.utcnow = lambda: datetime.now(timezone.utc)
    util.dt = dt

    sys.modules.update(
        {
            "homeassistant": homeassistant,
            "homeassistant.components": components,
            "homeassistant.components.sensor": sensor_component,
            "homeassistant.components.websocket_api": websocket_api,
            "homeassistant.config_entries": config_entries,
            "homeassistant.core": core,
            "homeassistant.helpers": helpers,
            "homeassistant.helpers.event": event,
            "homeassistant.helpers.entity_platform": entity_platform,
            "homeassistant.helpers.storage": storage,
            "homeassistant.util": util,
            "homeassistant.util.dt": dt,
        }
    )

    package = types.ModuleType("navet")
    package.__path__ = []
    const = types.ModuleType("navet.const")
    const.DOMAIN = "navet"
    const.CHORE_PROJECTION_EVENT = "navet_chore_projection"
    sys.modules["navet"] = package
    sys.modules["navet.const"] = const


def _load_module():
    _install_host_fakes()
    path = (
        pathlib.Path(__file__).parents[1]
        / "custom_components"
        / "navet"
        / "chore_store.py"
    )
    spec = importlib.util.spec_from_file_location("navet.chore_store", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def _load_sensor_module():
    path = (
        pathlib.Path(__file__).parents[1]
        / "custom_components"
        / "navet"
        / "sensor.py"
    )
    spec = importlib.util.spec_from_file_location("navet.sensor", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


chores = _load_module()
sensors = _load_sensor_module()


def _participant(participant_id="manager", *, destination=None):
    timestamp = "2026-08-28T08:00:00.000Z"
    participant = {
        "id": participant_id,
        "displayName": participant_id.title(),
        "capabilities": ["complete", "approve", "manage"],
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    if destination:
        participant["reminderPreferences"] = {
            "enabled": True,
            "destination": destination,
        }
    return participant


class ChoreAuthorityTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _Store.values.clear()
        _TRACKED_INTERVALS.clear()
        self.hass = _Hass()
        self.authority = chores.ChoreAuthority(self.hass)

    async def _create_manager(self):
        return await self.authority.async_command(
            {
                "commandId": "manager-create",
                "baseRevision": 0,
                "action": {
                    "type": "participant_create",
                    "participant": _participant(),
                },
            },
            "ha-user-1",
        )

    async def test_shared_materialization_conformance_vectors(self):
        vector_path = (
            pathlib.Path(__file__).parents[3]
            / "packages"
            / "core"
            / "src"
            / "chore-conformance-vectors.json"
        )
        vectors = json.loads(vector_path.read_text(encoding="utf-8"))
        for vector in vectors["materialization"]:
            with self.subTest(vector=vector["name"]):
                data = chores._empty_data()
                data["participantsById"] = {
                    participant["id"]: participant
                    for participant in vector["participants"]
                }
                data["definitionsById"] = {
                    vector["definition"]["id"]: vector["definition"]
                }
                materialized, _activities = chores._materialize(
                    data,
                    vector["rangeStart"],
                    vector["rangeEnd"],
                    vector["rangeStart"],
                    "conformance",
                )
                actual = [
                    {
                        "scheduledAt": occurrence["scheduledAt"],
                        "assigneeIds": occurrence["assigneeIds"],
                    }
                    for occurrence in sorted(
                        materialized["occurrencesById"].values(),
                        key=lambda item: item["scheduledAt"],
                    )
                ]
                self.assertEqual(actual, vector["expected"])

    async def test_quiet_hours_defer_home_assistant_delivery_across_midnight(self):
        participant = _participant(
            destination={"type": "home_assistant", "target": "mobile_app_phone"}
        )
        participant["reminderPreferences"]["quietHours"] = {
            "start": "21:00",
            "end": "07:00",
            "timeZone": "Europe/Stockholm",
        }
        self.assertEqual(
            chores._next_delivery_at(
                datetime(2026, 8, 28, 20, 30, tzinfo=timezone.utc),
                participant,
                "UTC",
            ),
            "2026-08-29T05:00:00.000Z",
        )

    async def test_schema_v1_migration_and_malformed_workspace_rejection(self):
        migrated = chores._normalize_data(
            {
                "schemaVersion": 1,
                "participantsById": {},
                "definitionsById": {},
                "occurrencesById": {},
                "activity": [],
            }
        )
        self.assertEqual(migrated["schemaVersion"], 2)
        self.assertEqual(migrated["outbox"], [])
        malformed = chores._empty_data()
        malformed["activity"] = [{"commandId": "bad", "type": "done"}]
        with self.assertRaises(chores.ChoreStorageError):
            chores._normalize_data(malformed)

    async def test_completion_and_reopen_record_exact_point_deltas(self):
        data = chores._empty_data()
        data["participantsById"] = {"manager": _participant()}
        data["definitionsById"] = {
            "dishes": {
                "id": "dishes",
                "title": "Empty dishes",
                "enabled": True,
                "assignment": {"mode": "person", "participantIds": ["manager"]},
                "approval": {"required": False, "approverIds": []},
            }
        }
        data["occurrencesById"] = {
            "dishes:today:manager": {
                "id": "dishes:today:manager",
                "definitionId": "dishes",
                "scheduledAt": "2026-08-28T08:00:00.000Z",
                "assigneeIds": ["manager"],
                "assignmentSlot": "manager",
                "status": "available",
                "updatedAt": "2026-08-28T08:00:00.000Z",
            }
        }
        data["experience"] = {
            **data["experience"],
            "gamificationMode": "light",
            "presentationByDefinitionId": {"dishes": {"points": 15}},
        }
        completed, completion = chores._apply_occurrence(
            data,
            "dishes:today:manager",
            {"type": "complete", "participantId": "manager"},
            "2026-08-28T09:00:00.000Z",
            "complete-with-points",
        )
        self.assertEqual(
            completed["experience"]["earnedPointsByParticipant"], {"manager": 15}
        )
        self.assertEqual(completion["pointsDelta"], 15)
        self.assertEqual(completion["participantId"], "manager")

        reopened, reversal = chores._apply_occurrence(
            completed,
            "dishes:today:manager",
            {"type": "reopen", "participantId": "manager", "reason": "Redo"},
            "2026-08-28T09:05:00.000Z",
            "reopen-with-points",
        )
        self.assertEqual(
            reopened["experience"]["earnedPointsByParticipant"], {"manager": 0}
        )
        self.assertEqual(reversal["pointsDelta"], -15)
        self.assertEqual(reversal["participantId"], "manager")

    async def test_durable_history_applies_workspace_retention(self):
        await self.authority.async_initialize()
        self.authority._history = [
            {
                "id": "activity:expired",
                "commandId": "expired",
                "type": "completed",
                "timestamp": "2020-01-01T00:00:00.000Z",
            }
        ]
        await self._create_manager()
        saved_ids = {
            item["id"] for item in _Store.values[chores.HISTORY_KEY]["events"]
        }
        self.assertNotIn("activity:expired", saved_ids)
        self.assertIn("activity:manager-create", saved_ids)

    async def test_missed_policy_carries_forward_once(self):
        fixed_now = datetime(2026, 8, 28, 12, 0, tzinfo=timezone.utc)
        original_now = chores._now
        chores._now = lambda: fixed_now
        self.addCleanup(setattr, chores, "_now", original_now)
        await self._create_manager()
        await self.authority.async_command(
            {
                "commandId": "carry-definition",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "definition_create",
                    "actorParticipantId": "manager",
                    "definition": {
                        "id": "carry",
                        "title": "Carry chore",
                        "enabled": True,
                        "assignment": {
                            "mode": "person",
                            "participantIds": ["manager"],
                        },
                        "schedule": {
                            "frequency": "once",
                            "date": "2026-08-28",
                            "time": "10:00",
                            "timeZone": "UTC",
                        },
                        "dueWindowMinutes": 0,
                        "missedPolicy": {
                            "graceMinutes": 30,
                            "action": "carry_forward",
                            "carryForwardDays": 2,
                        },
                        "approval": {"required": False, "approverIds": []},
                        "createdAt": "2026-08-28T08:00:00.000Z",
                        "updatedAt": "2026-08-28T08:00:00.000Z",
                    },
                },
            },
            "ha-user-1",
        )
        await self.authority.async_tick()
        original = next(
            item
            for item in self.authority.data["occurrencesById"].values()
            if item["definitionId"] == "carry" and not item.get("carriedForwardFrom")
        )
        carried_id = original["carriedForwardTo"]
        self.assertEqual(original["status"], "missed")
        self.assertEqual(
            self.authority.data["occurrencesById"][carried_id]["scheduledAt"],
            "2026-08-30T10:00:00.000Z",
        )
        await self.authority.async_tick()
        self.assertEqual(
            sum(
                1
                for item in self.authority.data["occurrencesById"].values()
                if item.get("carriedForwardFrom") == original["id"]
            ),
            1,
        )

    async def test_cas_idempotency_subscription_and_restart_persistence(self):
        updates = []
        self.authority.subscribe(updates.append)
        first = await self._create_manager()
        duplicate = await self.authority.async_command(
            {
                "commandId": "manager-create",
                "baseRevision": 0,
                "action": {
                    "type": "participant_create",
                    "participant": _participant(),
                },
            },
            "ha-user-1",
        )
        self.assertEqual(first["revision"], 1)
        self.assertEqual(duplicate["revision"], 1)
        self.assertEqual(len(updates), 1)

        with self.assertRaises(chores.ChoreConflictError):
            await self.authority.async_command(
                {
                    "commandId": "stale-command",
                    "baseRevision": 0,
                    "action": {
                        "type": "participant_create",
                        "participant": _participant("other"),
                        "actorParticipantId": "manager",
                    },
                },
                "ha-user-1",
            )

        restarted = chores.ChoreAuthority(_Hass())
        await restarted.async_initialize()
        self.assertEqual(restarted.revision, 1)
        self.assertIn("manager", restarted.data["participantsById"])

    async def test_authenticated_websocket_subscription_and_stale_error_shape(self):
        self.hass.data["navet"] = {"chore_authority": self.authority}
        await self.authority.async_initialize()
        connection = _Connection("ha-user-1")
        await chores.websocket_chore_command(
            self.hass,
            connection,
            {"id": 1, "type": "navet/chores/workspace/subscribe"},
        )
        self.assertEqual(connection.results, [(1, None)])
        self.assertEqual(connection.events[-1][1]["revision"], 0)
        self.assertIn(1, connection.subscriptions)

        await self._create_manager()
        self.assertEqual(connection.events[-1][1]["revision"], 1)
        await chores.websocket_chore_command(
            self.hass,
            connection,
            {
                "id": 2,
                "type": "navet/chores/command",
                "commandId": "stale-ws",
                "baseRevision": 0,
                "action": {
                    "type": "participant_create",
                    "actorParticipantId": "manager",
                    "participant": _participant("other"),
                },
            },
        )
        self.assertEqual(
            connection.messages[-1]["error"],
            {
                "code": "stale_revision",
                "message": "Chore workspace changed on another client",
                "data": {"revision": 1},
            },
        )

    async def test_coordinator_starts_immediately_and_unloads_its_timer(self):
        await self.authority.async_start()
        self.assertIsNotNone((await self.authority.async_info())["lastSchedulerRunAt"])
        self.assertEqual(len(_TRACKED_INTERVALS), 1)
        self.assertEqual(
            _TRACKED_INTERVALS[0]["interval"], chores.BACKGROUND_INTERVAL
        )

        await self.authority.async_stop()
        self.assertTrue(_TRACKED_INTERVALS[0]["cancelled"])

    async def test_management_sessions_are_memory_only_and_user_bound(self):
        await self._create_manager()
        session = await self.authority.async_configure_pin(
            "manager", "2468", None, "ha-user-1"
        )
        self.assertTrue(
            self.authority._session_valid(session["sessionToken"], "ha-user-1")
        )
        self.assertFalse(
            self.authority._session_valid(session["sessionToken"], "ha-user-2")
        )
        backup = await self.authority.async_handle_ws(
            {"type": "navet/chores/backup/get"}, "ha-user-1"
        )
        self.assertNotIn("security", backup)
        self.assertNotIn("pinHash", json.dumps(backup))
        restarted = chores.ChoreAuthority(_Hass())
        await restarted.async_initialize()
        self.assertFalse(
            restarted._session_valid(session["sessionToken"], "ha-user-1")
        )

    async def test_signed_point_adjustment_requires_management_and_keeps_audit_details(self):
        await self._create_manager()
        session = await self.authority.async_configure_pin(
            "manager", "2468", None, "ha-user-1"
        )
        request = {
            "commandId": "adjust-manager-points",
            "baseRevision": self.authority.revision,
            "action": {
                "type": "experience_points_adjust",
                "actorParticipantId": "manager",
                "participantId": "manager",
                "pointsDelta": -20,
            },
        }
        with self.assertRaisesRegex(
            chores.ChoreAuthorityError, "Unlock chore management"
        ):
            await self.authority.async_command(request, "ha-user-1")

        document = await self.authority.async_command(
            {**request, "managementSessionToken": session["sessionToken"]},
            "ha-user-1",
        )
        self.assertEqual(
            document["data"]["experience"]["earnedPointsByParticipant"],
            {"manager": -20},
        )
        self.assertEqual(
            document["data"]["activity"][-1],
            {
                "id": "activity:adjust-manager-points",
                "commandId": "adjust-manager-points",
                "type": "points_adjusted",
                "timestamp": document["data"]["activity"][-1]["timestamp"],
                "actorParticipantId": "manager",
                "participantId": "manager",
                "pointsDelta": -20,
            },
        )
        self.assertFalse(
            any(
                item["eventType"] == "points_adjusted"
                for item in document["data"]["outbox"]
            )
        )
        retried = await self.authority.async_command(
            {**request, "managementSessionToken": session["sessionToken"]},
            "ha-user-1",
        )
        self.assertEqual(retried["revision"], document["revision"])
        self.assertEqual(
            retried["data"]["experience"]["earnedPointsByParticipant"],
            {"manager": -20},
        )

    async def test_management_pin_can_be_removed_by_an_unlocked_manager(self):
        await self._create_manager()
        session = await self.authority.async_configure_pin(
            "manager", "2468", None, "ha-user-1"
        )

        with self.assertRaisesRegex(
            chores.ChoreAuthorityError,
            "Unlock chore management before removing its PIN",
        ):
            await self.authority.async_remove_pin(
                "manager", "wrong-session", "ha-user-1"
            )

        result = await self.authority.async_remove_pin(
            "manager", session["sessionToken"], "ha-user-1"
        )
        self.assertEqual(result, {"pinConfigured": False})
        self.assertEqual(
            self.authority._public_document()["management"],
            {"pinConfigured": False},
        )
        self.assertNotIn(chores.SECURITY_KEY, _Store.values)

    async def test_service_action_updates_chores_without_a_panel(self):
        await self._create_manager()
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        await self.authority.async_command(
            {
                "commandId": "definition-create",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "definition_create",
                    "actorParticipantId": "manager",
                    "definition": {
                        "id": "daily",
                        "title": "Daily chore",
                        "enabled": True,
                        "assignment": {
                            "mode": "person",
                            "participantIds": ["manager"],
                        },
                        "schedule": {
                            "frequency": "once",
                            "date": timestamp[:10],
                            "time": timestamp[11:16],
                            "timeZone": "UTC",
                        },
                        "dueWindowMinutes": 60,
                        "approval": {"required": False, "approverIds": []},
                        "createdAt": timestamp,
                        "updatedAt": timestamp,
                    },
                },
            },
            "ha-user-1",
        )
        await self.authority.async_tick()
        occurrence_id = next(iter(self.authority.data["occurrencesById"]))
        await self.authority.async_service_action(
            "complete",
            {"occurrence_id": occurrence_id, "participant_id": "manager"},
            "ha-context-1",
        )
        self.assertEqual(
            self.authority.data["occurrencesById"][occurrence_id]["status"],
            "done",
        )

    async def test_every_registered_service_action_runs_without_a_panel(self):
        await self._create_manager()
        await self.authority.async_command(
            {
                "commandId": "other-create",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "participant_create",
                    "actorParticipantId": "manager",
                    "participant": _participant("other"),
                },
            },
            "ha-user-1",
        )
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        await self.authority.async_command(
            {
                "commandId": "service-definition",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "definition_create",
                    "actorParticipantId": "manager",
                    "definition": {
                        "id": "services",
                        "title": "Service chore",
                        "enabled": True,
                        "assignment": {
                            "mode": "shared",
                            "participantIds": ["manager", "other"],
                        },
                        "schedule": {
                            "frequency": "once",
                            "date": timestamp[:10],
                            "time": timestamp[11:16],
                            "timeZone": "UTC",
                        },
                        "dueWindowMinutes": 60,
                        "approval": {
                            "required": True,
                            "approverIds": ["manager"],
                        },
                        "createdAt": timestamp,
                        "updatedAt": timestamp,
                    },
                },
            },
            "ha-user-1",
        )
        await self.authority.async_tick()
        occurrence_id = next(
            occurrence_id
            for occurrence_id, occurrence in self.authority.data[
                "occurrencesById"
            ].items()
            if occurrence["definitionId"] == "services"
        )

        calls = [
            ("claim", {"participant_id": "manager"}),
            ("complete", {"participant_id": "manager"}),
            ("approve", {"participant_id": "manager"}),
            ("reopen", {"participant_id": "manager", "reason": "Redo"}),
            (
                "reassign",
                {
                    "participant_id": "manager",
                    "assignee_ids": ["other"],
                    "reason": "Swap",
                },
            ),
            ("skip", {"participant_id": "manager", "reason": "Away"}),
            ("reopen", {"participant_id": "manager", "reason": "Back"}),
            ("complete", {"participant_id": "other"}),
            ("reject", {"participant_id": "manager", "reason": "Try again"}),
        ]
        for index, (service, data) in enumerate(calls):
            await self.authority.async_service_action(
                service,
                {"occurrence_id": occurrence_id, **data},
                f"ha-context-{index}",
            )
        self.assertEqual(
            self.authority.data["occurrencesById"][occurrence_id]["status"],
            "available",
        )

    async def test_sensor_restores_and_tracks_the_durable_authority_projection(self):
        self.hass.data["navet"] = {"chore_authority": self.authority}
        await self.authority.async_initialize()
        sensor = sensors.NavetChoresSensor("entry-1")
        _SensorEntity.__init__(sensor)
        sensor.hass = self.hass
        await sensor.async_added_to_hass()
        self.assertEqual(sensor.extra_state_attributes["revision"], 0)

        await self._create_manager()
        self.assertEqual(sensor.extra_state_attributes["revision"], 1)
        self.assertEqual(sensor.write_count, 1)

    async def test_background_reminder_uses_home_assistant_and_records_delivery(self):
        manager = _participant(
            destination={"type": "home_assistant", "target": "notify.mobile_app_phone"}
        )
        await self.authority.async_command(
            {
                "commandId": "manager-create",
                "baseRevision": 0,
                "action": {"type": "participant_create", "participant": manager},
            },
            "ha-user-1",
        )
        now = datetime.now(timezone.utc)
        timestamp = now.isoformat().replace("+00:00", "Z")
        await self.authority.async_command(
            {
                "commandId": "reminder-definition",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "definition_create",
                    "actorParticipantId": "manager",
                    "definition": {
                        "id": "reminder",
                        "title": "Reminder chore",
                        "enabled": True,
                        "assignment": {
                            "mode": "person",
                            "participantIds": ["manager"],
                        },
                        "schedule": {
                            "frequency": "once",
                            "date": timestamp[:10],
                            "time": timestamp[11:16],
                            "timeZone": "UTC",
                        },
                        "dueWindowMinutes": 0,
                        "approval": {"required": False, "approverIds": []},
                        "reminderPolicy": {
                            "enabled": True,
                            "beforeDueMinutes": [],
                            "atDue": True,
                        },
                        "createdAt": timestamp,
                        "updatedAt": timestamp,
                    },
                },
            },
            "ha-user-1",
        )
        await self.authority.async_tick()
        self.assertTrue(self.hass.services.calls)
        self.assertEqual(self.hass.services.calls[0][0:2], ("notify", "mobile_app_phone"))
        reminders = [
            item
            for item in self.authority.data["outbox"]
            if str(item["eventType"]).startswith("reminder_")
        ]
        self.assertEqual(reminders[0]["status"], "delivered")

    async def test_primary_corruption_restores_and_repairs_last_good_workspace(self):
        await self._create_manager()
        await self.authority.async_command(
            {
                "commandId": "other-create",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "participant_create",
                    "actorParticipantId": "manager",
                    "participant": _participant("other"),
                },
            },
            "ha-user-1",
        )
        _Store.values[chores.WORKSPACE_KEY] = {
            "contractVersion": 1,
            "revision": 99,
            "updatedAt": "2026-08-28T08:00:00.000Z",
            "data": {"schemaVersion": 999},
        }

        recovered = chores.ChoreAuthority(_Hass())
        await recovered.async_initialize()
        self.assertIn("manager", recovered.data["participantsById"])
        self.assertNotIn("other", recovered.data["participantsById"])
        self.assertEqual(
            _Store.values[chores.WORKSPACE_KEY]["data"], recovered.data
        )

        restarted = chores.ChoreAuthority(_Hass())
        await restarted.async_initialize()
        self.assertEqual(restarted.data, recovered.data)

    async def test_unrecoverable_primary_exposes_recovery_and_allows_confirmed_reset(self):
        _Store.values[chores.WORKSPACE_KEY] = {
            "contractVersion": 1,
            "revision": 7,
            "updatedAt": "2026-08-28T08:00:00.000Z",
            "data": {"schemaVersion": 999},
        }
        authority = chores.ChoreAuthority(_Hass())
        await authority.async_initialize()
        with self.assertRaises(chores.ChoreStorageError) as raised:
            await authority.async_handle_ws(
                {"type": "navet/chores/workspace/get"}, "ha-user-1"
            )
        self.assertEqual(raised.exception.code, "workspace_invalid")
        self.assertEqual(authority._recovery["reason"], "workspace_invalid")

        reset = await authority.async_recover(
            {"action": "reset", "confirmation": "RESET CHORES"}, "ha-user-1"
        )
        self.assertEqual(reset["revision"], 8)
        self.assertIsNone(authority._recovery)

    async def test_merge_restore_remaps_collisions_and_never_replays_imported_outbox(self):
        await self._create_manager()
        imported = chores._empty_data()
        imported["participantsById"]["manager"] = {
            **_participant(),
            "displayName": "Imported manager",
        }
        imported["definitionsById"]["shared"] = {
            "id": "shared",
            "title": "Imported chore",
            "enabled": True,
            "assignment": {"mode": "person", "participantIds": ["manager"]},
            "schedule": {
                "frequency": "once",
                "date": "2026-08-29",
                "time": "08:00",
                "timeZone": "UTC",
            },
            "dueWindowMinutes": 60,
            "approval": {"required": False, "approverIds": ["manager"]},
            "createdAt": "2026-08-28T08:00:00.000Z",
            "updatedAt": "2026-08-28T08:00:00.000Z",
        }
        imported["outbox"] = [
            {
                "id": "outbox:imported",
                "activityId": "imported",
                "eventType": "completed",
                "status": "pending",
                "attempts": 0,
                "createdAt": "2026-08-28T08:00:00.000Z",
                "nextAttemptAt": "2026-08-28T08:00:00.000Z",
            }
        ]
        await self.authority.async_restore(
            {
                "commandId": "merge-import",
                "baseRevision": self.authority.revision,
                "actorParticipantId": "manager",
                "mode": "merge",
                "document": {
                    "contract": "navet.chores",
                    "version": 1,
                    "exportedAt": "2026-08-28T08:00:00.000Z",
                    "workspace": imported,
                    "events": [],
                },
            },
            "ha-user-1",
        )
        self.assertIn("manager~import-2", self.authority.data["participantsById"])
        imported_definition = next(
            item
            for item in self.authority.data["definitionsById"].values()
            if item["title"] == "Imported chore"
        )
        self.assertEqual(
            imported_definition["assignment"]["participantIds"],
            ["manager~import-2"],
        )
        self.assertNotIn(
            "outbox:imported",
            {item["id"] for item in self.authority.data["outbox"]},
        )

    async def test_notification_failure_is_retained_and_retried(self):
        self.hass.services.error = RuntimeError("Home Assistant unavailable")
        manager = _participant(
            destination={"type": "home_assistant", "target": "mobile_app_phone"}
        )
        await self.authority.async_command(
            {
                "commandId": "manager-create",
                "baseRevision": 0,
                "action": {"type": "participant_create", "participant": manager},
            },
            "ha-user-1",
        )
        now = datetime.now(timezone.utc)
        timestamp = now.isoformat().replace("+00:00", "Z")
        await self.authority.async_command(
            {
                "commandId": "retry-definition",
                "baseRevision": self.authority.revision,
                "action": {
                    "type": "definition_create",
                    "actorParticipantId": "manager",
                    "definition": {
                        "id": "retry",
                        "title": "Retry chore",
                        "enabled": True,
                        "assignment": {"mode": "person", "participantIds": ["manager"]},
                        "schedule": {"frequency": "once", "date": timestamp[:10], "time": timestamp[11:16], "timeZone": "UTC"},
                        "dueWindowMinutes": 0,
                        "approval": {"required": False, "approverIds": []},
                        "reminderPolicy": {"enabled": True, "beforeDueMinutes": [], "atDue": True},
                        "createdAt": timestamp,
                        "updatedAt": timestamp,
                    },
                },
            },
            "ha-user-1",
        )
        await self.authority.async_tick()
        reminder = next(
            item
            for item in self.authority.data["outbox"]
            if str(item["eventType"]).startswith("reminder_")
        )
        self.assertEqual(reminder["status"], "failed")
        self.assertGreaterEqual(reminder["attempts"], 1)

        self.hass.services.error = None
        reminder["nextAttemptAt"] = "2026-01-01T00:00:00.000Z"
        await self.authority._deliver_pending()
        reminder = next(
            item
            for item in self.authority.data["outbox"]
            if item["id"] == reminder["id"]
        )
        self.assertEqual(reminder["status"], "delivered")


if __name__ == "__main__":
    unittest.main()
