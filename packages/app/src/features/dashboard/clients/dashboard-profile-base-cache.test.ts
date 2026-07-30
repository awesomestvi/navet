import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDashboardPreferenceReceipts,
  clearDashboardProfileBase,
  clearDashboardProfileReceipt,
  getDashboardProfileFingerprint,
  readDashboardPreferenceReceipt,
  readDashboardProfileBase,
  readDashboardProfileReceipt,
  writeDashboardPreferenceReceipt,
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
    clearDashboardPreferenceReceipts();
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

  it('scopes credential-free preference receipts to workspace, layer, and owner', () => {
    const preference = {
      schemaVersion: 1,
      settings: {
        language: 'sv',
      },
    };
    const receipt = writeDashboardPreferenceReceipt({
      installationId: 'installation_1',
      layer: 'account',
      ownerKey: 'account:home_assistant:user_1',
      preference,
      revision: 7,
      savedAt: '2026-07-25T09:00:00.000Z',
      workspaceId: 'workspace_1',
    });

    expect(
      readDashboardPreferenceReceipt({
        installationId: 'installation_1',
        layer: 'account',
        ownerKey: 'account:home_assistant:user_1',
        workspaceId: 'workspace_1',
      })
    ).toEqual(receipt);
    expect(
      readDashboardPreferenceReceipt({
        installationId: 'installation_1',
        layer: 'device',
        ownerKey: 'client:client_phone_1',
        workspaceId: 'workspace_1',
      })
    ).toBeNull();
    expect(
      readDashboardPreferenceReceipt({
        installationId: 'installation_2',
        layer: 'account',
        ownerKey: 'account:home_assistant:user_1',
        workspaceId: 'workspace_2',
      })
    ).toBeNull();

    const persistedReceipt = localStorage.getItem('navet-dashboard-preference-sync');
    expect(persistedReceipt).not.toContain('user_1');
    expect(persistedReceipt).not.toContain('sv');
    expect(persistedReceipt).toContain('"version":2');
    expect(receipt?.fieldFingerprints.language).toMatch(/^dpv1_[a-f0-9]{32}$/);
  });

  it('reports a failed preference receipt write instead of trusting swallowed storage errors', () => {
    const originalSetItem = Storage.prototype.setItem;
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key === 'navet-dashboard-preference-sync') {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    });

    expect(
      writeDashboardPreferenceReceipt({
        installationId: 'installation_1',
        layer: 'device',
        ownerKey: 'client:client_phone_1',
        preference: {
          schemaVersion: 1,
          settings: { lowPowerMode: true },
        },
        revision: 3,
        workspaceId: 'workspace_1',
      })
    ).toBeNull();
    setItem.mockRestore();
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
