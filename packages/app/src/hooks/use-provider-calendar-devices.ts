import { CALENDAR_EVENTS_REFRESH_INTERVAL } from '@navet/app/constants';
import { mapCalendarSources } from '@navet/app/hooks/device-mappers';
import { useI18n } from '@navet/app/i18n';
import type {
  PlatformCalendarDevice,
  PlatformCalendarEvent,
} from '@navet/app/platform/provider-feature-models';
import { integrationCalendarFeatureService } from '@navet/app/services/integration-calendar-feature.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { areDataEqual, areStringArraysEqual } from '@navet/app/utils/structural-equality';
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useIntegrationStore } from './use-integration-store';
import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshots,
} from './use-provider-entity';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_CALENDAR_DEVICES: PlatformCalendarDevice[] = [];
const EMPTY_CALENDAR_ENTITY_IDS: string[] = [];

function resolveEntityName(
  entityId: string,
  entity: { attributes?: Record<string, unknown> },
  entityName?: string | null
) {
  if (typeof entityName === 'string' && entityName.trim().length > 0) {
    return entityName.trim();
  }

  return (
    (typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name) ||
    entityId ||
    'Unknown'
  );
}

function resolveEntityRoom(
  _scopedEntityId: string,
  entity: { attributes?: Record<string, unknown> },
  entityRoom?: string
) {
  return (
    entityRoom ||
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}

export function useProviderCalendarDevices(
  providerId?: IntegrationProviderId,
  options?: { enabled?: boolean }
): PlatformCalendarDevice[] {
  const enabled = options?.enabled ?? true;
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const providerRuntime = useIntegrationStore(
    (state) =>
      state.providerRuntime[resolvedProviderId] ?? state.providerRuntime[state.currentProviderId]
  );
  const supportsCalendar = useProviderFeature('calendar', resolvedProviderId) && enabled;
  const entities = useProviderEntitySnapshots({
    providerId: resolvedProviderId,
    enabled: supportsCalendar,
  });
  const entityRegistry = useProviderEntityRegistryEntries({
    providerId: resolvedProviderId,
    enabled: supportsCalendar,
  });
  const { locale, t } = useI18n();
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const calendarEntityIds = useMemo(() => {
    if (!supportsCalendar || !entities) {
      return EMPTY_CALENDAR_ENTITY_IDS;
    }

    return Object.keys(entities)
      .filter((entityId) => entityId.startsWith('calendar.'))
      .sort((left, right) => left.localeCompare(right));
  }, [entities, supportsCalendar]);
  const stableCalendarEntityIdsRef = useRef<string[]>(EMPTY_CALENDAR_ENTITY_IDS);
  const stableCalendarEntityIds = useMemo(() => {
    if (areStringArraysEqual(stableCalendarEntityIdsRef.current, calendarEntityIds)) {
      return stableCalendarEntityIdsRef.current;
    }

    stableCalendarEntityIdsRef.current = calendarEntityIds;
    return calendarEntityIds;
  }, [calendarEntityIds]);

  const entityRegistryMap = useMemo(
    () => new Map(entityRegistry.map((entry) => [entry.entityId, entry])),
    [entityRegistry]
  );
  const [calendarEvents, setCalendarEvents] = useState<Record<string, PlatformCalendarEvent[]>>({});
  const deferredCalendarEvents = useDeferredValue(calendarEvents);
  const lastResolvedDevicesRef = useRef<PlatformCalendarDevice[]>(EMPTY_CALENDAR_DEVICES);

  useEffect(() => {
    if (!supportsCalendar || stableCalendarEntityIds.length === 0) {
      startTransition(() => {
        setCalendarEvents({});
      });
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      refreshTimer = setTimeout(() => {
        void refreshEvents();
      }, CALENDAR_EVENTS_REFRESH_INTERVAL);
    };

    async function refreshEvents() {
      const entries = await Promise.all(
        stableCalendarEntityIds.map(async (entityId) => {
          const events = await integrationCalendarFeatureService
            .getEvents(createProviderScopedId(resolvedProviderId, entityId))
            .catch(() => []);
          return [entityId, events] as const;
        })
      );
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setCalendarEvents((previousEvents) => {
          const nextEvents = Object.fromEntries(entries);
          return areDataEqual(previousEvents, nextEvents) ? previousEvents : nextEvents;
        });
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
  }, [resolvedProviderId, stableCalendarEntityIds, supportsCalendar]);

  const resolvedDevices = useMemo<PlatformCalendarDevice[]>(() => {
    if (!entities || stableCalendarEntityIds.length === 0) {
      return EMPTY_CALENDAR_DEVICES;
    }

    const calendarSources: PlatformCalendarDevice['sources'] = [];
    for (const entityId of stableCalendarEntityIds) {
      const entity = entities[entityId];
      if (!entity) {
        continue;
      }

      const scopedEntityId = createProviderScopedId(resolvedProviderId, entityId);
      calendarSources.push(
        ...mapCalendarSources(
          scopedEntityId,
          entity,
          resolveEntityName(entityId, entity, entityRegistryMap.get(entityId)?.name),
          resolveEntityRoom(scopedEntityId, entity, undefined),
          {
            calendarEvents: deferredCalendarEvents,
            eventLookupId: entityId,
            locale,
            t,
            use24HourTime,
          }
        )
      );
    }

    if (calendarSources.length === 0) {
      return EMPTY_CALENDAR_DEVICES;
    }

    const roomSet = new Set(calendarSources.map((source) => source.room).filter(Boolean));
    const fallbackEventColors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-indigo-500',
    ] as const;
    const singleRoom =
      roomSet.size === 1 ? ((roomSet.values().next().value as string | undefined) ?? null) : null;
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
        id: createProviderScopedId(resolvedProviderId, 'calendar.navet_overview'),
        name: t('calendar.defaultTitle'),
        room: singleRoom ?? UNKNOWN_ROOM_LABEL,
        size: 'medium',
        sourceIds: calendarSources.map((source) => source.id),
        sources: calendarSources,
        events: combinedEvents,
      },
    ];
  }, [
    resolvedProviderId,
    deferredCalendarEvents,
    entities,
    entityRegistryMap,
    locale,
    stableCalendarEntityIds,
    t,
    use24HourTime,
  ]);

  useEffect(() => {
    if (resolvedDevices.length > 0) {
      lastResolvedDevicesRef.current = resolvedDevices;
      return;
    }

    if (!supportsCalendar) {
      lastResolvedDevicesRef.current = EMPTY_CALENDAR_DEVICES;
      return;
    }

    if (providerRuntime.entitiesHydrated) {
      lastResolvedDevicesRef.current = EMPTY_CALENDAR_DEVICES;
    }
  }, [providerRuntime.entitiesHydrated, resolvedDevices, supportsCalendar]);

  return useMemo(() => {
    if (resolvedDevices.length > 0) {
      return resolvedDevices;
    }

    if (!supportsCalendar) {
      return EMPTY_CALENDAR_DEVICES;
    }

    if (!providerRuntime.entitiesHydrated) {
      return lastResolvedDevicesRef.current;
    }

    return EMPTY_CALENDAR_DEVICES;
  }, [providerRuntime.entitiesHydrated, resolvedDevices, supportsCalendar]);
}

export const useProviderCalendarDevicesCollection = useProviderCalendarDevices;
