import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardProfileRuntimeStore } from './dashboard-profile-runtime-store';

describe('dashboard profile runtime store', () => {
  beforeEach(() => {
    useDashboardProfileRuntimeStore.getState().reset();
  });

  it('tracks revision, workspace, activity, and sync state', () => {
    useDashboardProfileRuntimeStore.getState().markLoading();
    useDashboardProfileRuntimeStore.getState().markSynced({
      revision: 7,
      workspaceId: 'workspace_1',
      profileId: 'default',
      at: '2026-07-25T08:00:00.000Z',
      activity: {
        id: 'workspace_1:7',
        revision: 7,
        changedAt: '2026-07-25T08:00:00.000Z',
        changedPaths: ['/theme/primaryColor'],
        actor: {
          clientId: 'phone_1',
          clientName: 'Vishal’s phone',
          clientKind: 'phone',
        },
      },
    });

    expect(useDashboardProfileRuntimeStore.getState()).toMatchObject({
      status: 'synced',
      revision: 7,
      workspaceId: 'workspace_1',
      profileId: 'default',
      lastSyncedAt: '2026-07-25T08:00:00.000Z',
      lastActivity: { revision: 7 },
    });
  });

  it('sorts registered clients by last-seen time', () => {
    useDashboardProfileRuntimeStore.getState().setClients([
      {
        id: 'older',
        name: 'Older panel',
        kind: 'wall_panel',
        firstSeenAt: '2026-07-20T08:00:00.000Z',
        lastSeenAt: '2026-07-24T08:00:00.000Z',
        lastRevision: 4,
      },
      {
        id: 'newer',
        name: 'Phone',
        kind: 'phone',
        firstSeenAt: '2026-07-25T08:00:00.000Z',
        lastSeenAt: '2026-07-25T09:00:00.000Z',
        lastRevision: 7,
      },
    ]);

    expect(useDashboardProfileRuntimeStore.getState().clients.map(({ id }) => id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('tracks and clears a true overlap conflict', () => {
    useDashboardProfileRuntimeStore.getState().setConflict({
      baseRevision: 5,
      remoteRevision: 7,
      overlappingPaths: ['/theme/primaryColor'],
      remoteActivity: null,
    });
    expect(useDashboardProfileRuntimeStore.getState().conflict).toMatchObject({
      remoteRevision: 7,
    });

    useDashboardProfileRuntimeStore.getState().clearConflict();
    expect(useDashboardProfileRuntimeStore.getState().conflict).toBeNull();
  });
});
