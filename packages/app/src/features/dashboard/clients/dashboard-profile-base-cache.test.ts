import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDashboardProfileBase,
  clearDashboardProfileReceipt,
  getDashboardProfileFingerprint,
  readDashboardProfileBase,
  readDashboardProfileReceipt,
  writeDashboardProfileBase,
  writeDashboardProfileReceipt,
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
    clearDashboardProfileBase();
    clearDashboardProfileReceipt();
  });

  it('round-trips the last common server revision', () => {
    writeDashboardProfileBase({
      generation: 'generation_active',
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

  it('ignores and removes legacy persisted cross-tab merge bases', () => {
    const persistedBase = JSON.stringify({
      generation: 'generation_active',
      profile,
      profileId: 'default',
      revision: 9,
      savedAt: '2026-07-25T08:00:00.000Z',
      workspaceId: 'workspace_1',
    });
    localStorage.setItem('navet-dashboard-profile-base', persistedBase);
    sessionStorage.setItem('navet-dashboard-profile-base', persistedBase);

    expect(readDashboardProfileBase()).toBeNull();
    expect(localStorage.getItem('navet-dashboard-profile-base')).toBeNull();
    expect(sessionStorage.getItem('navet-dashboard-profile-base')).toBeNull();
  });

  it('rejects unsafe workspace metadata', () => {
    expect(() =>
      writeDashboardProfileBase({
        generation: 'generation_active',
        profile,
        profileId: 'default',
        revision: 4,
        savedAt: '2026-07-25T08:00:00.000Z',
        workspaceId: '../../etc',
      })
    ).toThrow('Invalid dashboard profile base snapshot');
  });

  it('persists a clean-state receipt without persisting the dashboard profile', () => {
    const privateProfile = {
      ...profile,
      customCards: [
        {
          id: 'private-note',
          type: 'note',
          size: 'small',
          room: 'all',
          data: { text: 'Do not persist this profile content in the receipt' },
          createdAt: 1,
        },
      ],
    } satisfies DashboardConfigPayload;

    const receipt = writeDashboardProfileReceipt({
      generation: 'generation_active',
      profile: privateProfile,
      profileId: 'default',
      revision: 7,
      savedAt: '2026-07-25T09:00:00.000Z',
      workspaceId: 'workspace_1',
    });

    expect(receipt).toEqual({
      profileFingerprint: expect.stringMatching(/^dpf1_[a-f0-9]{32}$/),
      profileId: 'default',
      revision: 7,
      savedAt: '2026-07-25T09:00:00.000Z',
      workspaceId: 'workspace_1',
    });
    expect(readDashboardProfileReceipt()).toEqual(receipt);

    const persistedReceipt = localStorage.getItem('navet-dashboard-profile-sync');
    expect(persistedReceipt).not.toContain('private-note');
    expect(persistedReceipt).not.toContain('Do not persist');
    expect(persistedReceipt).not.toContain('"profile"');
  });

  it('fingerprints shared state while ignoring transport-only profile fields', () => {
    const equivalentProfile: DashboardConfigPayload = {
      ...profile,
      exportedAt: '2026-07-26T08:00:00.000Z',
      navigation: { currentRoom: 'kitchen', activeSection: 'lights' },
      cardOrders: { Kitchen: ['home_assistant:light.kitchen'] },
    };
    const changedProfile: DashboardConfigPayload = {
      ...equivalentProfile,
      theme: { ...equivalentProfile.theme, primaryColor: 'blue' },
    };

    expect(getDashboardProfileFingerprint(equivalentProfile)).toBe(
      getDashboardProfileFingerprint(profile)
    );
    expect(getDashboardProfileFingerprint(changedProfile)).not.toBe(
      getDashboardProfileFingerprint(profile)
    );
  });

  it('rejects malformed receipts and clears them from browser storage', () => {
    localStorage.setItem(
      'navet-dashboard-profile-sync',
      JSON.stringify({
        profileFingerprint: 'dpf1_00000000000000000000000000000000',
        profileId: 'default',
        revision: 7,
        savedAt: '2026-07-25T09:00:00.000Z',
        workspaceId: 'workspace_1',
        profile,
      })
    );

    expect(readDashboardProfileReceipt()).toBeNull();
    expect(localStorage.getItem('navet-dashboard-profile-sync')).toBeNull();
    expect(() =>
      writeDashboardProfileReceipt({
        generation: 'generation_active',
        profile,
        profileId: 'default',
        revision: 7,
        savedAt: '2026-07-25T09:00:00.000Z',
        workspaceId: '../../etc',
      })
    ).toThrow('Invalid dashboard profile receipt snapshot');
  });

  it('clears the clean-state receipt independently from the in-memory merge base', () => {
    const snapshot = {
      generation: 'generation_active',
      profile,
      profileId: 'default',
      revision: 4,
      savedAt: '2026-07-25T08:00:00.000Z',
      workspaceId: 'workspace_1',
    };
    writeDashboardProfileBase(snapshot);
    writeDashboardProfileReceipt(snapshot);

    clearDashboardProfileReceipt();

    expect(readDashboardProfileReceipt()).toBeNull();
    expect(readDashboardProfileBase()).toEqual(snapshot);
  });
});
