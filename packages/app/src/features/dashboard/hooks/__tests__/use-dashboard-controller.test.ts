import { describe, expect, it } from 'vitest';
import {
  resolveShouldIncludeFeatureCollections,
  resolveShouldTrackMediaDevices,
} from '../use-dashboard-controller';

describe('resolveShouldIncludeFeatureCollections', () => {
  it('keeps feature collections enabled outside low-power mode', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'lights',
        homeLayoutCardIds: [],
        lowPowerMode: false,
        showAddCardDialog: false,
        showAddEntityDialog: false,
      })
    ).toBe(true);
  });

  it('keeps feature collections enabled on home while add dialogs are open in low-power mode', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        homeLayoutCardIds: [],
        lowPowerMode: true,
        showAddCardDialog: true,
        showAddEntityDialog: false,
      })
    ).toBe(true);

    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        homeLayoutCardIds: [],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: true,
      })
    ).toBe(true);
  });

  it('keeps feature collections enabled on home when a weather or calendar card is already present', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        homeLayoutCardIds: ['home_assistant:weather.home'],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: false,
      })
    ).toBe(true);

    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        homeLayoutCardIds: ['home_assistant:calendar.navet_overview'],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: false,
      })
    ).toBe(true);
  });

  it('keeps feature collections disabled in low-power mode when home does not need them', () => {
    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'home',
        homeLayoutCardIds: [],
        lowPowerMode: true,
        showAddCardDialog: false,
        showAddEntityDialog: false,
      })
    ).toBe(false);

    expect(
      resolveShouldIncludeFeatureCollections({
        activeSection: 'lights',
        homeLayoutCardIds: ['home_assistant:weather.home'],
        lowPowerMode: true,
        showAddCardDialog: true,
        showAddEntityDialog: true,
      })
    ).toBe(false);
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
