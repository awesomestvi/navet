import { describe, expect, it } from 'vitest';
import type { PlatformEntitySnapshotMap } from '@/app/platform/provider-feature-models';
import type { CameraDevice, LockDevice } from '@/app/types/device.types';
import {
  buildSecurityCameraDashboardModel,
  isStillImageUtilityCamera,
} from '../security-camera-dashboard-model';

function camera(
  overrides: Partial<CameraDevice> & Pick<CameraDevice, 'id' | 'name'>
): CameraDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'medium',
    state: overrides.state ?? 'idle',
    supportedFeatures: overrides.supportedFeatures ?? 0,
    isStreamCapable: overrides.isStreamCapable ?? false,
    isStillImageOnly: overrides.isStillImageOnly ?? true,
    entityPicture: overrides.entityPicture,
    lastChanged: overrides.lastChanged,
    lastUpdated: overrides.lastUpdated,
    motionDetected: overrides.motionDetected,
    motionChangedAt: overrides.motionChangedAt,
  };
}

function lock(overrides: Partial<LockDevice> & Pick<LockDevice, 'id' | 'name'>): LockDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'small',
    state: overrides.state ?? true,
  };
}

function toSnapshotMapEntry(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
) {
  return {
    entityId,
    state,
    attributes,
  };
}

describe('security camera dashboard model', () => {
  it('groups live-capable, still-image, and unavailable cameras', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.front_door',
          name: 'Front Door',
          room: 'Entrance',
          state: 'streaming',
          supportedFeatures: 2,
          isStreamCapable: true,
          isStillImageOnly: false,
        }),
        camera({
          id: 'camera.l10s_ultra_gen_2_map',
          name: 'L10s Ultra Gen 2 Current Map',
          room: 'Utility',
        }),
        camera({
          id: 'camera.back_yard',
          name: 'Back Yard',
          room: 'Garden',
          state: 'unavailable',
        }),
      ],
      locks: [],
    });

    expect(model.primaryCameras.map((item) => item.id)).toEqual(['camera.front_door']);
    expect(model.stillImageCameras.map((item) => item.id)).toEqual(['camera.l10s_ultra_gen_2_map']);
    expect(model.unavailableCameras.map((item) => item.id)).toEqual(['camera.back_yard']);
    expect(model.summary.liveCount).toBe(1);
    expect(model.summary.unavailableCount).toBe(1);
  });

  it('derives related security status from locks and binary sensors', () => {
    const entities = {
      'binary_sensor.entry_motion': toSnapshotMapEntry('binary_sensor.entry_motion', 'on', {
        device_class: 'motion',
        friendly_name: 'Entry Motion',
      }),
      'binary_sensor.patio_door': toSnapshotMapEntry('binary_sensor.patio_door', 'on', {
        device_class: 'door',
        friendly_name: 'Patio Door',
      }),
      'alarm_control_panel.home': toSnapshotMapEntry('alarm_control_panel.home', 'armed_home'),
      'siren.hallway': toSnapshotMapEntry('siren.hallway', 'on'),
    } satisfies PlatformEntitySnapshotMap;

    const model = buildSecurityCameraDashboardModel(
      {
        cameras: [
          camera({
            id: 'camera.garage',
            name: 'Garage',
            room: 'Garage',
            isStreamCapable: true,
            isStillImageOnly: false,
          }),
        ],
        locks: [
          lock({ id: 'lock.front_door', name: 'Front Door', state: true }),
          lock({ id: 'lock.back_door', name: 'Back Door', state: false }),
        ],
      },
      entities
    );

    expect(model.summary.motionCount).toBe(1);
    expect(model.summary.openSensorCount).toBe(1);
    expect(model.summary.activeAlarmCount).toBe(1);
    expect(model.summary.activeSirenCount).toBe(1);
    expect(model.summary.lockedCount).toBe(1);
    expect(model.summary.unlockedCount).toBe(1);
    expect(model.locks.map((item) => item.id)).toEqual(['lock.back_door', 'lock.front_door']);
  });

  it('sorts camera feeds by room then name', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.z',
          name: 'Zeta',
          room: 'Kitchen',
          isStreamCapable: true,
          isStillImageOnly: false,
        }),
        camera({
          id: 'camera.a',
          name: 'Alpha',
          room: 'Entrance',
          isStreamCapable: true,
          isStillImageOnly: false,
        }),
      ],
      locks: [],
    });

    expect(model.primaryCameras.map((item) => item.id)).toEqual(['camera.a', 'camera.z']);
  });

  it('does not classify named security cameras as utility still images', () => {
    expect(
      isStillImageUtilityCamera(
        camera({
          id: 'camera.front_door_map_view',
          name: 'Front Door Camera',
          room: 'Entrance',
        })
      )
    ).toBe(false);
  });
});
