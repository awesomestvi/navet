import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderEntitySnapshots } from '@navet/app/hooks/use-provider-entity';
import type {
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo } from 'react';

const EMPTY_FEEDREADER_ENTITIES: PlatformEntitySnapshotMap = {};

function selectEmptyFeedreaderEntities(): PlatformEntitySnapshotMap {
  return EMPTY_FEEDREADER_ENTITIES;
}

function selectFeedreaderEventEntities(
  entities: PlatformEntitySnapshotMap | null
): PlatformEntitySnapshotMap {
  if (!entities) {
    return {};
  }

  const out: PlatformEntitySnapshotMap = {};
  for (const [entityId, entity] of Object.entries(entities)) {
    if (!entityId.startsWith('event.')) {
      continue;
    }

    const attributes = entity.attributes as Record<string, unknown> | undefined;
    if (
      typeof attributes?.link === 'string' &&
      (entityId.includes('feedreader') ||
        typeof attributes?.title === 'string' ||
        typeof attributes?.attribution === 'string')
    ) {
      out[entityId] = entity;
    }
  }

  return out;
}

function mapFeedreaderEntities(
  entities: PlatformEntitySnapshotMap | null,
  entityIds?: string[]
): PlatformEntitySnapshotMap {
  const feedreaderEntities = selectFeedreaderEventEntities(entities);

  if (!entityIds?.length) {
    return feedreaderEntities;
  }

  return Object.fromEntries(
    entityIds
      .map((entityId) => {
        const entity = feedreaderEntities[entityId];
        return entity ? [entityId, entity] : null;
      })
      .filter((entry): entry is [string, PlatformEntitySnapshot] => entry !== null)
  );
}

export function useProviderFeedreaderEntities(entityIds?: string[]): PlatformEntitySnapshotMap {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = currentProviderId === 'home_assistant';
  const entities = useProviderEntitySnapshots({ enabled: isHomeAssistantProvider });

  return useMemo(
    () =>
      isHomeAssistantProvider
        ? mapFeedreaderEntities(entities, entityIds)
        : selectEmptyFeedreaderEntities(),
    [entities, entityIds, isHomeAssistantProvider]
  );
}
