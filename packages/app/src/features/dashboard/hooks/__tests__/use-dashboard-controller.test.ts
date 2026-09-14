import { describe, expect, it } from 'vitest';
import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { buildDashboardVisibilityResult } from '@navet/app/hooks/use-dashboard-devices';
import {
  resolveDashboardShownSensorEntityIds,
  resolveShouldIncludeFeatureCollections,
  resolveShouldTrackMediaDevices,
} from '../use-dashboard-controller';

describe('Climate environmental sensor visibility', () => {
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
