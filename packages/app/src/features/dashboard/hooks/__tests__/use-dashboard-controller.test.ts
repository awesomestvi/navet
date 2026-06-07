import { describe, expect, it } from 'vitest';
import { resolveShouldIncludeFeatureCollections } from '../use-dashboard-controller';

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
