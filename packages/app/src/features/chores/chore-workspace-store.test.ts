import type { ChoreWorkspaceData } from '@navet/core/chores';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  sendChoreWorkspaceCommand,
  loadChoreWorkspace,
  restoreChoreWorkspace,
  resetChoreWorkspace,
  recoverChoreWorkspace,
} = vi.hoisted(() => ({
  sendChoreWorkspaceCommand: vi.fn(),
  loadChoreWorkspace: vi.fn(),
  restoreChoreWorkspace: vi.fn(),
  resetChoreWorkspace: vi.fn(),
  recoverChoreWorkspace: vi.fn(),
}));

vi.mock('@navet/app/services/chore-workspace.service', () => ({
  loadChoreWorkspace,
  resetChoreWorkspace,
  recoverChoreWorkspace,
  restoreChoreWorkspace,
  sendChoreWorkspaceCommand,
}));

import { useChoreWorkspaceStore } from './chore-workspace-store';

const emptyWorkspace: ChoreWorkspaceData = {
  schemaVersion: 2,
  participantsById: {},
  definitionsById: {},
  occurrencesById: {},
  activity: [],
  outbox: [],
};

describe('chore workspace store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChoreWorkspaceStore.getState().reset();
  });

  it('keeps the last usable workspace visible when a stale occurrence action is rejected', async () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: emptyWorkspace, revision: 4 });
    sendChoreWorkspaceCommand.mockResolvedValue({
      saved: false,
      unauthorized: false,
      preconditionFailed: false,
      error: 'This chore occurrence is stale',
      revision: 4,
      document: null,
    });

    const saved = await useChoreWorkspaceStore.getState().execute({
      type: 'occurrence_action',
      occurrenceId: 'stale-occurrence',
      action: { type: 'complete', participantId: 'participant-manager' },
    });

    expect(saved).toBe(false);
    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      data: emptyWorkspace,
      error: 'This chore occurrence is stale',
      revision: 4,
      status: 'ready',
    });
  });

  it('shows a valid occurrence completion immediately while the authority saves', async () => {
    const scheduledAt = '2026-08-15T08:00:00.000Z';
    const workspace: ChoreWorkspaceData = {
      ...emptyWorkspace,
      participantsById: {
        maya: {
          id: 'maya',
          displayName: 'Maya',
          capabilities: ['complete'],
          createdAt: scheduledAt,
          updatedAt: scheduledAt,
        },
      },
      definitionsById: {
        dishes: {
          id: 'dishes',
          title: 'Unload dishwasher',
          enabled: true,
          assignment: { mode: 'person', participantIds: ['maya'] },
          schedule: {
            frequency: 'once',
            date: '2026-08-15',
            time: '10:00',
            timeZone: 'Europe/Stockholm',
          },
          dueWindowMinutes: 60,
          approval: { required: false, approverIds: [] },
          createdAt: scheduledAt,
          updatedAt: scheduledAt,
        },
      },
      occurrencesById: {
        dishes: {
          id: 'dishes',
          definitionId: 'dishes',
          scheduledAt,
          dueAt: '2026-08-15T09:00:00.000Z',
          assigneeIds: ['maya'],
          assignmentSlot: 'maya',
          status: 'available',
          updatedAt: scheduledAt,
        },
      },
    };
    let resolveSave: ((value: unknown) => void) | undefined;
    sendChoreWorkspaceCommand.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: workspace, revision: 4 });

    const saving = useChoreWorkspaceStore.getState().execute({
      type: 'occurrence_action',
      occurrenceId: 'dishes',
      action: { type: 'complete', participantId: 'maya' },
    });
    await vi.waitFor(() => {
      expect(useChoreWorkspaceStore.getState().data?.occurrencesById.dishes?.status).toBe('done');
    });

    resolveSave?.({
      saved: true,
      unauthorized: false,
      preconditionFailed: false,
      error: null,
      revision: 5,
      document: { data: workspace, revision: 5 },
    });
    await saving;
  });

  it('reports an unavailable authority without replacing it with preview data', async () => {
    loadChoreWorkspace.mockResolvedValue({
      available: false,
      unauthorized: false,
      notModified: false,
      revision: null,
      document: null,
    });

    await useChoreWorkspaceStore.getState().load({ force: true });

    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      data: null,
      error: null,
      revision: null,
      status: 'unavailable',
    });
  });

  it('preserves recovery details and replaces the broken workspace after repair', async () => {
    loadChoreWorkspace.mockResolvedValue({
      available: false,
      unauthorized: false,
      notModified: false,
      error: 'Chore data could not be read',
      recovery: { backupAvailable: true, pinConfigured: false, reason: 'workspace_invalid' },
      revision: null,
      document: null,
    });
    recoverChoreWorkspace.mockResolvedValue({
      saved: true,
      unauthorized: false,
      preconditionFailed: false,
      error: null,
      revision: 7,
      document: {
        data: emptyWorkspace,
        management: { pinConfigured: false },
        revision: 7,
        updatedAt: '2026-08-15T20:00:00.000Z',
      },
    });

    await useChoreWorkspaceStore.getState().load({ force: true });
    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      error: 'Chore data could not be read',
      recovery: { backupAvailable: true, reason: 'workspace_invalid' },
      status: 'unavailable',
    });

    await expect(useChoreWorkspaceStore.getState().recover('restore_backup')).resolves.toBe(true);
    expect(recoverChoreWorkspace).toHaveBeenCalledWith({
      action: 'restore_backup',
      confirmation: 'REPAIR CHORES',
      managementSessionToken: undefined,
    });
    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      data: emptyWorkspace,
      error: null,
      recovery: null,
      revision: 7,
      status: 'ready',
    });
  });

  it('refreshes once and retries an action after a concurrent write', async () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: emptyWorkspace, revision: 4 });
    sendChoreWorkspaceCommand
      .mockResolvedValueOnce({
        saved: false,
        unauthorized: false,
        preconditionFailed: true,
        error: 'Revision changed',
        revision: 5,
        document: null,
      })
      .mockResolvedValueOnce({
        saved: true,
        unauthorized: false,
        preconditionFailed: false,
        error: null,
        revision: 6,
        document: { data: emptyWorkspace, revision: 6 },
      });
    loadChoreWorkspace.mockResolvedValue({
      available: true,
      unauthorized: false,
      notModified: false,
      revision: 5,
      document: {
        data: emptyWorkspace,
        revision: 5,
        updatedAt: '2026-08-14T00:00:00.000Z',
      },
    });

    const saved = await useChoreWorkspaceStore.getState().execute({
      type: 'materialize_occurrences',
      rangeStart: '2026-08-14T00:00:00.000Z',
      rangeEnd: '2026-08-15T00:00:00.000Z',
    });

    expect(saved).toBe(true);
    expect(sendChoreWorkspaceCommand).toHaveBeenCalledTimes(2);
    expect(sendChoreWorkspaceCommand.mock.calls[1]?.[0]).toMatchObject({ baseRevision: 5 });
    expect(useChoreWorkspaceStore.getState()).toMatchObject({ revision: 6, status: 'ready' });
  });

  it('reconciles a transient error when the authority already committed the command', async () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: emptyWorkspace, revision: 4 });
    let committedCommandId = '';
    sendChoreWorkspaceCommand.mockImplementation(async (request) => {
      committedCommandId = request.commandId;
      return {
        saved: false,
        unauthorized: false,
        preconditionFailed: false,
        retryable: true,
        error: 'Chore storage could not finish the request',
        revision: 4,
        document: null,
      };
    });
    loadChoreWorkspace.mockImplementation(async () => ({
      available: true,
      unauthorized: false,
      notModified: false,
      error: null,
      recovery: null,
      revision: 5,
      document: {
        data: {
          ...emptyWorkspace,
          activity: [
            {
              id: `activity:${committedCommandId}`,
              commandId: committedCommandId,
              timestamp: '2026-08-15T20:00:00.000Z',
              type: 'workspace_materialized' as const,
            },
          ],
        },
        revision: 5,
        updatedAt: '2026-08-15T20:00:00.000Z',
      },
    }));

    await expect(
      useChoreWorkspaceStore.getState().execute({
        type: 'materialize_occurrences',
        rangeStart: '2026-08-15T00:00:00.000Z',
        rangeEnd: '2026-08-16T00:00:00.000Z',
      })
    ).resolves.toBe(true);
    expect(sendChoreWorkspaceCommand).toHaveBeenCalledTimes(1);
    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      error: null,
      revision: 5,
      status: 'ready',
    });
  });

  it('replaces the visible workspace after restoring a backup', async () => {
    const restoredWorkspace = { ...emptyWorkspace };
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: emptyWorkspace, revision: 4 });
    restoreChoreWorkspace.mockResolvedValue({
      saved: true,
      unauthorized: false,
      preconditionFailed: false,
      error: null,
      document: { data: restoredWorkspace, revision: 5 },
    });

    const saved = await useChoreWorkspaceStore.getState().restoreBackup({
      actorParticipantId: 'participant-manager',
      document: {
        contract: 'navet.chores',
        version: 1,
        exportedAt: '2026-08-14T00:00:00.000Z',
        workspace: emptyWorkspace,
        events: [],
      },
      mode: 'replace',
    });

    expect(saved).toBe(true);
    expect(restoreChoreWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ baseRevision: 4, mode: 'replace' })
    );
    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      data: restoredWorkspace,
      error: null,
      revision: 5,
      status: 'ready',
    });
  });

  it('clears the visible workspace after a manager reset', async () => {
    useChoreWorkspaceStore.getState().setPreviewDocument({ data: emptyWorkspace, revision: 5 });
    resetChoreWorkspace.mockResolvedValue({
      saved: true,
      unauthorized: false,
      preconditionFailed: false,
      error: null,
      document: { data: emptyWorkspace, revision: 6 },
    });

    const saved = await useChoreWorkspaceStore.getState().deleteAll('participant-manager');

    expect(saved).toBe(true);
    expect(resetChoreWorkspace).toHaveBeenCalledWith({
      actorParticipantId: 'participant-manager',
      baseRevision: 5,
      commandId: expect.any(String),
      confirmation: 'DELETE ALL CHORES',
    });
    expect(useChoreWorkspaceStore.getState()).toMatchObject({
      data: emptyWorkspace,
      error: null,
      revision: 6,
      status: 'ready',
    });
  });
});
