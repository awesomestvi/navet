import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CALENDAR_EVENTS_REFRESH_INTERVAL } from '@/app/constants';
import { mapCalendarSources } from '@/app/hooks/device-mappers';
import { useI18n } from '@/app/i18n';
import type {
  PlatformCalendarDevice,
  PlatformCalendarEvent,
} from '@/app/platform/provider-feature-models';
import { integrationCalendarFeatureService } from '@/app/services/integration-calendar-feature.service';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';
import { createProviderScopedId } from '@/app/utils/provider-ids';
import { useIntegrationStore } from './use-integration-store';
import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshots,
} from './use-provider-entity';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_CALENDAR_DEVICES: PlatformCalendarDevice[] = [];

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
  deviceRoom?: string
) {
  return (
    deviceRoom ||
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}

export function useProviderCalendarDevices(
  providerId?: IntegrationProviderId
): PlatformCalendarDevice[] {
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const supportsCalendar = useProviderFeature('calendar', resolvedProviderId);
  const devicesByCanonicalId = useIntegrationStore((state) => state.devicesByCanonicalId);
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
      return [];
    }

    return Object.keys(entities)
      .filter((entityId) => entityId.startsWith('calendar.'))
      .sort((left, right) => left.localeCompare(right));
  }, [entities, supportsCalendar]);

  const entityRegistryMap = useMemo(
    () => new Map(entityRegistry.map((entry) => [entry.entityId, entry])),
    [entityRegistry]
  );
  const [calendarEvents, setCalendarEvents] = useState<Record<string, PlatformCalendarEvent[]>>({});
  const deferredCalendarEvents = useDeferredValue(calendarEvents);

  useEffect(() => {
    if (!supportsCalendar || calendarEntityIds.length === 0) {
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
        calendarEntityIds.map(async (entityId) => {
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
  }, [calendarEntityIds, resolvedProviderId, supportsCalendar]);

  return useMemo(() => {
    if (!entities || calendarEntityIds.length === 0) {
      return EMPTY_CALENDAR_DEVICES;
    }

    const calendarSources: PlatformCalendarDevice['sources'] = [];
    for (const entityId of calendarEntityIds) {
      const entity = entities[entityId];
      if (!entity) {
        continue;
      }

      const scopedEntityId = createProviderScopedId(resolvedProviderId, entityId);
      calendarSources.push(
        ...mapCalendarSources(
          entityId,
          entity,
          resolveEntityName(entityId, entity, entityRegistryMap.get(entityId)?.name),
          resolveEntityRoom(scopedEntityId, entity, devicesByCanonicalId[scopedEntityId]?.room),
          {
            calendarEvents: deferredCalendarEvents,
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
    calendarEntityIds,
    resolvedProviderId,
    deferredCalendarEvents,
    devicesByCanonicalId,
    entities,
    entityRegistryMap,
    locale,
    t,
    use24HourTime,
  ]);
}

export const useProviderCalendarDevicesCollection = useProviderCalendarDevices;
