import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshot,
  useProviderEntitySnapshots,
} from '@navet/app/hooks/use-provider-entity';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  createProviderScopedId,
  getProviderNativeId,
  parseProviderScopedId,
} from '@navet/app/utils/provider-ids';
import { useMemo } from 'react';

export interface ProviderMediaPlaybackData {
  entities: PlatformEntitySnapshotMap | null;
  entityRegistry: PlatformEntityRegistryEntry[];
}

const EMPTY_MEDIA_PLAYBACK_DATA: ProviderMediaPlaybackData = {
  entities: null,
  entityRegistry: [],
};

function selectEmptyMediaPlaybackData() {
  return EMPTY_MEDIA_PLAYBACK_DATA;
}

function selectUndefinedEntity() {
  return undefined;
}

function selectEmptyEntityRegistry(): PlatformEntityRegistryEntry[] {
  return [];
}

function mapMediaPlayerEntities(
  entities: PlatformEntitySnapshotMap | null
): PlatformEntitySnapshotMap | null {
  if (!entities) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(entities).filter(([entityId]) => entityId.startsWith('media_player.'))
  );
}

function resolveCompanionEntityId(
  entityId: string,
  providerId: IntegrationProviderId | undefined,
  companionDomain: string
) {
  if (!providerId) {
    return null;
  }

  const nativeEntityId = getProviderNativeId(entityId);
  const objectId = nativeEntityId.split('.').slice(1).join('.');
  return objectId ? createProviderScopedId(providerId, `${companionDomain}.${objectId}`) : null;
}

function useResolvedMediaRuntime(options: {
  entityId: string;
  providerId?: IntegrationProviderId;
}) {
  const { entityId, providerId } = options;

  const providerEntity = useProviderEntityModel(entityId);
  const scopedEntity = parseProviderScopedId(entityId);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId =
    providerId ?? providerEntity?.providerId ?? scopedEntity?.providerId ?? currentProviderId;
  const runtimeEntityId = resolvedProviderId ? getProviderNativeId(entityId) : null;

  return useMemo(
    () => ({
      providerId: resolvedProviderId,
      runtimeEntityId,
    }),
    [resolvedProviderId, runtimeEntityId]
  );
}

export function useProviderMediaPlaybackData(entityId: string): ProviderMediaPlaybackData {
  const { providerId, runtimeEntityId } = useResolvedMediaRuntime({ entityId });
  const entities = useProviderEntitySnapshots({
    providerId,
    enabled: Boolean(runtimeEntityId),
  });
  const entityRegistry = useProviderEntityRegistryEntries({
    providerId,
    enabled: Boolean(runtimeEntityId),
  });

  return useMemo(
    () => (runtimeEntityId ? { entities, entityRegistry } : selectEmptyMediaPlaybackData()),
    [entities, entityRegistry, runtimeEntityId]
  );
}

export function useProviderMediaEntity(entityId: string): PlatformEntitySnapshot | undefined {
  return useProviderEntitySnapshot(entityId) ?? selectUndefinedEntity();
}

export function useProviderMediaCompanionEntity(
  entityId: string,
  companionDomain: string
): PlatformEntitySnapshot | undefined {
  const { providerId, runtimeEntityId } = useResolvedMediaRuntime({ entityId });
  const companionEntityId = useMemo(() => {
    if (!runtimeEntityId) {
      return null;
    }

    return resolveCompanionEntityId(entityId, providerId, companionDomain);
  }, [companionDomain, entityId, providerId, runtimeEntityId]);

  return useProviderEntitySnapshot(companionEntityId ?? '') ?? selectUndefinedEntity();
}

export function useProviderMediaEntityRegistry(entityId: string): PlatformEntityRegistryEntry[] {
  const { providerId, runtimeEntityId } = useResolvedMediaRuntime({ entityId });
  const entityRegistry = useProviderEntityRegistryEntries({
    providerId,
    enabled: Boolean(runtimeEntityId),
  });

  return useMemo(
    () => (runtimeEntityId ? entityRegistry : selectEmptyEntityRegistry()),
    [entityRegistry, runtimeEntityId]
  );
}

export function useProviderMediaPlayerEntities(
  entityId: string,
  enabled: boolean
): PlatformEntitySnapshotMap | null {
  const { providerId, runtimeEntityId } = useResolvedMediaRuntime({ entityId });
  const entities = useProviderEntitySnapshots({
    providerId,
    enabled: Boolean(runtimeEntityId) && enabled,
  });

  return useMemo(
    () => (runtimeEntityId && enabled ? mapMediaPlayerEntities(entities) : null),
    [enabled, entities, runtimeEntityId]
  );
}
