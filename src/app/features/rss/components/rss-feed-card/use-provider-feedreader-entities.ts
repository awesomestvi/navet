import { useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant, useIntegrationStore } from '@/app/hooks';
import { selectFeedreaderEventEntities } from '@/app/infrastructure/home-assistant/home-assistant-domain-selectors';
import type {
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { integrationSelectors } from '@/app/stores/selectors';

const EMPTY_FEEDREADER_ENTITIES: PlatformEntitySnapshotMap = {};

function selectEmptyFeedreaderEntities(): PlatformEntitySnapshotMap {
  return EMPTY_FEEDREADER_ENTITIES;
}

function toPlatformEntitySnapshot(
  entityId: string,
  entity: {
    state: string;
    attributes?: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
  }
): PlatformEntitySnapshot {
  return {
    entityId,
    state: entity.state,
    attributes: (entity.attributes as Record<string, unknown> | undefined) ?? {},
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
  };
}

function selectAllFeedreaderEntities(state: HomeAssistantStore): PlatformEntitySnapshotMap {
  const entities = selectFeedreaderEventEntities(state);

  return Object.fromEntries(
    Object.entries(entities).map(([entityId, entity]) => [
      entityId,
      toPlatformEntitySnapshot(entityId, entity),
    ])
  );
}

export function useProviderFeedreaderEntities(entityIds?: string[]): PlatformEntitySnapshotMap {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = currentProviderId === 'home_assistant';
  const narrowedSelector = useCallback(
    (state: HomeAssistantStore): PlatformEntitySnapshotMap => {
      if (!entityIds?.length) {
        return selectAllFeedreaderEntities(state);
      }

      const feedreaderEntities = selectFeedreaderEventEntities(state);

      return Object.fromEntries(
        entityIds
          .map((entityId) => {
            const entity = feedreaderEntities[entityId];
            return entity ? [entityId, toPlatformEntitySnapshot(entityId, entity)] : null;
          })
          .filter((entry): entry is [string, PlatformEntitySnapshot] => entry !== null)
      );
    },
    [entityIds]
  );

  return useHomeAssistant(
    isHomeAssistantProvider
      ? entityIds?.length
        ? narrowedSelector
        : selectAllFeedreaderEntities
      : selectEmptyFeedreaderEntities,
    shallow
  );
}
