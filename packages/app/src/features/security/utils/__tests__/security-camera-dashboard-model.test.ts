import type {
  CameraDevice,
  CoverDevice,
  HelperDevice,
  LockDevice,
  PersonDevice,
  SecurityKind,
  SecuritySeverity,
  SensorDevice,
} from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  buildSecurityCameraDashboardModel,
  isStillImageUtilityCamera,
} from '../security-camera-dashboard-model';

function camera(
  overrides: Partial<CameraDevice> &
    Pick<CameraDevice, 'id' | 'name'> & {
      securitySeverity?: SecuritySeverity;
    }
): CameraDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'medium',
    providerId: overrides.providerId ?? 'home_assistant',
    nativeId: overrides.nativeId,
    canonicalId: overrides.canonicalId,
    sourceDeviceId: overrides.sourceDeviceId,
    state: overrides.state ?? 'idle',
    supportedFeatures: overrides.supportedFeatures ?? 0,
    isStreamCapable: overrides.isStreamCapable ?? false,
    isStillImageOnly: overrides.isStillImageOnly ?? true,
    entityPicture: overrides.entityPicture,
    lastChanged: overrides.lastChanged,
    lastUpdated: overrides.lastUpdated,
    motionDetected: overrides.motionDetected,
    motionChangedAt: overrides.motionChangedAt,
    securityKind: 'camera',
    securitySeverity: overrides.securitySeverity ?? 'normal',
  };
}

function cover(
  overrides: Partial<CoverDevice> &
    Pick<CoverDevice, 'id' | 'name'> & {
      position?: number;
    }
): CoverDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'medium',
    position: overrides.position ?? 0,
    positionMode: overrides.positionMode,
    deviceClass: overrides.deviceClass,
    supportedFeatures: overrides.supportedFeatures,
    hasPosition: overrides.hasPosition ?? true,
  };
}

function lock(
  overrides: Partial<LockDevice> &
    Pick<LockDevice, 'id' | 'name'> & {
      securitySeverity?: SecuritySeverity;
    }
): LockDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'small',
    state: overrides.state ?? true,
    securityKind: 'lock',
    securitySeverity:
      overrides.securitySeverity ?? (overrides.state === false ? 'warning' : 'normal'),
  };
}

function sensor(
  overrides: Partial<SensorDevice> &
    Pick<SensorDevice, 'id' | 'name'> & {
      securityKind: SecurityKind;
      securitySeverity?: SecuritySeverity;
    }
): SensorDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Entrance',
    size: overrides.size ?? 'small',
    value: overrides.value ?? 'Detected',
    unit: overrides.unit ?? '',
    deviceClass: overrides.deviceClass,
    canonicalId: overrides.canonicalId,
    nativeId: overrides.nativeId,
    groupMembers: overrides.groupMembers,
    status: overrides.status ?? 'active',
    securityKind: overrides.securityKind,
    securitySeverity: overrides.securitySeverity ?? 'active',
  };
}

function person(
  overrides: Partial<PersonDevice> &
    Pick<PersonDevice, 'id' | 'name'> & {
      securityKind?: SecurityKind;
      securitySeverity?: SecuritySeverity;
    }
): PersonDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room ?? 'Outside',
    size: overrides.size ?? 'small',
    location: overrides.location ?? 'Away',
    state: overrides.state ?? 'away',
    entityPicture: overrides.entityPicture,
    securityKind: overrides.securityKind ?? 'person',
    securitySeverity: overrides.securitySeverity ?? 'normal',
  };
}

function helper(
  overrides: Partial<HelperDevice> &
    Pick<HelperDevice, 'id' | 'name' | 'room' | 'state' | 'size'> & {
      securityKind?: SecurityKind;
      securitySeverity?: SecuritySeverity;
    }
): HelperDevice {
  return {
    id: overrides.id,
    name: overrides.name,
    room: overrides.room,
    size: overrides.size,
    state: overrides.state,
    entityType: overrides.entityType,
    serviceDomain: overrides.serviceDomain,
    serviceAction: overrides.serviceAction,
    providerId: overrides.providerId,
    nativeId: overrides.nativeId,
    canonicalId: overrides.canonicalId,
    securityKind: overrides.securityKind ?? 'button',
    securitySeverity: overrides.securitySeverity ?? 'normal',
  };
}

describe('security camera dashboard model', () => {
  it('groups security entities into the expected buckets', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.front_door',
          name: 'Front Door',
          state: 'streaming',
          isStreamCapable: true,
          isStillImageOnly: false,
          securitySeverity: 'active',
        }),
      ],
      covers: [cover({ id: 'cover.entry_shutter', name: 'Entry Shutter', position: 0 })],
      locks: [lock({ id: 'lock.front_door', name: 'Front Door', state: false })],
      sensors: [
        sensor({
          id: 'alarm_control_panel.home',
          name: 'Home Alarm',
          securityKind: 'alarm',
          securitySeverity: 'critical',
        }),
        sensor({
          id: 'binary_sensor.entry_motion',
          name: 'Entry Motion',
          deviceClass: 'motion',
          securityKind: 'motion',
          securitySeverity: 'active',
        }),
        sensor({
          id: 'binary_sensor.smoke',
          name: 'Kitchen Smoke',
          deviceClass: 'smoke',
          securityKind: 'smoke',
          securitySeverity: 'critical',
        }),
        sensor({
          id: 'siren.entry',
          name: 'Entry Siren',
          securityKind: 'siren',
          securitySeverity: 'critical',
        }),
        sensor({
          id: 'binary_sensor.panel_problem',
          name: 'Panel Problem',
          securityKind: 'problem',
          securitySeverity: 'warning',
        }),
        sensor({
          id: 'event.front_doorbell',
          name: 'Front Doorbell',
          securityKind: 'event',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Doorbell Press',
        }),
      ],
      persons: [
        person({
          id: 'person.alex',
          name: 'Alex',
          state: 'home',
          location: 'Home',
          securityKind: 'person',
        }),
      ],
      helpers: [
        helper({
          id: 'button.doorbell_chime',
          name: 'Doorbell Chime',
          room: 'Entrance',
          size: 'small',
          state: false,
          serviceDomain: 'button',
          serviceAction: 'press',
          securityKind: 'button',
        }),
      ],
    });

    expect(model.groups.alarms.map((device) => device.id)).toEqual(['alarm_control_panel.home']);
    expect(model.groups.access.map((device) => device.id)).toEqual([
      'lock.front_door',
      'cover.entry_shutter',
    ]);
    expect(model.groups.activity.map((device) => device.id)).toEqual([
      'binary_sensor.entry_motion',
    ]);
    expect(model.groups.hazards.map((device) => device.id)).toEqual(['binary_sensor.smoke']);
    expect(model.groups.cameras.map((device) => device.id)).toEqual(['camera.front_door']);
    expect(model.groups.sirens.map((device) => device.id)).toEqual(['siren.entry']);
    expect(model.groups.presence.map((device) => device.id)).toEqual(['person.alex']);
    expect(model.groups.system.map((device) => device.id)).toEqual(['binary_sensor.panel_problem']);
    expect(model.allEntities.map((device) => device.id)).not.toContain('button.doorbell_chime');
    expect(model.allEntities.map((device) => device.id)).not.toContain('event.front_doorbell');
  });

  it('sorts entities by severity before name and id', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.window_b',
          name: 'Window B',
          securityKind: 'window',
          securitySeverity: 'normal',
          status: 'clear',
        }),
        sensor({
          id: 'binary_sensor.window_a',
          name: 'Window A',
          securityKind: 'window',
          securitySeverity: 'warning',
        }),
        sensor({
          id: 'binary_sensor.window_c',
          name: 'Window C',
          securityKind: 'window',
          securitySeverity: 'critical',
        }),
      ],
    });

    expect(model.groups.access.map((device) => device.id)).toEqual([
      'binary_sensor.window_c',
      'binary_sensor.window_a',
      'binary_sensor.window_b',
    ]);
  });

  it('builds a critical hero summary and attention bucket without requiring scroll order', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.smoke',
          name: 'Kitchen Smoke',
          room: 'Kitchen',
          securityKind: 'smoke',
          securitySeverity: 'critical',
          value: 'Smoke detected',
        }),
        sensor({
          id: 'binary_sensor.panel_problem',
          name: 'Panel Problem',
          securityKind: 'problem',
          securitySeverity: 'warning',
          value: 'Needs attention',
        }),
        sensor({
          id: 'binary_sensor.side_door',
          name: 'Side Door',
          securityKind: 'door',
          securitySeverity: 'unknown',
          value: 'Unavailable',
          status: 'unavailable',
        }),
      ],
    });

    expect(model.summary.highestSeverity).toBe('critical');
    expect(model.summary.title).toBe('Critical alert');
    expect(model.summary.subtitle).toContain('Kitchen Smoke');
    expect(model.summary.attentionItems.map((device) => device.id)).toEqual([
      'security.aggregate.attention.hazards',
      'security.aggregate.attention.system',
      'security.aggregate.attention.doors-windows',
    ]);
    expect(model.summary.activityItems).toHaveLength(0);
    expect(model.summary.unknownItems.map((device) => device.id)).toEqual([
      'binary_sensor.side_door',
    ]);
  });

  it('builds active and unknown summaries with the right top buckets', () => {
    const activeModel = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.driveway',
          name: 'Driveway',
          room: 'Outside',
          state: 'streaming',
          isStreamCapable: true,
          isStillImageOnly: false,
          securitySeverity: 'active',
        }),
      ],
      covers: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.entry_motion',
          name: 'Entry Motion',
          room: 'Entrance',
          securityKind: 'motion',
          securitySeverity: 'active',
          value: 'Motion detected',
        }),
      ],
    });

    expect(activeModel.summary.highestSeverity).toBe('active');
    expect(activeModel.summary.title).toBe('Security active');
    expect(activeModel.summary.attentionItems).toHaveLength(0);
    expect(activeModel.summary.liveItems.map((device) => device.id)).toEqual([
      'camera.driveway',
      'binary_sensor.entry_motion',
    ]);
    expect(activeModel.summary.activityItems.map((device) => device.id)).toEqual([
      'camera.driveway',
      'binary_sensor.entry_motion',
    ]);

    const unknownModel = buildSecurityCameraDashboardModel({
      cameras: [camera({ id: 'camera.garage', name: 'Garage', securitySeverity: 'unknown' })],
      covers: [],
      locks: [],
      sensors: [],
    });

    expect(unknownModel.summary.highestSeverity).toBe('unknown');
    expect(unknownModel.summary.title).toBe('Some devices unavailable');
    expect(unknownModel.summary.subtitle).toBe('1 device is unavailable');
    expect(unknownModel.summary.attentionItems.map((device) => device.id)).toEqual([
      'security.aggregate.attention.cameras',
    ]);
  });

  it('summarizes calm devices into secured counts and normal hero copy', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [camera({ id: 'camera.front', name: 'Front Door' })],
      covers: [cover({ id: 'cover.entry_shutter', name: 'Entry Shutter', position: 0 })],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: true })],
      sensors: [
        sensor({
          id: 'binary_sensor.kitchen_door',
          name: 'Kitchen Door',
          securityKind: 'door',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Closed',
        }),
        sensor({
          id: 'binary_sensor.hall_motion',
          name: 'Hall Motion',
          securityKind: 'motion',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Clear',
        }),
        sensor({
          id: 'binary_sensor.smoke',
          name: 'Smoke',
          securityKind: 'smoke',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Clear',
        }),
      ],
      persons: [
        person({
          id: 'person.alex',
          name: 'Alex',
          state: 'home',
          location: 'Home',
          securitySeverity: 'normal',
        }),
      ],
    });

    expect(model.summary.highestSeverity).toBe('normal');
    expect(model.summary.title).toBe('All secure');
    expect(model.summary.securedCounts).toEqual({
      openingsClosed: 2,
      locksLocked: 1,
      hazardSensorsClear: 1,
      motionSensorsClear: 1,
      camerasAvailable: 1,
      totalSecure: 6,
    });
    expect(model.summary.subtitle).toContain('2 openings closed');
    expect(model.summary.attentionItems).toHaveLength(0);
    expect(model.summary.activityItems).toHaveLength(0);
    expect(model.summary.liveItems.map((device) => device.id)).toEqual(['camera.front']);
    expect(model.summary.secureItems.map((device) => device.id)).toEqual([
      'security.aggregate.openings.secure',
      'security.aggregate.locks.secure',
      'security.aggregate.motion.secure',
      'security.aggregate.hazards.secure',
    ]);
  });

  it('keeps idle cameras out of secure rows while preserving available-camera counts', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [camera({ id: 'camera.garage', name: 'Garage', securitySeverity: 'normal' })],
      covers: [],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: true })],
      sensors: [],
    });

    expect(model.summary.securedCounts.camerasAvailable).toBe(1);
    expect(model.summary.liveItems.map((device) => device.id)).toEqual(['camera.garage']);
    expect(model.summary.secureItems.map((device) => device.id)).toEqual([
      'security.aggregate.locks.secure',
    ]);
  });

  it('renders secure rows as grouped kinds instead of individual devices', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: true })],
      sensors: [
        sensor({
          id: 'binary_sensor.hall_motion',
          name: 'Hall Motion',
          securityKind: 'motion',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Clear',
        }),
        sensor({
          id: 'binary_sensor.garage_motion',
          name: 'Garage Motion',
          room: 'Garage',
          securityKind: 'motion',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Clear',
        }),
      ],
    });

    expect(model.summary.securedCounts.motionSensorsClear).toBe(2);
    expect(model.summary.secureItems.map((device) => device.id)).toEqual([
      'security.aggregate.locks.secure',
      'security.aggregate.motion.secure',
    ]);
    expect(
      model.summary.secureItems.find((device) => device.id === 'security.aggregate.motion.secure')
    ).toMatchObject({
      name: 'Motion & occupancy',
      value: '2 clear',
    });
    expect(
      model.summary.secureItems.find((device) => device.id === 'security.aggregate.locks.secure')
    ).toMatchObject({
      name: 'Locks',
      value: '1 locked',
    });
    expect(
      model.summary.groupSummaries.find((group) => group.id === 'motion-occupancy')?.entities
    ).toMatchObject([
      {
        id: 'security.aggregate.motion.secure',
        name: 'Motion sensors',
        value: '2 clear',
      },
    ]);
  });

  it('treats streaming cameras as live even if upstream securitySeverity is stale', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.driveway',
          name: 'Driveway',
          state: 'streaming',
          isStreamCapable: true,
          isStillImageOnly: false,
          securitySeverity: 'normal',
        }),
      ],
      covers: [],
      locks: [],
      sensors: [],
    });

    expect(model.summary.activityItems.map((device) => device.id)).toEqual(['camera.driveway']);
    expect(model.summary.secureItems).toHaveLength(0);
  });

  it('builds group summaries and default expansion from problem severity', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [camera({ id: 'camera.garage', name: 'Garage', securitySeverity: 'normal' })],
      covers: [cover({ id: 'cover.entry_shutter', name: 'Entry Shutter', position: 0 })],
      locks: [lock({ id: 'lock.front', name: 'Front Door', state: false })],
      sensors: [
        sensor({
          id: 'binary_sensor.front_window',
          name: 'Front Window',
          securityKind: 'window',
          securitySeverity: 'normal',
          status: 'clear',
          value: 'Closed',
        }),
        sensor({
          id: 'binary_sensor.panel_problem',
          name: 'Panel Problem',
          securityKind: 'problem',
          securitySeverity: 'warning',
          value: 'Trouble',
        }),
      ],
    });

    expect(model.summary.groupSummaries.map((group) => group.id)).toEqual([
      'doors-windows',
      'locks',
      'cameras',
      'system',
    ]);
    expect(
      model.summary.groupSummaries.find((group) => group.id === 'doors-windows')
    ).toMatchObject({
      summaryText: '2 closed',
      defaultExpanded: false,
    });
    expect(model.summary.groupSummaries.find((group) => group.id === 'locks')).toMatchObject({
      summaryText: '1 unlocked',
      defaultExpanded: true,
    });
    expect(model.summary.groupSummaries.find((group) => group.id === 'system')).toMatchObject({
      summaryText: '1 issues',
      defaultExpanded: true,
    });
  });

  it('counts live cameras as available in the secure summary', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.backyard',
          name: 'Backyard',
          securitySeverity: 'active',
          state: 'streaming',
          isStreamCapable: true,
          isStillImageOnly: false,
        }),
        camera({
          id: 'camera.driveway',
          name: 'Driveway',
          securitySeverity: 'active',
          state: 'recording',
          isStreamCapable: true,
          isStillImageOnly: false,
        }),
        camera({
          id: 'camera.garage',
          name: 'Garage',
          securitySeverity: 'normal',
        }),
      ],
      covers: [],
      locks: [],
      sensors: [],
    });

    expect(model.summary.securedCounts.camerasAvailable).toBe(3);
  });

  it('treats away presence as calm even if upstream severity is active', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [],
      sensors: [],
      persons: [
        person({
          id: 'person.vishal',
          name: 'Vishal',
          state: 'away',
          location: 'Away',
          securityKind: 'person',
          securitySeverity: 'active',
        }),
      ],
    });

    expect(model.summary.attentionItems).toHaveLength(0);
    expect(model.summary.activityItems).toHaveLength(0);
    expect(model.summary.normalCount).toBe(1);
    expect(model.summary.groupSummaries.find((group) => group.id === 'presence')).toMatchObject({
      summaryText: '1 settled',
    });
  });

  it('keeps unavailable away presence out of attention and live buckets', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [],
      sensors: [],
      persons: [
        person({
          id: 'person.vishal',
          name: 'Vishal',
          state: 'away',
          location: 'Away',
          securityKind: 'person',
          securitySeverity: 'unknown',
        }),
      ],
    });

    expect(model.summary.attentionItems).toHaveLength(0);
    expect(model.summary.activityItems).toHaveLength(0);
    expect(model.summary.groupSummaries.find((group) => group.id === 'presence')).toMatchObject({
      summaryText: '1 unavailable',
      total: 1,
    });
  });

  it('collapses duplicate camera variants for the same source device', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'home_assistant:camera.reolink_driveway',
          nativeId: 'camera.reolink_driveway',
          sourceDeviceId: 'device-reolink-driveway',
          name: 'Driveway',
          room: 'Outside',
          state: 'streaming',
          isStreamCapable: true,
          isStillImageOnly: false,
          securitySeverity: 'active',
          lastUpdated: '2026-06-03T13:10:00.000Z',
        }),
        camera({
          id: 'home_assistant:camera.reolink_driveway_2',
          nativeId: 'camera.reolink_driveway_2',
          sourceDeviceId: 'device-reolink-driveway',
          name: 'Driveway',
          room: 'Outside',
          state: 'streaming',
          isStreamCapable: true,
          isStillImageOnly: false,
          securitySeverity: 'active',
          lastUpdated: '2026-06-03T13:11:00.000Z',
        }),
      ],
      covers: [],
      locks: [],
      sensors: [],
    });

    expect(model.groups.cameras.map((device) => device.id)).toEqual([
      'home_assistant:camera.reolink_driveway',
    ]);
    expect(model.summary.totalEntities).toBe(1);
  });

  it('keeps still-image utility camera detection for map-like feeds', () => {
    expect(
      isStillImageUtilityCamera(
        camera({
          id: 'camera.l10s_ultra_gen_2_map',
          name: 'L10s Ultra Gen 2 Current Map',
          room: 'Utility',
        })
      )
    ).toBe(true);
  });

  it('deduplicates grouped opening alerts while keeping the aggregate security entity', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.any_window_open',
          name: 'Any Window Open',
          securityKind: 'opening',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Open',
          groupMembers: ['binary_sensor.window_left', 'binary_sensor.window_right'],
        }),
        sensor({
          id: 'binary_sensor.window_left',
          name: 'Window Left',
          securityKind: 'window',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Open',
        }),
        sensor({
          id: 'binary_sensor.window_right',
          name: 'Window Right',
          securityKind: 'window',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Open',
        }),
      ],
    });

    expect(model.summary.attentionItems.map((device) => device.id)).toEqual([
      'security.aggregate.attention.doors-windows',
    ]);
    expect(model.summary.totalEntities).toBe(1);
    expect(
      model.summary.groupSummaries.find((group) => group.id === 'doors-windows')
    ).toMatchObject({
      total: 1,
      summaryText: '1 open',
    });
  });

  it('keeps separate opening alerts when grouped overlap metadata is missing', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [],
      covers: [],
      locks: [],
      sensors: [
        sensor({
          id: 'binary_sensor.any_window_open',
          name: 'Any Window Open',
          securityKind: 'opening',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Open',
        }),
        sensor({
          id: 'binary_sensor.window_left',
          name: 'Window Left',
          securityKind: 'window',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Open',
        }),
      ],
    });

    expect(model.summary.attentionItems.map((device) => device.id)).toEqual([
      'security.aggregate.attention.doors-windows',
    ]);
    expect(model.summary.totalEntities).toBe(2);
  });

  it('sorts attention items by alert tier before name within mixed warning states', () => {
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        camera({
          id: 'camera.driveway',
          name: 'Driveway',
          securitySeverity: 'unknown',
        }),
      ],
      covers: [
        cover({
          id: 'cover.pergola_roof',
          name: 'Pergola Roof',
          position: 100,
        }),
      ],
      locks: [
        lock({
          id: 'lock.kitchen_door',
          name: 'Kitchen Door',
          state: false,
        }),
      ],
      sensors: [
        sensor({
          id: 'siren.entry',
          name: 'Entry Siren',
          securityKind: 'siren',
          securitySeverity: 'critical',
        }),
        sensor({
          id: 'binary_sensor.hall_window',
          name: 'Hall Window',
          securityKind: 'window',
          securitySeverity: 'warning',
          status: 'active',
          value: 'Active',
        }),
      ],
    });

    expect(model.summary.attentionItems.map((device) => device.id)).toEqual([
      'security.aggregate.attention.sirens',
      'security.aggregate.attention.doors-windows',
      'security.aggregate.attention.locks',
      'security.aggregate.attention.cameras',
    ]);
  });
});
