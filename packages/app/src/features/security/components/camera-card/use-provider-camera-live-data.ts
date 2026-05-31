import { readNavetCameraState } from '@navet/app/core/navet-device-state';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import {
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
} from '@navet/app/hooks/use-provider-entity';
import { useProviderHealth } from '@navet/app/hooks/use-provider-health';
import type {
  PlatformCameraCompanionState,
  PlatformCameraLiveState,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { getProviderNativeId, parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useMemo } from 'react';

const EMPTY_DEVICE_RECORD: PlatformEntitySnapshotMap = {};

function selectEmptyDeviceRecord() {
  return EMPTY_DEVICE_RECORD;
}

export interface ProviderCameraLiveData {
  companionStates: PlatformCameraCompanionState[];
  connected: boolean;
  deviceEntities: Record<string, PlatformEntitySnapshot | undefined>;
  liveEntity: PlatformEntitySnapshot | undefined;
  liveState: PlatformCameraLiveState;
}

function isMotionCompanionEntity(
  entityId: string,
  entity: { attributes?: Record<string, unknown> } | undefined
) {
  const searchText = `${entityId} ${
    typeof entity?.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : ''
  }`.toLowerCase();

  return (
    entityId.startsWith('binary_sensor.') &&
    ['motion', 'occupancy', 'presence', 'pir'].some((token) => searchText.includes(token))
  );
}

export function useProviderCameraLiveData(
  entityId: string,
  deviceEntityIds: string[]
): ProviderCameraLiveData {
  const providerEntity = useProviderEntityModel(entityId);
  const resolvedProviderId =
    providerEntity?.providerId ?? parseProviderScopedId(entityId)?.providerId;
  const runtimeEntityId = useMemo(
    () => (resolvedProviderId ? getProviderNativeId(entityId) : null),
    [entityId, resolvedProviderId]
  );
  const providerState = readNavetCameraState(providerEntity);
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

  const liveState = useMemo<PlatformCameraLiveState>(() => {
    return {
      isStreamCapable: providerState?.isStreamCapable === true,
      isStillImageOnly: providerState?.isStillImageOnly === true,
      motionDetectionEnabled:
        typeof providerState?.motionDetectionEnabled === 'boolean'
          ? providerState.motionDetectionEnabled
          : null,
    };
  }, [
    providerState?.isStillImageOnly,
    providerState?.isStreamCapable,
    providerState?.motionDetectionEnabled,
  ]);

  const companionStates = useMemo<PlatformCameraCompanionState[]>(() => {
    return Object.entries(deviceEntities).flatMap(([nativeEntityId, entity]) => {
      if (!entity || !isMotionCompanionEntity(nativeEntityId, entity)) {
        return [];
      }

      return [
        {
          entityId: nativeEntityId,
          type: 'motion',
          detected: entity.state === 'on' || entity.state === 'home' || entity.state === 'detected',
          changedAt: entity.lastChanged ?? entity.lastUpdated ?? null,
        },
      ];
    });
  }, [deviceEntities]);

  return {
    companionStates,
    connected: providerHealth.connected,
    deviceEntities,
    liveEntity,
    liveState,
  };
}
