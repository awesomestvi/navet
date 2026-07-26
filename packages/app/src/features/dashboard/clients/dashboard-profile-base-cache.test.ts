import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDashboardProfileBase,
  readDashboardProfileBase,
  writeDashboardProfileBase,
} from './dashboard-profile-base-cache';

const profile: DashboardConfigPayload = {
  version: 3,
  app: 'navet',
  exportedAt: '2026-07-25T08:00:00.000Z',
  theme: { theme: 'dark', primaryColor: 'orange' },
  settings: {},
  navigation: { currentRoom: 'all', activeSection: 'home' },
};

describe('dashboard profile base cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips the last common server revision', () => {
    writeDashboardProfileBase({
      profile,
      profileId: 'default',
      revision: 4,
      savedAt: '2026-07-25T08:00:00.000Z',
      workspaceId: 'workspace_1',
    });
    expect(readDashboardProfileBase()).toMatchObject({
      revision: 4,
      workspaceId: 'workspace_1',
    });

    clearDashboardProfileBase();
    expect(readDashboardProfileBase()).toBeNull();
  });

  it('rejects unsafe workspace metadata', () => {
    expect(() =>
      writeDashboardProfileBase({
        profile,
        profileId: 'default',
        revision: 4,
        savedAt: '2026-07-25T08:00:00.000Z',
        workspaceId: '../../etc',
      })
    ).toThrow('Invalid dashboard profile base snapshot');
  });
});
