import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { describe, expect, it } from 'vitest';
import { reconcileDashboardProfiles } from './dashboard-profile-reconciliation';

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

describe('dashboard profile reconciliation', () => {
  it('applies a remote change when there are no local edits', () => {
    const remote = buildProfile({
      theme: { theme: 'dark', primaryColor: 'blue' },
    });
    expect(
      reconcileDashboardProfiles({
        base: buildProfile(),
        hasPendingLocalChanges: false,
        local: buildProfile(),
        remote,
      })
    ).toEqual({ kind: 'apply-remote', profile: remote });
  });

  it('automatically merges non-overlapping local and remote edits', () => {
    const result = reconcileDashboardProfiles({
      base: buildProfile(),
      hasPendingLocalChanges: true,
      local: buildProfile({
        theme: { theme: 'dark', primaryColor: 'green' },
      }),
      remote: buildProfile({
        settings: { showWeatherInHeader: false },
      }),
    });
    expect(result).toMatchObject({
      kind: 'save-merged',
      profile: {
        theme: { primaryColor: 'green' },
        settings: { showWeatherInHeader: false },
      },
    });
  });

  it('interrupts only for an overlapping edit', () => {
    const result = reconcileDashboardProfiles({
      base: buildProfile(),
      hasPendingLocalChanges: true,
      local: buildProfile({
        theme: { theme: 'dark', primaryColor: 'green' },
      }),
      remote: buildProfile({
        theme: { theme: 'dark', primaryColor: 'blue' },
      }),
    });
    expect(result).toMatchObject({
      kind: 'conflict',
      overlappingPaths: ['/theme/primaryColor'],
    });
  });
});
