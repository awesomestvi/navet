import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadChoreBackup,
  loadChoreDefinitions,
  loadChoreEvents,
  loadChoreHistory,
  loadChoreOccurrences,
  loadChoreWorkspace,
  recoverChoreWorkspace,
  resetChoreWorkspace,
  restoreChoreWorkspace,
  sendChoreWorkspaceCommand,
} from '../chore-workspace.service';

const emptyData = {
  schemaVersion: 2 as const,
  participantsById: {},
  definitionsById: {},
  occurrencesById: {},
  activity: [],
  outbox: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('chore workspace service', () => {
  it('loads and conditionally refreshes the shared document', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          revision: 2,
          updatedAt: '2026-08-10T08:00:00.000Z',
          data: emptyData,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Navet-Chore-Revision': '2' },
        }
      )
    );

    await expect(loadChoreWorkspace(1)).resolves.toMatchObject({
      available: true,
      revision: 2,
      document: { revision: 2, data: emptyData },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${window.location.origin}/__navet_chores__/workspace`
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'same-origin',
      headers: { 'X-Navet-Chore-Revision': '1' },
    });
  });

  it('sends the base revision and classifies a concurrent write', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'changed' }), {
        status: 412,
        headers: { 'X-Navet-Chore-Revision': '4' },
      })
    );

    await expect(
      sendChoreWorkspaceCommand({
        commandId: 'command-1',
        baseRevision: 3,
        action: {
          type: 'participant_create',
          participant: {
            id: 'maya',
            displayName: 'Maya',
            capabilities: ['complete', 'approve', 'manage'],
            createdAt: '2026-08-10T08:00:00.000Z',
            updatedAt: '2026-08-10T08:00:00.000Z',
          },
        },
      })
    ).resolves.toMatchObject({
      saved: false,
      preconditionFailed: true,
      revision: 4,
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Navet-Base-Revision': '3',
      },
    });
  });

  it('sends occurrence actions without a client-authored workspace replacement', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          revision: 4,
          updatedAt: '2026-08-10T08:10:00.000Z',
          data: emptyData,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Navet-Chore-Revision': '4' },
        }
      )
    );

    await expect(
      sendChoreWorkspaceCommand({
        commandId: 'command-complete',
        baseRevision: 3,
        action: {
          type: 'occurrence_action',
          occurrenceId: 'occurrence-1',
          action: { type: 'complete', participantId: 'maya' },
        },
      })
    ).resolves.toMatchObject({ saved: true, revision: 4 });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(requestBody).toEqual({
      action: {
        type: 'occurrence_action',
        occurrenceId: 'occurrence-1',
        action: { type: 'complete', participantId: 'maya' },
      },
      baseRevision: 3,
      commandId: 'command-complete',
    });
    expect(requestBody).not.toHaveProperty('data');
  });

  it('returns the storage authority error for a rejected action', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Only available chores can be completed' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      sendChoreWorkspaceCommand({
        commandId: 'command-complete',
        baseRevision: 3,
        action: {
          type: 'occurrence_action',
          occurrenceId: 'occurrence-1',
          action: { type: 'complete', participantId: 'maya' },
        },
      })
    ).resolves.toMatchObject({
      error: 'Only available chores can be completed',
      saved: false,
    });
  });

  it('does not accept a malformed success document', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ revision: 1, updatedAt: 'invalid', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(loadChoreWorkspace()).resolves.toMatchObject({
      available: false,
      document: null,
    });
  });

  it('returns actionable recovery details and sends an explicit recovery request', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'Chore data could not be read',
            recovery: {
              backupAvailable: true,
              pinConfigured: true,
              reason: 'workspace_invalid',
            },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            revision: 5,
            updatedAt: '2026-08-15T20:00:00.000Z',
            data: emptyData,
            management: { pinConfigured: true },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    await expect(loadChoreWorkspace()).resolves.toMatchObject({
      available: false,
      error: 'Chore data could not be read',
      recovery: { backupAvailable: true, pinConfigured: true, reason: 'workspace_invalid' },
    });
    await expect(
      recoverChoreWorkspace({
        action: 'restore_backup',
        confirmation: 'REPAIR CHORES',
        managementSessionToken: 'manager-session',
      })
    ).resolves.toMatchObject({ saved: true, revision: 5 });

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${window.location.origin}/__navet_chores__/recovery`
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'X-Navet-Chore-Management-Session': 'manager-session',
      }),
      body: JSON.stringify({ action: 'restore_backup', confirmation: 'REPAIR CHORES' }),
    });
  });

  it('loads the provider-neutral automation resources with filters and cursors', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ contractVersion: 1, revision: 4, definitions: [] }))
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ contractVersion: 1, revision: 4, occurrences: [] }))
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ contractVersion: 1, cursor: '7', hasMore: false, events: [] })
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ contractVersion: 1, events: [] })));

    await expect(loadChoreDefinitions()).resolves.toMatchObject({
      available: true,
      value: { revision: 4, definitions: [] },
    });
    await expect(
      loadChoreOccurrences({ from: '2026-08-10T00:00:00.000Z', participantId: 'maya' })
    ).resolves.toMatchObject({ available: true, value: { revision: 4, occurrences: [] } });
    await expect(loadChoreEvents({ after: '4', limit: 50 })).resolves.toMatchObject({
      available: true,
      value: { cursor: '7', hasMore: false, events: [] },
    });
    await expect(loadChoreHistory()).resolves.toMatchObject({
      available: true,
      value: { contractVersion: 1, events: [] },
    });

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `${window.location.origin}/__navet_chores__/definitions`,
      `${window.location.origin}/__navet_chores__/occurrences?from=2026-08-10T00%3A00%3A00.000Z&participantId=maya`,
      `${window.location.origin}/__navet_chores__/events?after=4&limit=50`,
      `${window.location.origin}/__navet_chores__/history`,
    ]);
  });

  it('validates a versioned backup before returning it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          contract: 'navet.chores',
          version: 1,
          exportedAt: '2026-08-14T12:00:00.000Z',
          workspace: emptyData,
          events: [],
        })
      )
    );
    await expect(loadChoreBackup()).resolves.toMatchObject({
      available: true,
      value: { contract: 'navet.chores', version: 1 },
    });
  });

  it('sends explicit restore and destructive reset administration requests', async () => {
    const responseBody = JSON.stringify({
      revision: 5,
      updatedAt: '2026-08-14T12:00:00.000Z',
      data: emptyData,
    });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
    const backup = {
      contract: 'navet.chores' as const,
      version: 1 as const,
      exportedAt: '2026-08-14T12:00:00.000Z',
      workspace: emptyData,
      events: [],
    };
    await restoreChoreWorkspace({
      commandId: 'restore',
      baseRevision: 4,
      actorParticipantId: 'maya',
      mode: 'merge',
      document: backup,
    });
    await resetChoreWorkspace({
      commandId: 'reset',
      baseRevision: 5,
      actorParticipantId: 'maya',
      confirmation: 'DELETE ALL CHORES',
    });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      `${window.location.origin}/__navet_chores__/restore`,
      `${window.location.origin}/__navet_chores__/reset`,
    ]);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Navet-Base-Revision': '5' }),
    });
  });
});
