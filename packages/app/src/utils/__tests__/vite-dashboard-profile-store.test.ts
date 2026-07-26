import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyDashboardProfilePatch,
  createViteDashboardProfileRequestHandler,
  createViteDashboardProfileStore,
  type DashboardProfileData,
  sanitizeDashboardProfileData,
  type ViteDashboardProfilePrincipal,
} from '@scripts/vite-dashboard-profile-store';
import { afterEach, describe, expect, it, vi } from 'vitest';

const PROFILE: DashboardProfileData = {
  app: 'navet',
  version: 3,
  exportedAt: '2026-07-25T09:00:00.000Z',
  dashboard: { title: 'Kitchen' },
};

const AUTHOR = {
  id: 'client-panel-01',
  name: 'Kitchen panel',
  kind: 'wall_panel' as const,
  providerId: 'home_assistant',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

const PRINCIPAL: ViteDashboardProfilePrincipal = {
  providerId: 'home_assistant',
  sessionId: 'nas_session_one',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

const CLIENT_HEADERS = {
  'x-navet-client-id': 'client-panel-01',
  'x-navet-client-name': encodeURIComponent('Kitchen panel'),
  'x-navet-client-kind': 'wall_panel',
};

const tempDirs: string[] = [];

function createStore() {
  const directory = mkdtempSync(join(tmpdir(), 'navet-dashboard-profile-'));
  tempDirs.push(directory);
  return createViteDashboardProfileStore(join(directory, 'profile.json'));
}

function createRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body = ''
) {
  return {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() {
      if (body) {
        yield Buffer.from(body);
      }
    },
  } as unknown as IncomingMessage;
}

function createResponse() {
  const headers = new Map<string, string>();
  let body = '';
  const response = {
    statusCode: 200,
    setHeader: vi.fn((name: string, value: string | number) => {
      headers.set(name.toLowerCase(), String(value));
      return response;
    }),
    end: vi.fn((value?: string) => {
      body = value ?? '';
      return response;
    }),
  } as unknown as ServerResponse;

  return {
    response,
    get status() {
      return response.statusCode;
    },
    get body() {
      return body;
    },
    header(name: string) {
      return headers.get(name.toLowerCase());
    },
  };
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('createViteDashboardProfileStore', () => {
  it('keeps only shared settings and removes credential-bearing extension URLs', () => {
    const sanitized = sanitizeDashboardProfileData({
      ...PROFILE,
      settings: {
        showHomeSummaryBar: false,
        language: 'sv',
        kioskMode: true,
        cameraDirectStreamUrls: {
          'camera.front': 'https://example.com/live?access_token=private',
        },
        customSidebarActions: [
          {
            id: 'safe',
            targetUrl: 'https://example.com/status',
          },
          {
            id: 'private',
            targetUrl: 'https://example.com/status?api_key=private',
          },
        ],
      },
      theme: {
        wallpaper: '/api/camera_proxy/camera.front?authSig=wallpaper-private',
      },
      customCards: [
        {
          id: 'photo-card',
          data: {
            photoUrls: [
              'https://example.com/photo.jpg',
              '/api/camera_proxy/camera.front?authSig=photo-private',
            ],
          },
        },
        {
          id: 'button-card',
          data: {
            serviceData: {
              access_token: 'service-private',
              code: 'alarm-private',
              jwt: 'jwt-private',
              'X-API-Key': 'header-private',
              brightness_pct: 50,
              callback: '/dashboard#access_token=fragment-private',
            },
          },
        },
      ],
    });

    expect(sanitized.settings).toEqual({
      showHomeSummaryBar: false,
      customSidebarActions: [
        {
          id: 'safe',
          targetUrl: 'https://example.com/status',
        },
      ],
    });
    expect(JSON.stringify(sanitized)).not.toContain('private');
    expect(JSON.stringify(sanitized)).not.toContain('cameraDirectStreamUrls');
    expect(sanitized.theme).toEqual({});
    expect(sanitized.customCards).toEqual([
      {
        id: 'photo-card',
        data: {
          photoUrls: ['https://example.com/photo.jpg'],
        },
      },
      {
        id: 'button-card',
        data: {
          serviceData: {
            brightness_pct: 50,
          },
        },
      },
    ]);
  });

  it('persists stable workspace identity and monotonic revision metadata', () => {
    const store = createStore();
    const workspace = store.getWorkspace();

    store.saveProfile(PROFILE, {
      author: AUTHOR,
      changedPaths: ['/dashboard/title'],
    });
    const restored = createViteDashboardProfileStore(store.getPaths().profile);

    expect(restored.getWorkspace()).toEqual(workspace);
    expect(restored.getState()).toMatchObject({
      revision: 1,
      status: 'active',
      metadata: {
        revision: 1,
        author: AUTHOR,
        changedPaths: ['/dashboard/title'],
      },
    });
    expect(restored.getProfile()).toEqual(PROFILE);
    expect(restored.getProfileMetadata().etag).toBe(`"navet-${workspace.workspaceId}-1"`);
  });

  it('migrates a valid legacy profile and ignores invalid legacy data', () => {
    const validStore = createStore();
    writeFileSync(validStore.getPaths().profile, JSON.stringify(PROFILE), 'utf8');
    expect(validStore.getState()).toMatchObject({
      revision: 1,
      status: 'active',
      metadata: { author: expect.objectContaining({ id: 'legacy-import' }) },
    });

    const invalidStore = createStore();
    writeFileSync(
      invalidStore.getPaths().profile,
      JSON.stringify({ app: 'navet', version: 2 }),
      'utf8'
    );
    expect(invalidStore.getProfile()).toBeNull();
    expect(invalidStore.getState()).toMatchObject({
      revision: 0,
      status: 'uninitialized',
    });
  });

  it('sanitizes legacy profile and history files during migration', () => {
    const store = createStore();
    writeFileSync(
      store.getPaths().profile,
      JSON.stringify({
        ...PROFILE,
        settings: {
          showHomeSummaryBar: false,
          language: 'sv',
          cameraDirectStreamUrls: {
            'camera.front': 'https://example.com/live?token=private',
          },
        },
      }),
      'utf8'
    );
    writeFileSync(
      store.getPaths().history,
      JSON.stringify([
        {
          metadata: { revision: 99 },
          profile: {
            ...PROFILE,
            customCards: [{ data: { serviceData: { code: 'invalid-history-private' } } }],
          },
        },
      ]),
      'utf8'
    );

    expect(store.getState()).toMatchObject({
      revision: 1,
      metadata: {
        author: {
          id: 'legacy-import',
        },
      },
    });
    expect(store.getProfile()?.settings).toEqual({
      showHomeSummaryBar: false,
    });
    expect(readFileSync(store.getPaths().profile, 'utf8')).not.toContain('private');
    expect(readFileSync(store.getPaths().history, 'utf8')).not.toContain('private');
  });

  it('distinguishes recoverable missing storage from an explicit reset marker', () => {
    const store = createStore();
    store.saveProfile(PROFILE, { author: AUTHOR });
    unlinkSync(store.getPaths().profile);

    expect(store.getRecovery()).toEqual({
      status: 'recoverable',
      resetRevision: null,
      latestRecoverableRevision: 1,
    });

    writeFileSync(store.getPaths().profile, JSON.stringify(PROFILE), 'utf8');
    store.resetProfile(AUTHOR);
    expect(store.getRecovery()).toEqual({
      status: 'reset',
      resetRevision: 2,
      latestRecoverableRevision: 1,
    });
  });

  it('keeps 20 snapshots and restores a historical profile as a new revision', () => {
    const store = createStore();
    for (let revision = 0; revision < 22; revision += 1) {
      store.saveProfile(
        {
          ...PROFILE,
          exportedAt: `2026-07-25T09:${String(revision).padStart(2, '0')}:00.000Z`,
          dashboard: { title: `Kitchen revision ${revision + 1}` },
        },
        { author: AUTHOR }
      );
    }

    expect(store.getHistory()).toHaveLength(20);
    expect(store.getHistory().at(-1)?.revision).toBe(3);
    expect(store.restoreRevision(3, AUTHOR)).toMatchObject({
      revision: 23,
      metadata: { kind: 'restore', restoredFromRevision: 3 },
    });
  });

  it('applies safe JSON Patch operations without prototype pollution', () => {
    expect(
      applyDashboardProfilePatch(PROFILE, [
        { op: 'replace', path: '/dashboard/title', value: 'From phone' },
      ])
    ).toMatchObject({ dashboard: { title: 'From phone' } });
    expect(() =>
      applyDashboardProfilePatch(PROFILE, [{ op: 'add', path: '/__proto__/polluted', value: true }])
    ).toThrow('Unsafe JSON pointer');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('separates account preferences and keeps client preferences across OAuth sessions', () => {
    const store = createStore();
    store.savePreference('account', PRINCIPAL, 1, {
      language: 'sv',
      kioskMode: true,
      cameraDirectStreamUrls: {
        'camera.front': 'https://example.com/live?token=private',
      },
      cameraWebRtcStreamSources: {
        'camera.front': 'direct_mse',
      },
    });
    store.savePreference(
      'client',
      PRINCIPAL,
      1,
      {
        keepDeviceAwake: true,
        language: 'sv',
        cameraDirectStreamUrls: {
          'camera.front': 'https://example.com/live?token=private',
        },
        cameraWebRtcStreamSources: {
          'camera.front': 'direct_mse',
        },
      },
      AUTHOR
    );

    expect(store.getPreference('account', PRINCIPAL)).toMatchObject({
      scope: 'account',
      values: { language: 'sv' },
      clientId: null,
    });
    expect(store.getPreference('client', PRINCIPAL, AUTHOR)).toMatchObject({
      scope: 'client',
      values: { keepDeviceAwake: true },
      clientId: 'client-panel-01',
    });
    expect(JSON.stringify(store.getPreference('account', PRINCIPAL))).not.toContain('private');
    expect(JSON.stringify(store.getPreference('client', PRINCIPAL, AUTHOR))).not.toContain(
      'private'
    );
    expect(JSON.stringify(store.getPreference('account', PRINCIPAL))).not.toContain(
      'cameraWebRtcStreamSources'
    );
    expect(JSON.stringify(store.getPreference('client', PRINCIPAL, AUTHOR))).not.toContain(
      'cameraWebRtcStreamSources'
    );

    const nextSession = {
      ...PRINCIPAL,
      sessionId: 'nas_session_two',
      userId: 'ha-user-2',
      userName: 'Other user',
    };
    expect(store.getPreference('account', nextSession)).toBeNull();
    expect(store.getPreference('client', nextSession, AUTHOR)).toMatchObject({
      scope: 'client',
      values: { keepDeviceAwake: true },
      clientId: 'client-panel-01',
    });

    store.touchClient(PRINCIPAL, AUTHOR);
    expect(store.forgetClient(AUTHOR.id)).toBe(true);
    expect(store.getPreference('client', nextSession, AUTHOR)).toBeNull();
  });
});

describe('Vite dashboard profile request handler', () => {
  it('rejects anonymous requests instead of exposing the shared profile', async () => {
    const handler = createViteDashboardProfileRequestHandler({
      store: createStore(),
      resolvePrincipal: () => null,
    });
    const output = createResponse();

    await handler(createRequest('GET', '/default'), output.response);

    expect(output.status).toBe(401);
    expect(JSON.parse(output.body)).toEqual({ error: 'Authentication required' });
  });

  it('matches the NJS revision, conditional-write, and author header contract', async () => {
    const store = createStore();
    const handler = createViteDashboardProfileRequestHandler({
      store,
      resolvePrincipal: () => PRINCIPAL,
    });
    const first = createResponse();

    await handler(
      createRequest(
        'PUT',
        '/default',
        {
          ...CLIENT_HEADERS,
          'content-type': 'application/json',
          'x-navet-base-revision': '0',
          'x-navet-changed-paths': encodeURIComponent(JSON.stringify(['/dashboard/title'])),
        },
        JSON.stringify(PROFILE)
      ),
      first.response
    );

    expect(first.status).toBe(200);
    expect(first.header('x-navet-profile-revision')).toBe('1');
    expect(first.header('x-navet-installation-id')).toMatch(/^nvi_/);
    expect(first.header('x-navet-workspace-id')).toMatch(/^nvw_/);
    expect(
      JSON.parse(decodeURIComponent(first.header('x-navet-profile-author') ?? '{}'))
    ).toMatchObject({
      id: 'client-panel-01',
      userId: 'ha-user-1',
      userName: 'Vishal',
    });

    const stale = createResponse();
    await handler(
      createRequest(
        'PUT',
        '/default',
        {
          ...CLIENT_HEADERS,
          'x-navet-base-revision': '0',
        },
        JSON.stringify(PROFILE)
      ),
      stale.response
    );
    expect(stale.status).toBe(412);
    expect(store.getState().revision).toBe(1);

    const read = createResponse();
    await handler(createRequest('GET', '/default'), read.response);
    expect(read.status).toBe(200);
    expect(JSON.parse(read.body)).toEqual(PROFILE);
  });
});
