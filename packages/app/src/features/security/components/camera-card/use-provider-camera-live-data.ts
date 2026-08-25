import { readNavetCameraState } from '@navet/app/core/navet-device-state';
import {
  useProviderEntityModel,
  useProviderEntityModels,
} from '@navet/app/hooks/use-provider-device';
import {
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
} from '@navet/app/hooks/use-provider-entity';
import { useProviderHealth } from '@navet/app/hooks/use-provider-health';
import type {
  PlatformCameraCompanionState,
  PlatformCameraLiveState,
  PlatformCameraState,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { getProviderNativeId, parseProviderScopedId } from '@navet/app/utils/provider-ids';
import type { NavetEntity } from '@navet/core/types';
import { useMemo } from 'react';

const EMPTY_DEVICE_RECORD: PlatformEntitySnapshotMap = {};

function selectEmptyDeviceRecord() {
  return EMPTY_DEVICE_RECORD;
}

export interface ProviderCameraLiveData {
  cameraState: PlatformCameraState;
  companionStates: PlatformCameraCompanionState[];
  connected: boolean;
  deviceEntities: Record<string, PlatformEntitySnapshot | undefined>;
  liveEntity: PlatformEntitySnapshot | undefined;
  liveState: PlatformCameraLiveState;
}

function normalizeCameraState(
  liveEntity: PlatformEntitySnapshot | undefined,
  providerState: ReturnType<typeof readNavetCameraState>
): PlatformCameraState {
  const rawState = `${liveEntity?.state ?? providerState?.value ?? ''}`.toLowerCase();
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;

  if (rawState === 'unavailable' || rawState === 'unknown') {
    return 'unavailable';
  }

  if (liveAttrs?.is_recording === true || rawState === 'recording') {
    return 'recording';
  }

  if (liveAttrs?.is_streaming === true || rawState === 'streaming') {
    return 'streaming';
  }

  if (rawState === 'off') {
    return 'off';
  }

  return 'idle';
}

function isMotionCompanionEntity(
  entityId: string,
  entity: { attributes?: Record<string, unknown> } | undefined,
  providerEntity: NavetEntity | undefined
) {
  const securityKind = providerEntity?.attributes.securityKind;
  const isSensorEntity = providerEntity
    ? providerEntity.type === 'sensor' || providerEntity.type === 'binary_sensor'
    : entityId.startsWith('binary_sensor.');
  const searchText = `${entityId} ${
    providerEntity?.name ??
    (typeof entity?.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : '')
  }`.toLowerCase();

  return (
    isSensorEntity &&
    (securityKind === 'motion' ||
      securityKind === 'occupancy' ||
      securityKind === 'presence' ||
      ['motion', 'occupancy', 'presence', 'pir', 'human', 'person', 'pedestrian'].some((token) =>
        searchText.includes(token)
      ))
  );
}

function getMotionDetectionTarget(
  entityId: string,
  entity: { attributes?: Record<string, unknown> },
  providerEntity: NavetEntity | undefined
): 'motion' | 'person' {
  const attributes = entity.attributes;
  const searchText = [entityId, providerEntity?.name, attributes?.friendly_name, attributes?.name]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return ['human', 'person', 'people', 'pedestrian'].some((token) => searchText.includes(token))
    ? 'person'
    : 'motion';
}

export function useProviderCameraLiveData(
  entityId: string,
  deviceEntityIds: string[]
): ProviderCameraLiveData {
  const providerEntity = useProviderEntityModel(entityId);
  const providerDeviceEntities = useProviderEntityModels(deviceEntityIds);
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

  const providerDeviceEntitiesByNativeId = useMemo(
    () =>
      Object.fromEntries(
        deviceEntityIds.flatMap((providerScopedEntityId) => {
          const entity = providerDeviceEntities[providerScopedEntityId];
          return entity ? [[getProviderNativeId(providerScopedEntityId), entity]] : [];
        })
      ),
    [deviceEntityIds, providerDeviceEntities]
  );

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
      const providerDeviceEntity = providerDeviceEntitiesByNativeId[nativeEntityId];

      if (!entity || !isMotionCompanionEntity(nativeEntityId, entity, providerDeviceEntity)) {
        return [];
      }

      return [
        {
          entityId: nativeEntityId,
          type: 'motion',
          detectionTarget: getMotionDetectionTarget(nativeEntityId, entity, providerDeviceEntity),
          detected: entity.state === 'on' || entity.state === 'home' || entity.state === 'detected',
          changedAt: entity.lastChanged ?? entity.lastUpdated ?? null,
        },
      ];
    });
  }, [deviceEntities, providerDeviceEntitiesByNativeId]);

  const cameraState = useMemo(
    () => normalizeCameraState(liveEntity, providerState),
    [liveEntity, providerState]
  );

  return {
    cameraState,
    companionStates,
    connected: providerHealth.connected,
    deviceEntities,
    liveEntity,
    liveState,
  };
}
