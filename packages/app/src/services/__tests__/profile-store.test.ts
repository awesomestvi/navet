import profileStore from '@docker/njs/profile-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const PROFILE_PATH = '/data/navet-dashboard-profile.json';
const WORKSPACE_PATH = '/data/navet-dashboard-workspace.json';
const PROFILE_STATE_PATH = '/data/navet-dashboard-profile-state.json';
const PROFILE_HISTORY_PATH = '/data/navet-dashboard-profile-history.json';
const ACCOUNT_PREFERENCES_PATH = '/data/navet-dashboard-account-preferences.json';
const CLIENT_PREFERENCES_PATH = '/data/navet-dashboard-client-preferences.json';
const CLIENT_REGISTRY_PATH = '/data/navet-dashboard-clients.json';
const HA_TENANT_ID = `hat_${'a'.repeat(64)}`;
const CLIENT_BINDING_A = 'a'.repeat(64);
const CLIENT_BINDING_B = 'b'.repeat(64);

const CLIENT_HEADERS = {
  'X-Navet-Client-Id': 'client-panel-01',
  'X-Navet-Client-Name': encodeURIComponent('Kitchen panel'),
  'X-Navet-Client-Kind': 'wall_panel',
  Cookie: `navet_profile_client=${CLIENT_BINDING_A}`,
};

const PRINCIPAL = {
  providerId: 'home_assistant',
  tenantId: HA_TENANT_ID,
  sessionId: 'nas_session_one',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

interface TestPrincipal {
  providerId: string;
  tenantId: string;
  sessionId: string;
  userId: string | null;
  userName: string | null;
}

function createRequest(
  overrides: Partial<{
    method: string;
    uri: string;
    headersIn: Record<string, string>;
    requestText: string;
  }> = {}
) {
  return {
    method: 'GET',
    uri: '/__navet_profile__/default',
    headersOut: {} as Record<string, string>,
    requestText: '',
    return: vi.fn(),
    ...overrides,
    headersIn: {
      Host: 'navet.example',
      Origin: 'http://navet.example',
      ...overrides.headersIn,
    },
  };
}

function createMockFs(files: Record<string, string> = {}) {
  const fileMap = new Map(Object.entries(files));
  const renameFailures = new Set<string>();
  const createMissingError = (path: string) => {
    const error = new Error(`ENOENT: ${path}`);
    // @ts-expect-error test-only shape
    error.code = 'ENOENT';
    return error;
  };

  return {
    statSync: vi.fn((path: string) => {
      const content = fileMap.get(path);
      if (content === undefined) {
        throw createMissingError(path);
      }
      const mtime = new Date('2026-07-25T09:00:00.000Z');
      return { size: content.length, mtimeMs: mtime.getTime(), mtime };
    }),
    readFileSync: vi.fn((path: string) => {
      const content = fileMap.get(path);
      if (content === undefined) {
        throw createMissingError(path);
      }
      return content;
    }),
    writeFileSync: vi.fn((path: string, content: string) => {
      fileMap.set(path, content);
    }),
    renameSync: vi.fn((source: string, destination: string) => {
      if (renameFailures.delete(destination)) {
        const error = new Error(`EIO: ${destination}`);
        // @ts-expect-error test-only shape
        error.code = 'EIO';
        throw error;
      }
      const content = fileMap.get(source);
      if (content === undefined) {
        throw createMissingError(source);
      }
      fileMap.set(destination, content);
      fileMap.delete(source);
    }),
    unlinkSync: vi.fn((path: string) => {
      if (!fileMap.delete(path)) {
        throw createMissingError(path);
      }
    }),
    getFile: (path: string) => fileMap.get(path),
    failNextRenameTo: (path: string) => {
      renameFailures.add(path);
    },
  };
}

function parseResponse(request: ReturnType<typeof createRequest>) {
  const body = request.return.mock.calls.at(-1)?.[1];
  return typeof body === 'string' ? JSON.parse(body) : null;
}

function readMockFile(mockFs: ReturnType<typeof createMockFs>, path: string): string {
  const content = mockFs.getFile(path);
  if (content === undefined) {
    throw new Error(`Expected mock file ${path}`);
  }
  return content;
}

function setPrincipal(
  resolver: (
    options: { trustIngressHeaders: boolean },
    request: ReturnType<typeof createRequest>
  ) => TestPrincipal | null = () => PRINCIPAL
) {
  profileStore.setProfileStorePrincipalResolverForTests((request, options) =>
    resolver(options, request as ReturnType<typeof createRequest>)
  );
}

function writeProfile(
  revision: number,
  exportedAt = '2026-07-25T09:00:00.000Z',
  extraHeaders: Record<string, string> = {}
) {
  const request = createRequest({
    method: 'PUT',
    headersIn: {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': String(revision),
      ...extraHeaders,
    },
    requestText: JSON.stringify({
      app: 'navet',
      version: 3,
      exportedAt,
      dashboard: { title: `Revision ${revision + 1}` },
    }),
  });
  profileStore.handle(request);
  return request;
}

afterEach(() => {
  profileStore.resetProfileStoreFsForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('revisioned NJS dashboard profile store', () => {
  it('rejects anonymous normal routes and only enables ingress identity in the explicit handler', () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    setPrincipal((options) => (options.trustIngressHeaders ? PRINCIPAL : null));

    const normalRequest = createRequest();
    profileStore.handle(normalRequest);
    expect(normalRequest.return).toHaveBeenCalledWith(
      401,
      JSON.stringify({ error: 'Authentication required' })
    );

    const ingressRequest = createRequest({
      headersIn: { 'X-Remote-User-Id': 'spoofed-on-normal-route' },
    });
    profileStore.handleIngress(ingressRequest);
    expect(ingressRequest.return).toHaveBeenCalledWith(204);
    expect(ingressRequest.headersOut['X-Navet-Profile-Recovery']).toBe('uninitialized');
  });

  it('requires an exact public origin for every profile mutation, including restore', () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    setPrincipal();

    for (const [method, uri] of [
      ['PUT', '/__navet_profile__/default'],
      ['PATCH', '/__navet_profile__/default'],
      ['DELETE', '/__navet_profile__/default'],
      ['POST', '/__navet_profile__/default/revisions/1/restore'],
      ['PUT', '/__navet_profile__/preferences/account'],
      ['DELETE', '/__navet_profile__/preferences/client'],
      ['PUT', '/__navet_profile__/clients'],
      ['DELETE', '/__navet_profile__/clients/client-panel-01'],
    ]) {
      for (const origin of ['', 'http://sibling.navet.example']) {
        const request = createRequest({
          method,
          uri,
          headersIn: {
            Host: 'navet.example',
            Origin: origin,
          },
        });
        profileStore.handle(request);
        expect(
          request.return,
          `${method} ${uri} from ${origin || 'no origin'}`
        ).toHaveBeenCalledWith(
          403,
          JSON.stringify({ error: 'Cross-origin profile mutation is not allowed' })
        );
      }
    }
  });

  it('creates stable installation/workspace identity and monotonically revisioned profile writes', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const first = writeProfile(0, '2026-07-25T09:00:00.000Z', {
      'X-Navet-Changed-Paths': encodeURIComponent(JSON.stringify(['/dashboard/title'])),
    });
    expect(first.return).toHaveBeenCalledWith(200, expect.stringContaining('"revision":1'));
    expect(first.headersOut['X-Navet-Profile-Revision']).toBe('1');
    expect(first.headersOut['X-Navet-Installation-Id']).toMatch(/^nvi_/);
    expect(first.headersOut['X-Navet-Workspace-Id']).toMatch(/^nvw_/);
    expect(first.headersOut.ETag).toContain('-1"');

    const firstWorkspace = first.headersOut['X-Navet-Workspace-Id'];
    const second = writeProfile(1, '2026-07-25T09:05:00.000Z');
    expect(second.headersOut['X-Navet-Profile-Revision']).toBe('2');
    expect(second.headersOut['X-Navet-Workspace-Id']).toBe(firstWorkspace);

    const state = JSON.parse(readMockFile(mockFs, PROFILE_STATE_PATH));
    expect(state.metadata).toMatchObject({
      revision: 2,
      author: {
        id: 'client-panel-01',
        name: 'Kitchen panel',
        kind: 'wall_panel',
        userId: 'ha-user-1',
        userName: 'Vishal',
      },
    });

    const persistedWorkspace = JSON.parse(readMockFile(mockFs, WORKSPACE_PATH));
    expect(persistedWorkspace.tenantBinding).toMatchObject({
      providerId: 'home_assistant',
      tenantId: HA_TENANT_ID,
    });

    for (const uri of ['/__navet_profile__/default/history', '/__navet_profile__/clients']) {
      const request = createRequest({ uri });
      profileStore.handle(request);
      const response = parseResponse(request);
      expect(response.workspace).not.toHaveProperty('tenantBinding');
      expect(JSON.stringify(response)).not.toContain(HA_TENANT_ID);
    }
  });

  it('persists only shared settings and removes credential-bearing extension URLs', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const request = createRequest({
      method: 'PUT',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': '0',
      },
      requestText: JSON.stringify({
        app: 'navet',
        version: 3,
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
      }),
    });

    profileStore.handle(request);

    const persisted = JSON.parse(readMockFile(mockFs, PROFILE_PATH));
    expect(persisted.settings).toEqual({
      showHomeSummaryBar: false,
      customSidebarActions: [
        {
          id: 'safe',
          targetUrl: 'https://example.com/status',
        },
      ],
    });
    expect(JSON.stringify(persisted)).not.toContain('private');
    expect(JSON.stringify(persisted)).not.toContain('cameraDirectStreamUrls');
    expect(persisted.theme).toEqual({});
    expect(persisted.customCards).toEqual([
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

  it('sanitizes legacy profile and history files during the revision-store migration', () => {
    const legacyProfile = {
      app: 'navet',
      version: 3,
      exportedAt: '2026-07-25T09:00:00.000Z',
      settings: {
        showHomeSummaryBar: false,
        language: 'sv',
        cameraDirectStreamUrls: {
          'camera.front': 'https://example.com/live?token=private',
        },
      },
    };
    const mockFs = createMockFs({
      [PROFILE_PATH]: JSON.stringify(legacyProfile),
      [PROFILE_HISTORY_PATH]: JSON.stringify([
        {
          metadata: { revision: 99 },
          profile: {
            ...legacyProfile,
            customCards: [{ data: { serviceData: { code: 'invalid-history-private' } } }],
          },
        },
      ]),
    });
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const request = createRequest();
    profileStore.handle(request);

    expect(parseResponse(request).settings).toEqual({
      showHomeSummaryBar: false,
    });
    expect(readMockFile(mockFs, PROFILE_PATH)).not.toContain('private');
    expect(readMockFile(mockFs, PROFILE_HISTORY_PATH)).not.toContain('private');
    expect(JSON.parse(readMockFile(mockFs, PROFILE_STATE_PATH))).toMatchObject({
      revision: 1,
      metadata: {
        author: {
          id: 'legacy-import',
        },
      },
    });
  });

  it('requires a base revision after initialization and rejects stale writers', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    writeProfile(0);

    const noBase = createRequest({
      method: 'PUT',
      headersIn: CLIENT_HEADERS,
      requestText: JSON.stringify({ app: 'navet', version: 3 }),
    });
    profileStore.handle(noBase);
    expect(noBase.return).toHaveBeenCalledWith(428, expect.stringContaining('base revision'));

    const stale = writeProfile(0, '2026-07-25T09:05:00.000Z');
    expect(stale.return).toHaveBeenCalledWith(412, expect.stringContaining('"revision":1'));
    expect(JSON.parse(readMockFile(mockFs, PROFILE_PATH)).exportedAt).toBe(
      '2026-07-25T09:00:00.000Z'
    );
  });

  it('never reads njs HTTP validators when the Navet base revision header is present', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    writeProfile(0);

    for (const baseRevision of ['0', 'malformed']) {
      const request = createRequest({
        method: 'PUT',
        headersIn: {
          ...CLIENT_HEADERS,
          'X-Navet-Base-Revision': baseRevision,
        },
      });
      Object.defineProperty(request.headersIn, 'If-Match', {
        enumerable: true,
        get() {
          throw new Error('njs validator getter must not be touched');
        },
      });
      Object.defineProperty(request.headersIn, 'If-Unmodified-Since', {
        enumerable: true,
        get() {
          throw new Error('njs validator getter must not be touched');
        },
      });

      profileStore.handle(request);
      expect(request.return).toHaveBeenCalledWith(412, expect.stringContaining('"revision":1'));
    }
  });

  it.each([
    ['history preparation', PROFILE_HISTORY_PATH],
    ['profile replacement', PROFILE_PATH],
    ['state commit', PROFILE_STATE_PATH],
  ])('keeps the prior revision authoritative after a failed %s', (_stage, failedDestination) => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    expect(writeProfile(0).return.mock.calls.at(-1)?.[0]).toBe(200);

    mockFs.failNextRenameTo(failedDestination);
    const failed = writeProfile(1, '2026-07-25T09:05:00.000Z');
    expect(failed.return).toHaveBeenCalledWith(
      503,
      JSON.stringify({ error: 'Dashboard profile storage is unavailable' })
    );
    expect(failed.headersOut['X-Navet-Profile-Error-Code']).toBe('profile-storage-unavailable');

    const afterFailure = createRequest();
    profileStore.handle(afterFailure);
    expect(afterFailure.return).toHaveBeenCalledWith(
      200,
      expect.stringContaining('"title":"Revision 1"')
    );
    expect(afterFailure.headersOut['X-Navet-Profile-Revision']).toBe('1');
    expect(afterFailure.headersOut.ETag).toContain('-1"');

    const historyAfterFailure = createRequest({
      uri: '/__navet_profile__/default/history',
    });
    profileStore.handle(historyAfterFailure);
    expect(
      parseResponse(historyAfterFailure).entries.map(
        (entry: { revision: number }) => entry.revision
      )
    ).toEqual([1]);

    const retry = writeProfile(1, '2026-07-25T09:10:00.000Z');
    expect(retry.return.mock.calls.at(-1)?.[0]).toBe(200);
    expect(retry.headersOut['X-Navet-Profile-Revision']).toBe('2');
    expect(
      JSON.parse(readMockFile(mockFs, PROFILE_HISTORY_PATH)).map(
        (entry: { metadata: { revision: number } }) => entry.metadata.revision
      )
    ).toEqual([1, 2]);
  });

  it('serves a digest-verified profile without parsing corrupt secondary history', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    writeProfile(0);
    const stateBefore = readMockFile(mockFs, PROFILE_STATE_PATH);
    const profileBefore = readMockFile(mockFs, PROFILE_PATH);
    mockFs.writeFileSync(PROFILE_HISTORY_PATH, '{truncated');

    const healthyRead = createRequest();
    profileStore.handle(healthyRead);
    expect(healthyRead.return).toHaveBeenCalledWith(
      200,
      expect.stringContaining('"title":"Revision 1"')
    );
    expect(healthyRead.headersOut['X-Navet-Profile-Recovery']).toBe('active');

    const failedMutation = writeProfile(1, '2026-07-25T09:05:00.000Z');
    expect(failedMutation.return).toHaveBeenCalledWith(
      503,
      JSON.stringify({ error: 'Dashboard profile storage is unavailable' })
    );
    expect(readMockFile(mockFs, PROFILE_STATE_PATH)).toBe(stateBefore);
    expect(readMockFile(mockFs, PROFILE_PATH)).toBe(profileBefore);
  });

  it('applies conditional JSON Patch updates and records exact changed paths', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    writeProfile(0);

    const patch = createRequest({
      method: 'PATCH',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': '1',
      },
      requestText: JSON.stringify([
        { op: 'replace', path: '/dashboard/title', value: 'From phone' },
      ]),
    });
    profileStore.handle(patch);

    expect(patch.headersOut['X-Navet-Profile-Revision']).toBe('2');
    expect(JSON.parse(readMockFile(mockFs, PROFILE_PATH)).dashboard.title).toBe('From phone');
    const state = JSON.parse(readMockFile(mockFs, PROFILE_STATE_PATH));
    expect(state.metadata).toMatchObject({
      kind: 'patch',
      changedPaths: ['/dashboard/title'],
    });
  });

  it('repairs missing current files from committed history and distinguishes an explicit reset', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    writeProfile(0);

    mockFs.unlinkSync(PROFILE_PATH);
    mockFs.unlinkSync(PROFILE_STATE_PATH);
    const missing = createRequest();
    profileStore.handle(missing);
    expect(missing.return).toHaveBeenCalledWith(
      200,
      expect.stringContaining('"title":"Revision 1"')
    );
    expect(missing.headersOut['X-Navet-Profile-Recovery']).toBe('active');
    expect(missing.headersOut['X-Navet-Profile-Revision']).toBe('1');

    const reset = createRequest({
      method: 'DELETE',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': '1',
      },
    });
    profileStore.handle(reset);
    expect(reset.return).toHaveBeenCalledWith(204);
    expect(reset.headersOut['X-Navet-Profile-Recovery']).toBe('reset');
    expect(reset.headersOut['X-Navet-Profile-Revision']).toBe('2');

    const afterReset = createRequest();
    profileStore.handle(afterReset);
    expect(afterReset.return).toHaveBeenCalledWith(204);
    expect(afterReset.headersOut['X-Navet-Profile-Recovery']).toBe('reset');
  });

  it('recovers the active profile when reset is interrupted before the state commit', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    writeProfile(0);

    mockFs.failNextRenameTo(PROFILE_STATE_PATH);
    const failedReset = createRequest({
      method: 'DELETE',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': '1',
      },
    });
    profileStore.handle(failedReset);
    expect(failedReset.return).toHaveBeenCalledWith(
      503,
      JSON.stringify({ error: 'Dashboard profile storage is unavailable' })
    );

    const recovered = createRequest();
    profileStore.handle(recovered);
    expect(recovered.return).toHaveBeenCalledWith(
      200,
      expect.stringContaining('"title":"Revision 1"')
    );
    expect(recovered.headersOut['X-Navet-Profile-Revision']).toBe('1');
    expect(recovered.headersOut['X-Navet-Profile-Recovery']).toBe('active');

    const retryReset = createRequest({
      method: 'DELETE',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': '1',
      },
    });
    profileStore.handle(retryReset);
    expect(retryReset.return).toHaveBeenCalledWith(204);
    expect(retryReset.headersOut['X-Navet-Profile-Revision']).toBe('2');
    expect(retryReset.headersOut['X-Navet-Profile-Recovery']).toBe('reset');
  });

  it('keeps a 20-entry recovery history and restores a snapshot as a new revision', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();
    for (let revision = 0; revision < 22; revision += 1) {
      const result = writeProfile(
        revision,
        `2026-07-25T09:${String(revision).padStart(2, '0')}:00.000Z`
      );
      expect(result.return.mock.calls.at(-1)?.[0]).toBe(200);
    }

    const history = JSON.parse(readMockFile(mockFs, PROFILE_HISTORY_PATH));
    expect(history).toHaveLength(20);
    expect(history[0].metadata.revision).toBe(3);
    expect(history.at(-1).metadata.revision).toBe(22);

    const restore = createRequest({
      method: 'POST',
      uri: '/__navet_profile__/default/revisions/3/restore',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': '22',
      },
      requestText: '{}',
    });
    profileStore.handle(restore);
    expect(restore.return).toHaveBeenCalledWith(
      200,
      expect.stringContaining('"restoredFromRevision":3')
    );
    expect(restore.headersOut['X-Navet-Profile-Revision']).toBe('23');
    const state = JSON.parse(readMockFile(mockFs, PROFILE_STATE_PATH));
    expect(state.metadata).toMatchObject({ kind: 'restore', restoredFromRevision: 3 });
  });

  it('keeps account and client preference documents in separate principal-scoped stores', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const accountWrite = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/preferences/account',
      requestText: JSON.stringify({
        schemaVersion: 1,
        values: {
          language: 'sv',
          kioskMode: true,
          cameraDirectStreamUrls: {
            'camera.front': 'https://example.com/live?token=private',
          },
          cameraWebRtcStreamSources: {
            'camera.front': 'direct_mse',
          },
        },
      }),
    });
    profileStore.handle(accountWrite);
    expect(parseResponse(accountWrite)).toMatchObject({
      scope: 'account',
      revision: 1,
      values: { language: 'sv' },
      clientId: null,
    });

    const clientWrite = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/preferences/client',
      headersIn: CLIENT_HEADERS,
      requestText: JSON.stringify({
        schemaVersion: 1,
        values: {
          keepDeviceAwake: true,
          language: 'sv',
          cameraDirectStreamUrls: {
            'camera.front': 'https://example.com/live?token=private',
          },
          cameraWebRtcStreamSources: {
            'camera.front': 'direct_mse',
          },
        },
      }),
    });
    profileStore.handle(clientWrite);
    expect(parseResponse(clientWrite)).toMatchObject({
      scope: 'client',
      revision: 1,
      values: { keepDeviceAwake: true },
      clientId: 'client-panel-01',
    });

    expect(mockFs.getFile(ACCOUNT_PREFERENCES_PATH)).not.toContain('keepDeviceAwake');
    expect(mockFs.getFile(CLIENT_PREFERENCES_PATH)).not.toContain('"language"');
    expect(mockFs.getFile(ACCOUNT_PREFERENCES_PATH)).not.toContain('cameraDirectStreamUrls');
    expect(mockFs.getFile(CLIENT_PREFERENCES_PATH)).not.toContain('cameraDirectStreamUrls');
    expect(mockFs.getFile(ACCOUNT_PREFERENCES_PATH)).not.toContain('cameraWebRtcStreamSources');
    expect(mockFs.getFile(CLIENT_PREFERENCES_PATH)).not.toContain('cameraWebRtcStreamSources');
    expect(mockFs.getFile(ACCOUNT_PREFERENCES_PATH)).not.toContain('private');
    expect(mockFs.getFile(CLIENT_PREFERENCES_PATH)).not.toContain('private');

    setPrincipal(() => ({
      ...PRINCIPAL,
      sessionId: 'nas_other_session',
      userId: 'ha-user-2',
      userName: 'Other user',
    }));
    const otherAccount = createRequest({
      uri: '/__navet_profile__/preferences/account',
    });
    profileStore.handle(otherAccount);
    expect(otherAccount.return).toHaveBeenCalledWith(204);

    const sameClientFromOtherSession = createRequest({
      uri: '/__navet_profile__/preferences/client',
      headersIn: CLIENT_HEADERS,
    });
    profileStore.handle(sameClientFromOtherSession);
    expect(parseResponse(sameClientFromOtherSession)).toMatchObject({
      scope: 'client',
      revision: 1,
      values: { keepDeviceAwake: true },
      clientId: 'client-panel-01',
    });
  });

  it('requires a server-verified user identity for account preferences', () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    setPrincipal(() => ({
      ...PRINCIPAL,
      userId: null,
      userName: null,
    }));

    const account = createRequest({
      uri: '/__navet_profile__/preferences/account',
    });
    profileStore.handle(account);

    expect(account.return).toHaveBeenCalledWith(
      403,
      JSON.stringify({ error: 'A verified account identity is required' })
    );
  });

  it('issues an opaque HttpOnly browser binding without exposing it in the client registry', () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    setPrincipal();
    const request = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/clients',
      headersIn: {
        'X-Navet-Client-Id': 'client-panel-01',
        'X-Navet-Client-Name': encodeURIComponent('Kitchen panel'),
        'X-Navet-Client-Kind': 'wall_panel',
        'X-Forwarded-Proto': 'https',
        Origin: 'https://navet.example',
      },
      requestText: '{}',
    });

    profileStore.handle(request);

    expect(request.headersOut['Set-Cookie']).toMatch(
      /^navet_profile_client=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/
    );
    expect(JSON.stringify(parseResponse(request))).not.toContain('bindingId');
  });

  it('persists unchanged client presence at most once every fifteen minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const touch = () => {
      const request = createRequest({
        method: 'PUT',
        uri: '/__navet_profile__/clients',
        headersIn: CLIENT_HEADERS,
        requestText: '{}',
      });
      profileStore.handle(request);
      expect(request.return).toHaveBeenCalledWith(200, expect.any(String));
    };

    touch();
    mockFs.writeFileSync.mockClear();
    mockFs.renameSync.mockClear();

    vi.setSystemTime(new Date('2026-07-25T09:14:59.999Z'));
    touch();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockFs.renameSync).not.toHaveBeenCalled();

    vi.setSystemTime(new Date('2026-07-25T09:15:00.000Z'));
    touch();
    expect(mockFs.renameSync).toHaveBeenCalledWith(expect.any(String), CLIENT_REGISTRY_PATH);
  });

  it('reuses the route-authorized client instead of repeating registry work in downstream handlers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const enrollment = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/clients',
      headersIn: CLIENT_HEADERS,
      requestText: '{}',
    });
    profileStore.handle(enrollment);
    expect(enrollment.return.mock.calls.at(-1)?.[0]).toBe(200);

    const profileWrite = writeProfile(0);
    expect(profileWrite.return.mock.calls.at(-1)?.[0]).toBe(200);
    const registryWithoutSyncedRevision = JSON.parse(readMockFile(mockFs, CLIENT_REGISTRY_PATH));
    registryWithoutSyncedRevision.clients[0].lastRevision = null;
    mockFs.writeFileSync(CLIENT_REGISTRY_PATH, JSON.stringify(registryWithoutSyncedRevision));

    const cases = [
      {
        label: 'profile read',
        request: createRequest({ headersIn: CLIENT_HEADERS }),
        expectedStatus: 200,
        expectedRegistryReads: 2,
      },
      {
        label: 'client preference write',
        request: createRequest({
          method: 'PUT',
          uri: '/__navet_profile__/preferences/client',
          headersIn: CLIENT_HEADERS,
          requestText: JSON.stringify({
            schemaVersion: 1,
            values: { effectsQuality: 'low' },
          }),
        }),
        expectedStatus: 200,
        expectedRegistryReads: 2,
      },
      {
        label: 'client preference read',
        request: createRequest({
          uri: '/__navet_profile__/preferences/client',
          headersIn: CLIENT_HEADERS,
        }),
        expectedStatus: 200,
        expectedRegistryReads: 2,
      },
      {
        label: 'client list refresh',
        request: createRequest({
          method: 'PUT',
          uri: '/__navet_profile__/clients',
          headersIn: CLIENT_HEADERS,
          requestText: '{}',
        }),
        expectedStatus: 200,
        expectedRegistryReads: 3,
      },
      {
        label: 'client forget',
        request: createRequest({
          method: 'DELETE',
          uri: '/__navet_profile__/clients/client-panel-01',
          headersIn: CLIENT_HEADERS,
        }),
        expectedStatus: 200,
        expectedRegistryReads: 3,
      },
    ];

    for (const testCase of cases) {
      mockFs.readFileSync.mockClear();
      profileStore.handle(testCase.request);

      expect(testCase.request.return.mock.calls.at(-1)?.[0], testCase.label).toBe(
        testCase.expectedStatus
      );
      expect(
        mockFs.readFileSync.mock.calls.filter(([path]) => path === CLIENT_REGISTRY_PATH),
        testCase.label
      ).toHaveLength(testCase.expectedRegistryReads);
      if (testCase.label === 'profile read') {
        expect(JSON.parse(readMockFile(mockFs, CLIENT_REGISTRY_PATH)).clients[0].lastRevision).toBe(
          1
        );
      }
    }
  });

  it('binds client preferences and deletion to the server-issued browser cookie', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const ownerWrite = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/preferences/client',
      headersIn: CLIENT_HEADERS,
      requestText: JSON.stringify({
        schemaVersion: 1,
        values: { effectsQuality: 'low' },
      }),
    });
    profileStore.handle(ownerWrite);
    expect(ownerWrite.return.mock.calls.at(-1)?.[0]).toBe(200);

    const impersonatedRead = createRequest({
      uri: '/__navet_profile__/preferences/client',
      headersIn: {
        ...CLIENT_HEADERS,
        Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
      },
    });
    profileStore.handle(impersonatedRead);
    expect(impersonatedRead.return).toHaveBeenCalledWith(
      403,
      JSON.stringify({
        error: 'This dashboard client identity belongs to another browser',
      })
    );

    const attackerForget = createRequest({
      method: 'DELETE',
      uri: '/__navet_profile__/clients/client-panel-01',
      headersIn: {
        'X-Navet-Client-Id': 'attacker-panel-01',
        'X-Navet-Client-Name': 'Attacker',
        'X-Navet-Client-Kind': 'desktop',
        Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
      },
    });
    profileStore.handle(attackerForget);
    expect(attackerForget.return).toHaveBeenCalledWith(
      403,
      JSON.stringify({
        error: 'This dashboard client identity belongs to another browser',
      })
    );
    expect(JSON.parse(readMockFile(mockFs, CLIENT_PREFERENCES_PATH)).records).toEqual({
      [`client-binding:${CLIENT_BINDING_A}`]: expect.objectContaining({
        values: { effectsQuality: 'low' },
      }),
    });
  });

  it('forgets client registry metadata and device preferences without touching credentials', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const touch = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/clients',
      headersIn: CLIENT_HEADERS,
      requestText: '{}',
    });
    profileStore.handle(touch);
    expect(parseResponse(touch).clients).toEqual([
      expect.objectContaining({
        id: 'client-panel-01',
        name: 'Kitchen panel',
        principal: expect.objectContaining({ userId: 'ha-user-1' }),
      }),
    ]);

    const preference = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/preferences/client',
      headersIn: CLIENT_HEADERS,
      requestText: JSON.stringify({
        schemaVersion: 1,
        values: { effectsQuality: 'low' },
      }),
    });
    profileStore.handle(preference);
    const forget = createRequest({
      method: 'DELETE',
      uri: '/__navet_profile__/clients/client-panel-01',
      headersIn: CLIENT_HEADERS,
    });
    profileStore.handle(forget);
    expect(parseResponse(forget)).toEqual({
      ok: true,
      forgotten: true,
      credentialsRevoked: false,
    });
    expect(JSON.parse(readMockFile(mockFs, CLIENT_REGISTRY_PATH)).clients).toEqual([]);
    expect(JSON.parse(readMockFile(mockFs, CLIENT_PREFERENCES_PATH)).records).toEqual({});
  });

  it('rekeys one durable browser binding instead of leaving a ghost client', () => {
    const mockFs = createMockFs();
    profileStore.setProfileStoreFsForTests(mockFs);
    setPrincipal();

    const first = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/clients',
      headersIn: CLIENT_HEADERS,
    });
    profileStore.handle(first);
    const originalRegistry = JSON.parse(readMockFile(mockFs, CLIENT_REGISTRY_PATH)).clients;

    const rotated = createRequest({
      method: 'PUT',
      uri: '/__navet_profile__/clients',
      headersIn: {
        ...CLIENT_HEADERS,
        'X-Navet-Client-Id': 'client-panel-rotated',
        'X-Navet-Client-Name': encodeURIComponent('Kitchen panel restored'),
      },
    });
    profileStore.handle(rotated);

    const registry = JSON.parse(readMockFile(mockFs, CLIENT_REGISTRY_PATH)).clients;
    expect(registry).toHaveLength(1);
    expect(registry[0]).toMatchObject({
      id: 'client-panel-rotated',
      bindingId: CLIENT_BINDING_A,
      firstSeenAt: originalRegistry[0].firstSeenAt,
    });
    expect(parseResponse(rotated).clients).toEqual([
      expect.objectContaining({ id: 'client-panel-rotated' }),
    ]);
  });
});
