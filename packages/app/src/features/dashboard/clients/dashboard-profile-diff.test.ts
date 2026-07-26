import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { describe, expect, it } from 'vitest';
import {
  getDashboardProfileChangedPaths,
  getOverlappingDashboardProfilePaths,
  mergeDashboardProfiles,
  rebaseLocalDashboardProfile,
} from './dashboard-profile-diff';

function buildProfile(overrides: Partial<DashboardConfigPayload> = {}): DashboardConfigPayload {
  return {
    version: 3,
    app: 'navet',
    exportedAt: '2026-07-25T08:00:00.000Z',
    theme: { theme: 'dark', primaryColor: 'orange' },
    settings: { showWeatherInHeader: true },
    navigation: { currentRoom: 'all', activeSection: 'home' },
    ...overrides,
  };
}

describe('dashboard profile diff and merge', () => {
  it('ignores export timestamps and navigation state', () => {
    const base = buildProfile();
    const next = buildProfile({
      exportedAt: '2026-07-25T09:00:00.000Z',
      navigation: { currentRoom: 'kitchen', activeSection: 'lights' },
    });
    expect(getDashboardProfileChangedPaths(base, next)).toEqual([]);
  });

  it('ignores derived card orders while keeping card sizes meaningful', () => {
    const base = buildProfile({
      cardOrders: {
        Kitchen: ['home_assistant:light.kitchen'],
      },
      cardSizes: {
        'home_assistant:calendar.family': 'medium',
      },
    });
    const reordered = buildProfile({
      cardOrders: {
        Kitchen: ['home_assistant:light.table'],
        Office: ['home_assistant:light.desk'],
      },
      cardSizes: {
        'home_assistant:calendar.family': 'medium',
      },
    });
    const resized = buildProfile({
      cardOrders: reordered.cardOrders,
      cardSizes: {
        'home_assistant:calendar.family': 'large',
      },
    });

    expect(getDashboardProfileChangedPaths(base, reordered)).toEqual([]);
    expect(getDashboardProfileChangedPaths(base, resized)).toEqual([
      '/cardSizes/home_assistant:calendar.family',
    ]);
  });

  it('merges independent edits from two dashboards', () => {
    const base = buildProfile();
    const local = buildProfile({
      theme: { theme: 'dark', primaryColor: 'green' },
    });
    const remote = buildProfile({
      settings: { showWeatherInHeader: false },
    });

    const result = mergeDashboardProfiles(base, local, remote);
    expect(result.overlappingPaths).toEqual([]);
    expect(result.profile).toMatchObject({
      theme: { primaryColor: 'green' },
      settings: { showWeatherInHeader: false },
    });
  });

  it('reports only overlapping field edits as conflicts', () => {
    const base = buildProfile();
    const local = buildProfile({
      theme: { theme: 'dark', primaryColor: 'green' },
    });
    const remote = buildProfile({
      theme: { theme: 'dark', primaryColor: 'blue' },
    });

    expect(mergeDashboardProfiles(base, local, remote)).toMatchObject({
      profile: null,
      overlappingPaths: ['/theme/primaryColor'],
    });
    expect(getOverlappingDashboardProfilePaths(['/settings'], ['/settings/kioskMode'])).toEqual([
      '/settings',
    ]);
  });

  it('rebases local values over remote for an explicit keep-mine action', () => {
    const base = buildProfile();
    const local = buildProfile({
      theme: { theme: 'dark', primaryColor: 'green' },
    });
    const remote = buildProfile({
      theme: { theme: 'dark', primaryColor: 'blue' },
      settings: { showWeatherInHeader: false },
    });

    expect(rebaseLocalDashboardProfile(base, local, remote)).toMatchObject({
      theme: { primaryColor: 'green' },
      settings: { showWeatherInHeader: false },
    });
  });
});
