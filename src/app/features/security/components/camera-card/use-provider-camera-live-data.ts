import { useMemo } from 'react';
import { useProviderDevice } from '@/app/hooks/use-provider-device';
import {
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
} from '@/app/hooks/use-provider-entity';
import { useProviderHealth } from '@/app/hooks/use-provider-health';
import type {
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import { getProviderNativeId, parseProviderScopedId } from '@/app/utils/provider-ids';

const EMPTY_DEVICE_RECORD: PlatformEntitySnapshotMap = {};

function selectEmptyDeviceRecord() {
  return EMPTY_DEVICE_RECORD;
}

export interface ProviderCameraLiveData {
  connected: boolean;
  deviceEntities: Record<string, PlatformEntitySnapshot | undefined>;
  isHomeAssistantProvider: boolean;
  liveEntity: PlatformEntitySnapshot | undefined;
}

export function useProviderCameraLiveData(
  entityId: string,
  deviceEntityIds: string[]
): ProviderCameraLiveData {
  const providerDevice = useProviderDevice(entityId);
  const resolvedProviderId =
    providerDevice?.providerId ?? parseProviderScopedId(entityId)?.providerId;
  const runtimeEntityId = useMemo(
    () => (resolvedProviderId ? getProviderNativeId(entityId) : null),
    [entityId, resolvedProviderId]
  );
  const isHomeAssistantProvider = resolvedProviderId === 'home_assistant';
  const providerHealth = useProviderHealth(resolvedProviderId ?? 'home_assistant');
  const liveEntity = useProviderEntitySnapshot(entityId);
  const deviceEntityRecord = useProviderEntitySnapshotRecord(deviceEntityIds, {
    providerId: resolvedProviderId,
    enabled: Boolean(runtimeEntityId),
  });

  const deviceEntities = useMemo(() => {
    if (!runtimeEntityId || deviceEntityIds.length === 0) {
      return selectEmptyDeviceRecord();
    }

    return Object.fromEntries(
      deviceEntityIds.map((providerScopedEntityId) => {
        const nativeEntityId = getProviderNativeId(providerScopedEntityId);
        return [nativeEntityId, deviceEntityRecord[nativeEntityId]];
      })
    );
  }, [deviceEntityIds, deviceEntityRecord, runtimeEntityId]);

  return {
    connected: isHomeAssistantProvider ? providerHealth.connected : false,
    deviceEntities,
    isHomeAssistantProvider,
    liveEntity,
  };
}
