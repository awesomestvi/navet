import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteDashboardProfile,
  forgetDashboardClient,
  loadDashboardPreferences,
  loadDashboardProfile,
  saveDashboardPreferences,
  saveDashboardProfile,
} from '../dashboard-profile.service';

function installIngressBase() {
  const base = document.createElement('base');
  base.href = `${window.location.origin}/api/hassio_ingress/navet_dev/`;
  document.head.append(base);
  return base;
}

function getRequestHeaders(requestInit: RequestInit | undefined) {
  if (!requestInit || !(requestInit.headers instanceof Headers)) {
    throw new Error('Expected fetch to be called with Headers');
  }

  return requestInit.headers;
}

afterEach(() => {
  document.querySelector('base')?.remove();
  vi.restoreAllMocks();
});

describe('dashboard add-on endpoints', () => {
  it('loads the shared profile through the ingress-aware endpoint', async () => {
    const base = installIngressBase();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await loadDashboardProfile();

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_profile__/default`,
        {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: new Headers(),
        }
      );
    } finally {
      base.remove();
    }
  });

  it('sends If-None-Match when an ETag is available', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 304,
        headers: { ETag: '"etag-2"', 'Last-Modified': 'Tue, 02 Jan 2024 12:00:00 GMT' },
      })
    );

    await expect(loadDashboardProfile({ etag: '"etag-1"' })).resolves.toMatchObject({
      available: true,
      profile: null,
      notModified: true,
      etag: '"etag-2"',
      lastModified: 'Tue, 02 Jan 2024 12:00:00 GMT',
      generation: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/__navet_profile__/default`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: expect.any(Headers),
    });
    const headers = getRequestHeaders(fetchMock.mock.calls[0]?.[1] as RequestInit | undefined);
    expect(headers).toEqual(
      expect.objectContaining({
        get: expect.any(Function),
      })
    );
    expect(headers.get('If-None-Match')).toBe('"etag-1"');
  });

  it('classifies bad shared-profile writes as permanent failures and returns metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unsupported dashboard profile' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ETag: '"etag-3"' },
      })
    );

    await expect(
      saveDashboardProfile({
        version: 3,
        app: 'navet',
        exportedAt: new Date().toISOString(),
        theme: {
          theme: 'glass',
          primaryColor: 'blue',
        },
        settings: {},
        navigation: {
          currentRoom: 'all',
          activeSection: 'home',
        },
      })
    ).resolves.toMatchObject({
      saved: false,
      permanentFailure: true,
      preconditionFailed: false,
      etag: '"etag-3"',
      lastModified: null,
      generation: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/__navet_profile__/default`, {
      method: 'PUT',
      cache: 'no-store',
      credentials: 'same-origin',
      keepalive: undefined,
      headers: expect.any(Headers),
      body: expect.any(String),
    });
    const headers = getRequestHeaders(fetchMock.mock.calls[0]?.[1] as RequestInit | undefined);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('sends conditional headers when saving against loaded profile metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ETag: '"etag-4"', 'Last-Modified': 'Wed, 03 Jan 2024 12:00:00 GMT' },
      })
    );

    await expect(
      saveDashboardProfile(
        {
          version: 3,
          app: 'navet',
          exportedAt: new Date().toISOString(),
          theme: {
            theme: 'glass',
            primaryColor: 'blue',
          },
          settings: {},
          navigation: {
            currentRoom: 'all',
            activeSection: 'home',
          },
        },
        { etag: '"etag-3"', lastModified: 'Tue, 02 Jan 2024 12:00:00 GMT' }
      )
    ).resolves.toMatchObject({
      saved: true,
      permanentFailure: false,
      preconditionFailed: false,
      etag: '"etag-4"',
      lastModified: 'Wed, 03 Jan 2024 12:00:00 GMT',
      generation: null,
    });

    const headers = getRequestHeaders(fetchMock.mock.calls[0]?.[1] as RequestInit | undefined);
    expect(headers.get('If-Match')).toBe('"etag-3"');
    expect(headers.get('If-Unmodified-Since')).toBeNull();
  });

  it('marks precondition failures so profile sync can refresh validators', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Dashboard profile changed before save' }), {
        status: 412,
        headers: { ETag: '"etag-current"', 'Last-Modified': 'Thu, 04 Jan 2024 12:00:00 GMT' },
      })
    );

    await expect(
      saveDashboardProfile(
        {
          version: 3,
          app: 'navet',
          exportedAt: new Date().toISOString(),
          theme: {
            theme: 'glass',
            primaryColor: 'blue',
          },
          settings: {},
          navigation: {
            currentRoom: 'all',
            activeSection: 'home',
          },
        },
        { etag: '"etag-stale"' }
      )
    ).resolves.toMatchObject({
      saved: false,
      permanentFailure: false,
      preconditionFailed: true,
      etag: '"etag-current"',
      lastModified: 'Thu, 04 Jan 2024 12:00:00 GMT',
      generation: null,
    });
  });

  it('treats missing shared-profile endpoints as permanent write failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 404,
      })
    );

    await expect(
      saveDashboardProfile({
        version: 3,
        app: 'navet',
        exportedAt: new Date().toISOString(),
        theme: {
          theme: 'glass',
          primaryColor: 'blue',
        },
        settings: {},
        navigation: {
          currentRoom: 'all',
          activeSection: 'home',
        },
      })
    ).resolves.toMatchObject({
      saved: false,
      permanentFailure: true,
      preconditionFailed: false,
      etag: null,
      lastModified: null,
      generation: null,
    });
  });

  it('returns the server generation when resetting the shared profile', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { 'X-Navet-Profile-Generation': 'generation-2' },
      })
    );

    await expect(deleteDashboardProfile()).resolves.toMatchObject({
      reset: true,
      permanentFailure: false,
      generation: 'generation-2',
    });
  });

  it('sends revision, changed-path, and client attribution headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          ETag: '"navet-workspace-8"',
          'X-Navet-Profile-Revision': '8',
          'X-Navet-Profile-Recovery': 'active',
        },
      })
    );

    await saveDashboardProfile(
      {
        version: 3,
        app: 'navet',
        exportedAt: new Date().toISOString(),
        theme: { theme: 'glass', primaryColor: 'blue' },
        settings: {},
        navigation: { currentRoom: 'all', activeSection: 'home' },
      },
      {
        author: {
          id: 'client-panel-01',
          name: 'Kitchen panel',
          kind: 'wall_panel',
        },
        baseRevision: 7,
        changedPaths: ['/dashboard/rooms'],
      }
    );

    const headers = getRequestHeaders(fetchMock.mock.calls[0]?.[1] as RequestInit | undefined);
    expect(headers.get('X-Navet-Base-Revision')).toBe('7');
    expect(headers.get('X-Navet-Client-Id')).toBe('client-panel-01');
    expect(decodeURIComponent(headers.get('X-Navet-Client-Name') ?? '')).toBe('Kitchen panel');
    expect(headers.get('X-Navet-Client-Kind')).toBe('wall_panel');
    expect(JSON.parse(decodeURIComponent(headers.get('X-Navet-Changed-Paths') ?? '[]'))).toEqual([
      '/dashboard/rooms',
    ]);
  });

  it('does not treat authentication failures as missing or empty shared profiles', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(loadDashboardProfile()).resolves.toMatchObject({
      available: false,
      unauthorized: true,
      profile: null,
    });
  });

  it('does not tell users to sign in again when the workspace forbids their tenant', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Workspace belongs to another installation' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Navet-Profile-Error-Code': 'workspace-tenant-mismatch',
        },
      })
    );

    await expect(loadDashboardProfile()).resolves.toMatchObject({
      available: false,
      unauthorized: false,
      failureCode: 'workspace-tenant-mismatch',
      profile: null,
    });
  });

  it('parses workspace, revision, author, changed paths, and recovery metadata', async () => {
    const author = {
      id: 'client-phone-01',
      name: 'Vishal phone',
      kind: 'phone',
      providerId: 'home_assistant',
      userId: 'ha-user-1',
      userName: 'Vishal',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          version: 3,
          app: 'navet',
          exportedAt: '2026-07-25T09:00:00.000Z',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Navet-Installation-Id': 'nvi_installation',
            'X-Navet-Workspace-Id': 'nvw_workspace',
            'X-Navet-Workspace-Created-At': '2026-07-25T08:00:00.000Z',
            'X-Navet-Profile-Generation': 'nvg_generation',
            'X-Navet-Profile-Revision': '12',
            'X-Navet-Profile-Recovery': 'active',
            'X-Navet-Profile-Author': encodeURIComponent(JSON.stringify(author)),
            'X-Navet-Changed-Paths': encodeURIComponent(JSON.stringify(['/dashboard/cards/0'])),
            'X-Navet-Profile-Change-Kind': 'patch',
            'X-Navet-Profile-Updated-At': '2026-07-25T09:00:00.000Z',
          },
        }
      )
    );

    await expect(loadDashboardProfile()).resolves.toMatchObject({
      available: true,
      revision: 12,
      workspace: {
        installationId: 'nvi_installation',
        workspaceId: 'nvw_workspace',
      },
      metadata: {
        revision: 12,
        kind: 'patch',
        author,
        changedPaths: ['/dashboard/cards/0'],
      },
      recovery: { status: 'active' },
    });
  });

  it('uses independently revisioned account and client preference endpoints', async () => {
    const preferenceDocument = {
      contractVersion: 1,
      schemaVersion: 2,
      scope: 'client',
      revision: 4,
      updatedAt: '2026-07-25T09:00:00.000Z',
      values: { keepAwake: true },
      principal: {
        providerId: 'home_assistant',
        userId: 'ha-user-1',
        userName: 'Vishal',
      },
      clientId: 'client-panel-01',
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(preferenceDocument), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(preferenceDocument), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    const author = {
      id: 'client-panel-01',
      name: 'Kitchen panel',
      kind: 'wall_panel' as const,
    };

    await expect(loadDashboardPreferences('client', { author })).resolves.toMatchObject({
      available: true,
      document: preferenceDocument,
    });
    await expect(
      saveDashboardPreferences('client', { keepAwake: true }, 3, {
        author,
        schemaVersion: 2,
      })
    ).resolves.toMatchObject({
      saved: true,
      document: preferenceDocument,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${window.location.origin}/__navet_profile__/preferences/client`
    );
    const saveHeaders = getRequestHeaders(fetchMock.mock.calls[1]?.[1] as RequestInit | undefined);
    expect(saveHeaders.get('X-Navet-Base-Revision')).toBe('3');
    expect(saveHeaders.get('X-Navet-Client-Id')).toBe('client-panel-01');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      schemaVersion: 2,
      values: { keepAwake: true },
    });
  });

  it('identifies the requesting browser when forgetting its bound client record', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, forgotten: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const client = {
      id: 'client-panel-01',
      name: 'Kitchen panel',
      kind: 'wall_panel' as const,
    };

    await expect(forgetDashboardClient(client.id, client)).resolves.toBe(true);

    const headers = getRequestHeaders(fetchMock.mock.calls[0]?.[1] as RequestInit | undefined);
    expect(headers.get('X-Navet-Client-Id')).toBe(client.id);
    expect(decodeURIComponent(headers.get('X-Navet-Client-Name') ?? '')).toBe(client.name);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
  });
});
