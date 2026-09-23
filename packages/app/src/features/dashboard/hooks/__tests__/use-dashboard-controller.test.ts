import {
  createEmptyDeviceCollection,
  mapNavetEntitiesToDeviceCollection,
} from '@navet/app/core/navet-device-collections';
import { getClimateDashboardGroup } from '@navet/app/features/climate/utils/climate-dashboard-group';
import { buildSecurityCameraDashboardModel } from '@navet/app/features/security/utils/security-camera-dashboard-model';
import { buildDashboardVisibilityResult } from '@navet/app/hooks/use-dashboard-devices';
import { mapHomeAssistantEntitiesToNavetEntities } from '@navet/provider-homeassistant';
import { mapHomeySnapshotToNavetEntities } from '@navet/provider-homey';
import { describe, expect, it } from 'vitest';
import {
  resolveDashboardSectionDeviceKeys,
  resolveDashboardShownSensorEntityIds,
  resolveShouldIncludeFeatureCollections,
  resolveShouldTrackMediaDevices,
} from '../use-dashboard-controller';

describe('Lights scene collections', () => {
  it('loads normalized scenes alongside lights so shortcuts include every connected provider', () => {
    expect(resolveDashboardSectionDeviceKeys('lights')).toEqual(['lights', 'scenes']);
  });
});

describe('Climate environmental sensor visibility', () => {
  it('shows Home Assistant air purifier readings in Climate while honoring explicit hiding', () => {
    const hassEntity = (entity_id: string, state: string, device_class?: string) => ({
      entity_id,
      state,
      attributes: { friendly_name: entity_id, device_class },
      last_changed: '2026-09-23T10:00:00.000Z',
      last_updated: '2026-09-23T10:00:00.000Z',
      context: { id: 'ctx-1', parent_id: null, user_id: null },
    });
    const devices = mapNavetEntitiesToDeviceCollection(
      mapHomeAssistantEntitiesToNavetEntities({
        entities: {
          'fan.office_air_purifier': hassEntity('fan.office_air_purifier', 'on'),
          'sensor.office_humidity': hassEntity('sensor.office_humidity', '55', 'humidity'),
          'sensor.office_temperature': hassEntity('sensor.office_temperature', '21', 'temperature'),
          'sensor.office_pm25': hassEntity('sensor.office_pm25', '12', 'pm25'),
        },
        areas: [],
        deviceRegistry: [],
        entityRegistry: [
          { entity_id: 'fan.office_air_purifier', device_id: 'device-air-purifier' },
          { entity_id: 'sensor.office_humidity', device_id: 'device-air-purifier' },
          { entity_id: 'sensor.office_temperature', device_id: 'device-air-purifier' },
          { entity_id: 'sensor.office_pm25', device_id: 'device-air-purifier' },
        ],
      })
    );
    const shown = resolveDashboardShownSensorEntityIds('climate', devices, []);
    const visible = buildDashboardVisibilityResult(devices, [], shown).visibleDevices.sensors;

    expect(visible.map((sensor) => sensor.deviceClass)).toEqual([
      'humidity',
      'temperature',
      'pm25',
    ]);
    expect(
      visible.map((sensor) => getClimateDashboardGroup({ ...sensor, type: 'sensors' }))
    ).toEqual(['humidity', 'temperature', 'airQuality']);
    expect(
      buildDashboardVisibilityResult(devices, [visible[0].id], shown).visibleDevices.sensors.map(
        (sensor) => sensor.id
      )
    ).toEqual(visible.slice(1).map((sensor) => sensor.id));
  });

  it.each([
    ['temperature', 'temperature', '24.2', '°C'],
    ['pm25', 'airQuality', '28', 'μg/m³'],
    ['volatile_organic_compounds', 'airQuality', '350', 'ppb'],
  ] as const)(
    'includes a normalized %s reading in its Climate section',
    (deviceClass, group, value, unit) => {
      const devices = createEmptyDeviceCollection();
      devices.sensors = [
        {
          id: `openhab:${deviceClass}`,
          name: 'Room reading',
          room: 'Bathroom',
          size: 'small',
          value,
          unit,
          deviceClass,
        },
      ];
      const shown = resolveDashboardShownSensorEntityIds('climate', devices, []);
      const visible = buildDashboardVisibilityResult(devices, [], shown).visibleDevices.sensors;
      expect(visible).toEqual(devices.sensors);
      expect(getClimateDashboardGroup({ ...visible[0], type: 'sensors' })).toBe(group);
      expect(
        buildDashboardVisibilityResult(devices, [visible[0].id], shown).visibleDevices.sensors
      ).toEqual([]);
    }
  );

  it('automatically includes humidity in Climate while preserving Home opt-in and explicit hiding', () => {
    const devices = createEmptyDeviceCollection();
    devices.sensors = [
      {
        id: 'homey:thermostat#measure_humidity',
        name: 'Humidity',
        room: 'Living Room',
        size: 'small',
        value: '46',
        unit: '%',
        deviceClass: 'humidity',
        sourceDeviceId: 'thermostat',
      },
    ];
    const shown = resolveDashboardShownSensorEntityIds('climate', devices, []);
    expect(buildDashboardVisibilityResult(devices, [], shown).visibleDevices.sensors).toEqual(
      devices.sensors
    );
    expect(
      buildDashboardVisibilityResult(devices, [devices.sensors[0].id], shown).visibleDevices.sensors
    ).toEqual([]);
    expect(resolveDashboardShownSensorEntityIds('home', devices, [])).toEqual([]);
  });
});

describe('Security sensor visibility', () => {
  it('loads Homey contact, motion, CO and battery readings into Security while honoring hidden sensors', () => {
    const devices = mapNavetEntitiesToDeviceCollection(
      mapHomeySnapshotToNavetEntities({
        connected: true,
        zones: { entrance: { id: 'entrance', name: 'Entrance' } },
        devices: {
          detector: {
            id: 'detector',
            name: 'Entrance detector',
            class: 'sensor',
            zone: 'entrance',
            capabilitiesObj: {
              alarm_contact: { value: true },
              alarm_motion: { value: true },
              alarm_co: { value: true },
              measure_battery: { value: 15, units: '%' },
              measure_temperature: { value: 21, units: '°C' },
            },
          },
        },
      })
    );
    const shown = resolveDashboardShownSensorEntityIds('security', devices, []);
    const visible = buildDashboardVisibilityResult(devices, [], shown).visibleDevices;
    expect(visible.sensors).toHaveLength(4);
    const model = buildSecurityCameraDashboardModel(visible);
    expect(model.groups.access).toHaveLength(1);
    expect(model.groups.activity).toHaveLength(1);
    expect(model.groups.hazards).toHaveLength(1);
    expect(model.groups.system).toHaveLength(1);
    expect(model.summary.criticalCount).toBe(1);
    const hidden = buildDashboardVisibilityResult(
      devices,
      ['homey:detector#alarm_contact'],
      shown
    ).visibleDevices;
    expect(buildSecurityCameraDashboardModel(hidden).groups.access).toHaveLength(0);
    expect(resolveDashboardShownSensorEntityIds('home', devices, [])).toEqual([]);
  });
});

describe('resolveShouldIncludeFeatureCollections', () => {
  it('keeps feature collections enabled outside low-power mode', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'lights',
        effectsQuality: 'high',
        homeLayoutCardIds: [],
        lowPowerMode: false,
        showAddCardDialog: false,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: false,
      })
    ).toBe(true);
  });

  it('keeps feature collections enabled on home while add dialogs are open in low-power mode', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'high',
        homeLayoutCardIds: [],
        lowPowerMode: true,
        showAddCardDialog: true,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: false,
      })
    ).toBe(true);

    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'high',
        homeLayoutCardIds: [],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: true,
        showFeatureCollectionSummary: false,
      })
    ).toBe(true);
  });

  it('keeps feature collections enabled on home when a weather or calendar card is already present', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'high',
        homeLayoutCardIds: ['home_assistant:weather.home'],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: false,
      })
    ).toBe(true);

    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'high',
        homeLayoutCardIds: ['home_assistant:calendar.navet_overview'],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: false,
      })
    ).toBe(true);
  });

  it('keeps feature collections disabled in low-power mode when home does not need them', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'high',
        homeLayoutCardIds: [],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: false,
      })
    ).toBe(false);

    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'lights',
        effectsQuality: 'high',
        homeLayoutCardIds: ['home_assistant:weather.home'],
        lowPowerMode: true,
        showAddCardDialog: true,
        showAddEntityDialog: true,
        showFeatureCollectionSummary: false,
      })
    ).toBe(false);
  });

  it('treats automatically selected low effects as low-power collection mode', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'low',
        homeLayoutCardIds: [],
        lowPowerMode: false,
        showAddCardDialog: false,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: false,
      })
    ).toBe(false);
  });

  it('keeps feature collections available for a configured home summary pill', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        effectsQuality: 'low',
        homeLayoutCardIds: [],
        lowPowerMode: false,
        showAddCardDialog: false,
        showAddEntityDialog: false,
        showFeatureCollectionSummary: true,
      })
    ).toBe(true);
  });
});

describe('resolveShouldTrackMediaDevices', () => {
  it('tracks media devices in edit mode and on the media section', () => {
    expect(
      resolveShouldTrackMediaDevices({
        activeSection: 'lights',
        cards: [],
        isEditMode: true,
      })
    ).toBe(true);

    expect(
      resolveShouldTrackMediaDevices({
        activeSection: 'media',
        cards: [],
        isEditMode: false,
      })
    ).toBe(true);
  });

  it('tracks media devices on home only when a media-stack card exists', () => {
    expect(
      resolveShouldTrackMediaDevices({
        activeSection: 'home',
        cards: [{ type: 'media-stack' }],
        isEditMode: false,
      })
    ).toBe(true);

    expect(
      resolveShouldTrackMediaDevices({
        activeSection: 'home',
        cards: [{ type: 'rss' }],
        isEditMode: false,
      })
    ).toBe(false);
  });

  it('does not track media devices on unrelated sections outside edit mode', () => {
    expect(
      resolveShouldTrackMediaDevices({
        activeSection: 'lights',
        cards: [{ type: 'media-stack' }],
        isEditMode: false,
      })
    ).toBe(false);
  });
});
