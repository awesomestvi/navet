/**
 * Calendar devices hook
 * Handles calendar entity mapping and event fetching
 * Returns an aggregated calendar device combining all calendar entities
 */

import type { Connection } from 'home-assistant-js-websocket';
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { shallow } from 'zustand/shallow';
import { CALENDAR_EVENTS_REFRESH_INTERVAL } from '@/app/constants';
import { mapCalendarSources } from '@/app/hooks/ha-device-mappers';
import { getName, resolveEntityRoom } from '@/app/hooks/ha-entity-utils';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { useRegistryRoomResolver } from '@/app/hooks/use-registry-device-topology';
import { useI18n } from '@/app/i18n';
import { homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { CalendarDevice } from '@/app/types/device.types';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';
import { haEntityStructureEqual } from '@/app/utils/ha-entity-structure-equal';

type CalendarServiceEvent = Record<string, unknown>;

type CalendarEventsServicePayload = {
  response?: Record<
    string,
    {
      events?: CalendarServiceEvent[];
    }
  >;
};

type CalendarEventsServiceEnvelope = CalendarEventsServicePayload & {
  result?: CalendarEventsServicePayload;
};

async function fetchCalendarEvents(
  connection: Connection,
  entityId: string
): Promise<CalendarServiceEvent[]> {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = (await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'calendar',
    service: 'get_events',
    target: { entity_id: entityId },
    service_data: {
      start_date_time: now.toISOString(),
      end_date_time: end.toISOString(),
    },
    return_response: true,
  })) as CalendarEventsServiceEnvelope;

  const payload = response.response ?? response.result?.response;
  return payload?.[entityId]?.events ?? [];
}

export function useCalendarDevices(): CalendarDevice[] {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const entities = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const { areaMap, deviceRegistryMap, entityRegistryMap } = useRegistryRoomResolver();
  const { locale, t } = useI18n();
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const calendarEntityIds = useMemo(() => {
    if (!entities) {
      return [];
    }

    return Object.keys(entities)
      .filter((entityId) => entityId.startsWith('calendar.'))
      .sort((left, right) => left.localeCompare(right));
  }, [entities]);

  const liveCalendarEntities = useHomeAssistant(
    useCallback(
      (state) =>
        Object.fromEntries(
          calendarEntityIds.map((entityId) => [entityId, state.entities?.[entityId] ?? null])
        ),
      [calendarEntityIds]
    ),
    shallow
  );

  const [calendarEvents, setCalendarEvents] = useState<Record<string, CalendarServiceEvent[]>>({});
  const deferredCalendarEvents = useDeferredValue(calendarEvents);

  useEffect(() => {
    if (!connection || calendarEntityIds.length === 0) {
      startTransition(() => {
        setCalendarEvents({});
      });
      return;
    }

    const activeConnection = connection;
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      refreshTimer = setTimeout(() => {
        void refreshEvents();
      }, CALENDAR_EVENTS_REFRESH_INTERVAL);
    };

    async function refreshEvents() {
      const entries = await Promise.all(
        calendarEntityIds.map(async (entityId) => {
          const events = await fetchCalendarEvents(activeConnection, entityId).catch(() => []);
          return [entityId, events] as const;
        })
      );
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setCalendarEvents(Object.fromEntries(entries));
      });

      if (!cancelled) {
        scheduleRefresh();
      }
    }

    void refreshEvents();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [calendarEntityIds, connection]);

  return useMemo(() => {
    if (!entities || calendarEntityIds.length === 0) {
      return [];
    }

    const calendarSources: CalendarDevice['sources'] = [];
    for (const entityId of calendarEntityIds) {
      const entity = liveCalendarEntities[entityId] ?? entities[entityId];
      if (!entity) {
        continue;
      }

      const room = resolveEntityRoom(
        entityId,
        entity,
        areaMap,
        entityRegistryMap,
        deviceRegistryMap
      );
      const entityEntry = entityRegistryMap.get(entityId);
      calendarSources.push(
        ...mapCalendarSources(entityId, entity, getName(entity, entityEntry), room, {
          calendarEvents: deferredCalendarEvents,
          locale,
          t,
          use24HourTime,
        })
      );
    }

    if (calendarSources.length === 0) {
      return [];
    }

    const roomSet = new Set(calendarSources.map((source) => source.room).filter(Boolean));
    const fallbackEventColors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-indigo-500',
    ] as const;
    const singleRoom = roomSet.size === 1 ? roomSet.values().next().value : null;
    const combinedEvents = calendarSources
      .flatMap((source, index) =>
        source.events.map((event) => ({
          ...event,
          color:
            event.color || fallbackEventColors[index % fallbackEventColors.length] || 'bg-blue-500',
        }))
      )
      .sort((left, right) => {
        const leftKey = left.sortKey ?? left.startTime;
        const rightKey = right.sortKey ?? right.startTime;
        return leftKey.localeCompare(rightKey);
      })
      .slice(0, 12);

    return [
      {
        id: 'calendar.navet_overview',
        name: t('calendar.defaultTitle'),
        room: singleRoom ?? UNKNOWN_ROOM_LABEL,
        size: 'medium',
        sourceIds: calendarSources.map((source) => source.id),
        sources: calendarSources,
        events: combinedEvents,
      },
    ];
  }, [
    areaMap,
    calendarEntityIds,
    deferredCalendarEvents,
    deviceRegistryMap,
    entities,
    entityRegistryMap,
    liveCalendarEntities,
    locale,
    t,
    use24HourTime,
  ]);
}
