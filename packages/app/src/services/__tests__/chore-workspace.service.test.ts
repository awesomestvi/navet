import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadChoreWorkspace, sendChoreWorkspaceCommand } from '../chore-workspace.service';

const emptyData = {
  schemaVersion: 1 as const,
  participantsById: {},
  definitionsById: {},
  occurrencesById: {},
  activity: [],
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
      sendChoreWorkspaceCommand({ commandId: 'command-1', baseRevision: 3, data: emptyData })
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
});
