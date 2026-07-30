import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import profileStore from '@docker/njs/profile-store.js';
import {
  createViteDashboardProfileRequestHandler,
  createViteDashboardProfileStore,
  type ViteDashboardProfilePrincipal,
} from '@scripts/vite-dashboard-profile-store';
import { afterEach, describe, expect, it, vi } from 'vitest';

const HA_TENANT_ID = `hat_${'a'.repeat(64)}`;
const CLIENT_BINDING_A = 'a'.repeat(64);
const CLIENT_BINDING_B = 'b'.repeat(64);
const PROFILE_HISTORY_PATH = '/data/navet-dashboard-profile-history.json';
const PROFILE_PATH = '/data/navet-dashboard-profile.json';
const PROFILE_STATE_PATH = '/data/navet-dashboard-profile-state.json';
const WORKSPACE_PATH = '/data/navet-dashboard-workspace.json';
const ACCOUNT_PREFERENCES_PATH = '/data/navet-dashboard-account-preferences.json';
const CLIENT_PREFERENCES_PATH = '/data/navet-dashboard-client-preferences.json';
const CLIENT_REGISTRY_PATH = '/data/navet-dashboard-clients.json';

const PRINCIPAL: ViteDashboardProfilePrincipal = {
  providerId: 'home_assistant',
  tenantId: HA_TENANT_ID,
  sessionId: 'nas_session_one',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

const CLIENT_HEADERS = {
  'X-Navet-Client-Id': 'client-panel-01',
  'X-Navet-Client-Name': encodeURIComponent('Kitchen panel'),
  'X-Navet-Client-Kind': 'wall_panel',
  Cookie: `navet_profile_client=${CLIENT_BINDING_A}`,
};

const PROFILE = JSON.stringify({
  app: 'navet',
  version: 3,
  exportedAt: '2026-07-25T09:00:00.000Z',
  navigation: { currentRoom: 'all', activeSection: 'home' },
  dashboard: { title: 'Kitchen' },
  cardOrders: {
    Kitchen: ['home_assistant:light.kitchen'],
    'Living Room': ['custom-media-stack'],
  },
  cardZones: {
    state: {
      cardZones: {
        'home_assistant:light.kitchen': 'actions',
      },
    },
    version: 0,
  },
});

const tempDirectories: string[] = [];

function createMockFs() {
  const files = new Map<string, string>();
  const missing = (filePath: string) => {
    const error = new Error(`ENOENT: ${filePath}`);
    // @ts-expect-error test-only error shape
    error.code = 'ENOENT';
    return error;
  };
  return {
    files,
    statSync: (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) {
        throw missing(filePath);
      }
      const mtime = new Date('2026-07-25T09:00:00.000Z');
      return { size: content.length, mtimeMs: mtime.getTime(), mtime };
    },
    readFileSync: (filePath: string) => {
      const content = files.get(filePath);
      if (content === undefined) {
        throw missing(filePath);
      }
      return content;
    },
    writeFileSync: (filePath: string, content: string) => {
      files.set(filePath, content);
    },
    renameSync: (sourcePath: string, destinationPath: string) => {
      const content = files.get(sourcePath);
      if (content === undefined) {
        throw missing(sourcePath);
      }
      files.set(destinationPath, content);
      files.delete(sourcePath);
    },
    unlinkSync: (filePath: string) => {
      if (!files.delete(filePath)) {
        throw missing(filePath);
      }
    },
  };
}

function runNjs(
  method: string,
  headersIn: Record<string, string> = {},
  body = '',
  authenticated = true,
  principal: ViteDashboardProfilePrincipal = PRINCIPAL,
  path = '/default',
  njsStore: typeof profileStore = profileStore
) {
  njsStore.setProfileStorePrincipalResolverForTests(() => (authenticated ? principal : null));
  const request = {
    method,
    uri: `/__navet_profile__${path}`,
    headersIn: {
      Host: 'navet.example',
      Origin: 'http://navet.example',
      ...headersIn,
    },
    headersOut: {} as Record<string, string>,
    requestText: body,
    return: vi.fn(),
  };
  njsStore.handle(request);
  return {
    status: request.return.mock.calls.at(-1)?.[0] as number,
    body: request.return.mock.calls.at(-1)?.[1] as string | undefined,
    headers: request.headersOut,
  };
}

function clientBindingFromSetCookie(value: string | undefined): string | undefined {
  return value?.match(/(?:^|;\s*)navet_profile_client=([a-f0-9]{64})(?:;|$)/)?.[1];
}

function createViteRequest(
  method: string,
  headers: Record<string, string> = {},
  body = '',
  path = '/default'
) {
  return {
    method,
    url: path,
    headers: Object.fromEntries(
      Object.entries({
        Host: 'navet.example',
        Origin: 'http://navet.example',
        ...headers,
      }).map(([name, value]) => [name.toLowerCase(), value])
    ),
    async *[Symbol.asyncIterator]() {
      if (body) {
        yield Buffer.from(body);
      }
    },
  } as unknown as IncomingMessage;
}

function createViteResponse() {
  const headers = new Map<string, string>();
  let body = '';
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | number) {
      headers.set(name.toLowerCase(), String(value));
      return response;
    },
    end(value?: string) {
      body = value ?? '';
      return response;
    },
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
  profileStore.resetProfileStoreFsForTests();
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('dashboard profile backend conformance', () => {
  it('keeps trusted Ingress profile routing off every directly exposed add-on port', () => {
    const stableConfig = readFileSync('platform/home-assistant/addons/navet/config.yaml', 'utf8');
    const developmentConfig = readFileSync(
      'platform/home-assistant/addons/navet-dev/config.yaml',
      'utf8'
    );
    const addOnRuntime = readFileSync('platform/home-assistant/addons/navet/run.sh', 'utf8');
    const standaloneSnippet = readFileSync('docker/snippets/navet-profile-store.conf', 'utf8');
    const ingressSnippet = readFileSync('docker/snippets/navet-profile-store-ingress.conf', 'utf8');

    expect(stableConfig).not.toMatch(/^ports:/m);
    expect(developmentConfig).not.toMatch(/^ports:/m);
    expect(addOnRuntime).toContain('navet-profile-store-ingress.conf');
    expect(addOnRuntime).toContain('allow 172.30.32.2;');
    expect(addOnRuntime).toContain('deny all;');
    expect(
      readFileSync(
        'platform/home-assistant/addons/navet/rootfs/etc/nginx/http.d/default.conf',
        'utf8'
      )
    ).toMatch(/allow 172\.30\.32\.2;\s+deny all;/);
    expect(standaloneSnippet).toContain('navet_profile_store.handle;');
    expect(standaloneSnippet).not.toContain('handleIngress');
    expect(ingressSnippet).toContain('navet_profile_store.handleIngress;');
    for (const snippet of [standaloneSnippet, ingressSnippet]) {
      expect(snippet).toContain('$http_if_match');
      expect(snippet).toContain('$http_if_unmodified_since');
      expect(snippet).toContain('return 428;');
    }
  });

  it('keeps NJS and Vite security, revision, attribution, stale-write, and reset semantics aligned', async () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-conformance-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    let viteAuthenticated = false;
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => (viteAuthenticated ? PRINCIPAL : null),
    });

    const njsAnonymous = runNjs('GET', {}, '', false);
    const viteAnonymous = createViteResponse();
    await viteHandler(createViteRequest('GET'), viteAnonymous.response);
    expect([njsAnonymous.status, viteAnonymous.status]).toEqual([401, 401]);

    viteAuthenticated = true;
    const initialHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '0',
      'X-Navet-Changed-Paths': encodeURIComponent(JSON.stringify(['/dashboard/title'])),
    };
    const njsWrite = runNjs('PUT', initialHeaders, PROFILE);
    const viteWrite = createViteResponse();
    await viteHandler(createViteRequest('PUT', initialHeaders, PROFILE), viteWrite.response);
    expect([njsWrite.status, viteWrite.status]).toEqual([200, 200]);
    expect([
      njsWrite.headers['X-Navet-Profile-Revision'],
      viteWrite.header('X-Navet-Profile-Revision'),
    ]).toEqual(['1', '1']);
    expect(
      JSON.parse(decodeURIComponent(njsWrite.headers['X-Navet-Profile-Author']))
    ).toMatchObject({ id: 'client-panel-01', userId: 'ha-user-1' });
    expect(
      JSON.parse(decodeURIComponent(viteWrite.header('X-Navet-Profile-Author') ?? '{}'))
    ).toMatchObject({ id: 'client-panel-01', userId: 'ha-user-1' });

    const canonicalProfile = JSON.parse(PROFILE) as Record<string, unknown>;
    delete canonicalProfile.cardOrders;
    const equivalentProfile = JSON.stringify({
      ...canonicalProfile,
      exportedAt: '2026-07-25T09:05:00.000Z',
      navigation: { currentRoom: 'kitchen', activeSection: 'lights' },
      cardZones: {
        'home_assistant:light.kitchen': 'actions',
      },
    });
    const equivalentHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '1',
      'X-Navet-Changed-Paths': encodeURIComponent(
        JSON.stringify(['/exportedAt', '/navigation', '/cardOrders'])
      ),
    };
    const njsEquivalent = runNjs('PUT', equivalentHeaders, equivalentProfile);
    const viteEquivalent = createViteResponse();
    await viteHandler(
      createViteRequest('PUT', equivalentHeaders, equivalentProfile),
      viteEquivalent.response
    );
    expect([njsEquivalent.status, viteEquivalent.status]).toEqual([200, 200]);
    expect([
      njsEquivalent.headers['X-Navet-Profile-Revision'],
      viteEquivalent.header('X-Navet-Profile-Revision'),
    ]).toEqual(['1', '1']);
    expect(viteStore.getState().revision).toBe(1);

    const noOpPatch = JSON.stringify([
      { op: 'replace', path: '/dashboard/title', value: 'Kitchen' },
    ]);
    const patchHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '1',
    };
    const njsPatch = runNjs('PATCH', patchHeaders, noOpPatch);
    const vitePatch = createViteResponse();
    await viteHandler(createViteRequest('PATCH', patchHeaders, noOpPatch), vitePatch.response);
    expect([njsPatch.status, vitePatch.status]).toEqual([200, 200]);
    expect([
      njsPatch.headers['X-Navet-Profile-Revision'],
      vitePatch.header('X-Navet-Profile-Revision'),
    ]).toEqual(['1', '1']);

    const njsStale = runNjs('PUT', initialHeaders, PROFILE);
    const viteStale = createViteResponse();
    await viteHandler(createViteRequest('PUT', initialHeaders, PROFILE), viteStale.response);
    expect([njsStale.status, viteStale.status]).toEqual([412, 412]);

    const resetHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '1',
    };
    const njsReset = runNjs('DELETE', resetHeaders);
    const viteReset = createViteResponse();
    await viteHandler(createViteRequest('DELETE', resetHeaders), viteReset.response);
    expect([njsReset.status, viteReset.status]).toEqual([204, 204]);
    expect([
      njsReset.headers['X-Navet-Profile-Recovery'],
      viteReset.header('X-Navet-Profile-Recovery'),
    ]).toEqual(['reset', 'reset']);
  });

  it('prevents one browser from selecting or deleting another browser client', async () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-client-binding-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });
    const preferenceBody = JSON.stringify({
      schemaVersion: 1,
      values: { effectsQuality: 'low' },
    });
    const writeHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '0',
    };

    const njsOwnerWrite = runNjs(
      'PUT',
      writeHeaders,
      preferenceBody,
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    const viteOwnerWrite = createViteResponse();
    await viteHandler(
      createViteRequest('PUT', writeHeaders, preferenceBody, '/preferences/client'),
      viteOwnerWrite.response
    );
    expect([njsOwnerWrite.status, viteOwnerWrite.status]).toEqual([200, 200]);

    const impersonatedHeaders = {
      ...CLIENT_HEADERS,
      Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
    };
    const njsImpersonatedRead = runNjs(
      'GET',
      impersonatedHeaders,
      '',
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    const viteImpersonatedRead = createViteResponse();
    await viteHandler(
      createViteRequest('GET', impersonatedHeaders, '', '/preferences/client'),
      viteImpersonatedRead.response
    );
    expect([njsImpersonatedRead.status, viteImpersonatedRead.status]).toEqual([403, 403]);
    expect([
      njsImpersonatedRead.headers['X-Navet-Profile-Error-Code'],
      viteImpersonatedRead.header('X-Navet-Profile-Error-Code'),
    ]).toEqual(['client-binding-mismatch', 'client-binding-mismatch']);

    const attackerHeaders = {
      'X-Navet-Client-Id': 'attacker-panel-01',
      'X-Navet-Client-Name': 'Attacker',
      'X-Navet-Client-Kind': 'desktop',
      Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
    };
    const njsAttackerForget = runNjs(
      'DELETE',
      attackerHeaders,
      '',
      true,
      PRINCIPAL,
      '/clients/client-panel-01'
    );
    const viteAttackerForget = createViteResponse();
    await viteHandler(
      createViteRequest('DELETE', attackerHeaders, '', '/clients/client-panel-01'),
      viteAttackerForget.response
    );
    expect([njsAttackerForget.status, viteAttackerForget.status]).toEqual([403, 403]);

    const njsOwnerRead = runNjs('GET', CLIENT_HEADERS, '', true, PRINCIPAL, '/preferences/client');
    const viteOwnerRead = createViteResponse();
    await viteHandler(
      createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/client'),
      viteOwnerRead.response
    );
    expect([njsOwnerRead.status, viteOwnerRead.status]).toEqual([200, 200]);
  });

  // This deliberately exercises both backends at the full supported
  // 200-client boundary and can overlap with other Vitest workers in CI.
  it('bounds active clients and preferences without rotating or evicting a live binding', async () => {
    const njsFs = createMockFs();
    profileStore.setProfileStoreFsForTests(njsFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-client-capacity-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });
    const preferenceBody = JSON.stringify({
      schemaVersion: 1,
      values: { lowPowerMode: true },
    });

    for (let index = 0; index < 200; index += 1) {
      const headers = {
        'X-Navet-Client-Id': `client-panel-${String(index).padStart(3, '0')}`,
        'X-Navet-Client-Name': `Panel ${index}`,
        'X-Navet-Client-Kind': 'wall_panel',
        'X-Navet-Base-Revision': '0',
        Cookie: `navet_profile_client=${index.toString(16).padStart(64, '0')}`,
      };
      const njsWrite = runNjs(
        'PUT',
        headers,
        preferenceBody,
        true,
        PRINCIPAL,
        '/preferences/client'
      );
      const viteWrite = createViteResponse();
      await viteHandler(
        createViteRequest('PUT', headers, preferenceBody, '/preferences/client'),
        viteWrite.response
      );
      expect([njsWrite.status, viteWrite.status]).toEqual([200, 200]);
    }

    const njsLegacyRegistry = JSON.parse(njsFs.files.get(CLIENT_REGISTRY_PATH) ?? '{}') as {
      preferenceCollectionVersion?: number;
    };
    const njsLegacyPreferences = JSON.parse(njsFs.files.get(CLIENT_PREFERENCES_PATH) ?? '{}') as {
      records: Record<string, Record<string, unknown>>;
    };
    const viteLegacyRegistry = JSON.parse(readFileSync(viteStore.getPaths().clients, 'utf8')) as {
      preferenceCollectionVersion?: number;
    };
    const viteLegacyPreferences = JSON.parse(
      readFileSync(viteStore.getPaths().clientPreferences, 'utf8')
    ) as {
      records: Record<string, Record<string, unknown>>;
    };
    delete njsLegacyRegistry.preferenceCollectionVersion;
    delete viteLegacyRegistry.preferenceCollectionVersion;
    const preferenceTemplate = Object.values(njsLegacyPreferences.records)[0];
    for (let index = 0; index < 25; index += 1) {
      const key = `client-binding:${(1_000 + index).toString(16).padStart(64, '0')}`;
      const orphan = {
        ...preferenceTemplate,
        clientId: `orphan-panel-${String(index).padStart(3, '0')}`,
      };
      njsLegacyPreferences.records[key] = orphan;
      viteLegacyPreferences.records[key] = orphan;
    }
    njsFs.files.set(CLIENT_REGISTRY_PATH, JSON.stringify(njsLegacyRegistry));
    njsFs.files.set(CLIENT_PREFERENCES_PATH, JSON.stringify(njsLegacyPreferences));
    writeFileSync(viteStore.getPaths().clients, JSON.stringify(viteLegacyRegistry), 'utf8');
    writeFileSync(
      viteStore.getPaths().clientPreferences,
      JSON.stringify(viteLegacyPreferences),
      'utf8'
    );

    const overflowHeaders = {
      'X-Navet-Client-Id': 'client-panel-overflow',
      'X-Navet-Client-Name': 'Overflow panel',
      'X-Navet-Client-Kind': 'wall_panel',
      Cookie: `navet_profile_client=${'f'.repeat(64)}`,
    };
    const njsOverflow = runNjs('GET', overflowHeaders, '', true, PRINCIPAL, '/preferences/client');
    const viteOverflow = createViteResponse();
    await viteHandler(
      createViteRequest('GET', overflowHeaders, '', '/preferences/client'),
      viteOverflow.response
    );
    expect([njsOverflow.status, viteOverflow.status]).toEqual([503, 503]);
    expect([
      njsOverflow.headers['X-Navet-Profile-Error-Code'],
      viteOverflow.header('X-Navet-Profile-Error-Code'),
    ]).toEqual(['client-capacity-reached', 'client-capacity-reached']);
    expect([njsOverflow.headers['Retry-After'], viteOverflow.header('Retry-After')]).toEqual([
      '60',
      '60',
    ]);

    const firstHeaders = {
      'X-Navet-Client-Id': 'client-panel-000',
      'X-Navet-Client-Name': 'Panel 0',
      'X-Navet-Client-Kind': 'wall_panel',
      Cookie: `navet_profile_client=${'0'.repeat(64)}`,
    };
    const njsFirst = runNjs('GET', firstHeaders, '', true, PRINCIPAL, '/preferences/client');
    const viteFirst = createViteResponse();
    await viteHandler(
      createViteRequest('GET', firstHeaders, '', '/preferences/client'),
      viteFirst.response
    );
    expect([njsFirst.status, viteFirst.status]).toEqual([200, 200]);

    const njsRegistry = JSON.parse(njsFs.files.get(CLIENT_REGISTRY_PATH) ?? '{}') as {
      clients?: unknown[];
    };
    const njsPreferences = JSON.parse(njsFs.files.get(CLIENT_PREFERENCES_PATH) ?? '{}') as {
      records?: Record<string, unknown>;
    };
    const viteRegistry = JSON.parse(readFileSync(viteStore.getPaths().clients, 'utf8')) as {
      clients?: unknown[];
    };
    const vitePreferences = JSON.parse(
      readFileSync(viteStore.getPaths().clientPreferences, 'utf8')
    ) as { records?: Record<string, unknown> };
    expect([
      njsRegistry.clients?.length,
      viteRegistry.clients?.length,
      Object.keys(njsPreferences.records ?? {}).length,
      Object.keys(vitePreferences.records ?? {}).length,
    ]).toEqual([200, 200, 200, 200]);
  }, 15_000);

  it('refuses oversized workspace, registry, and preference files without rewriting them', async () => {
    for (const scenario of [
      {
        name: 'workspace',
        njsPath: WORKSPACE_PATH,
        vitePath: 'workspace' as const,
        oversized: 'w'.repeat(128 * 1024 + 1),
        headers: {},
        route: '/default',
      },
      {
        name: 'registry',
        njsPath: CLIENT_REGISTRY_PATH,
        vitePath: 'clients' as const,
        oversized: 'r'.repeat(512 * 1024 + 1),
        headers: CLIENT_HEADERS,
        route: '/default',
      },
      {
        name: 'preferences',
        njsPath: CLIENT_PREFERENCES_PATH,
        vitePath: 'clientPreferences' as const,
        oversized: 'p'.repeat(4 * 1024 * 1024 + 1),
        headers: CLIENT_HEADERS,
        route: '/preferences/client',
      },
    ]) {
      const njsFs = createMockFs();
      profileStore.setProfileStoreFsForTests(njsFs);
      const directory = mkdtempSync(join(tmpdir(), `navet-profile-oversized-${scenario.name}-`));
      tempDirectories.push(directory);
      const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
      const viteHandler = createViteDashboardProfileRequestHandler({
        store: viteStore,
        resolvePrincipal: () => PRINCIPAL,
      });

      const njsBaseline = runNjs('GET', scenario.headers, '', true, PRINCIPAL, scenario.route);
      const viteBaseline = createViteResponse();
      await viteHandler(
        createViteRequest('GET', scenario.headers, '', scenario.route),
        viteBaseline.response
      );
      expect([njsBaseline.status, viteBaseline.status], `${scenario.name} baseline`).toEqual([
        204, 204,
      ]);

      njsFs.files.set(scenario.njsPath, scenario.oversized);
      const viteOversizedPath = viteStore.getPaths()[scenario.vitePath];
      writeFileSync(viteOversizedPath, scenario.oversized, 'utf8');

      const njsResult = runNjs('GET', scenario.headers, '', true, PRINCIPAL, scenario.route);
      const viteResult = createViteResponse();
      await viteHandler(
        createViteRequest('GET', scenario.headers, '', scenario.route),
        viteResult.response
      );
      expect([njsResult.status, viteResult.status], `${scenario.name} status`).toEqual([503, 503]);
      expect([
        njsResult.headers['X-Navet-Profile-Error-Code'],
        viteResult.header('X-Navet-Profile-Error-Code'),
      ]).toEqual(['profile-storage-unavailable', 'profile-storage-unavailable']);
      expect(njsFs.files.get(scenario.njsPath)).toBe(scenario.oversized);
      expect(readFileSync(viteOversizedPath, 'utf8')).toBe(scenario.oversized);
    }
  });

  it('fails closed on malformed workspace and preference storage without rewriting it', async () => {
    const njsFs = createMockFs();
    profileStore.setProfileStoreFsForTests(njsFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-malformed-storage-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });

    const njsWorkspaceBaseline = runNjs('GET');
    const viteWorkspaceBaseline = createViteResponse();
    await viteHandler(createViteRequest('GET'), viteWorkspaceBaseline.response);
    expect([njsWorkspaceBaseline.status, viteWorkspaceBaseline.status]).toEqual([204, 204]);

    const njsWorkspaceBefore = njsFs.files.get(WORKSPACE_PATH);
    const viteWorkspaceBefore = readFileSync(viteStore.getPaths().workspace, 'utf8');
    if (!njsWorkspaceBefore) {
      throw new Error('Expected the NJS workspace to be initialized');
    }
    const workspaceCorruptions: Array<{
      label: string;
      corrupt: (workspace: Record<string, unknown>) => unknown;
    }> = [
      {
        label: 'literal null',
        corrupt: () => null,
      },
      {
        label: 'missing workspace identity',
        corrupt: (workspace) => ({ ...workspace, workspaceId: null }),
      },
      {
        label: 'malformed tenant binding',
        corrupt: (workspace) => ({
          ...workspace,
          tenantBinding: {
            providerId: 'home_assistant',
            tenantId: HA_TENANT_ID,
            enrolledAt: 'not-a-timestamp',
          },
        }),
      },
    ];

    for (const { label, corrupt } of workspaceCorruptions) {
      const malformedNjsWorkspace = JSON.stringify(
        corrupt(JSON.parse(njsWorkspaceBefore) as Record<string, unknown>)
      );
      const malformedViteWorkspace = JSON.stringify(
        corrupt(JSON.parse(viteWorkspaceBefore) as Record<string, unknown>)
      );
      njsFs.files.set(WORKSPACE_PATH, malformedNjsWorkspace);
      writeFileSync(viteStore.getPaths().workspace, malformedViteWorkspace, 'utf8');

      const njsResult = runNjs('GET');
      const viteResult = createViteResponse();
      await viteHandler(createViteRequest('GET'), viteResult.response);

      expect([njsResult.status, viteResult.status], `${label} status`).toEqual([503, 503]);
      expect([
        njsResult.headers['X-Navet-Profile-Error-Code'],
        viteResult.header('X-Navet-Profile-Error-Code'),
      ]).toEqual(['profile-storage-unavailable', 'profile-storage-unavailable']);
      expect(njsFs.files.get(WORKSPACE_PATH), `${label} NJS bytes`).toBe(malformedNjsWorkspace);
      expect(readFileSync(viteStore.getPaths().workspace, 'utf8'), `${label} Vite bytes`).toBe(
        malformedViteWorkspace
      );
    }

    njsFs.files.set(WORKSPACE_PATH, njsWorkspaceBefore);
    writeFileSync(viteStore.getPaths().workspace, viteWorkspaceBefore, 'utf8');
    const njsClientBaseline = runNjs(
      'GET',
      CLIENT_HEADERS,
      '',
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    const viteClientBaseline = createViteResponse();
    await viteHandler(
      createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/client'),
      viteClientBaseline.response
    );
    expect([njsClientBaseline.status, viteClientBaseline.status]).toEqual([204, 204]);

    const njsRegistryBefore = njsFs.files.get(CLIENT_REGISTRY_PATH);
    const viteRegistryBefore = readFileSync(viteStore.getPaths().clients, 'utf8');
    if (!njsRegistryBefore) {
      throw new Error('Expected the NJS client registry to be initialized');
    }
    const makeRegistryStale = (serialized: string): string => {
      const registry = JSON.parse(serialized) as {
        clients: Array<{
          firstSeenAt: string;
          lastSeenAt: string;
        }>;
      };
      const staleTimestamp = new Date(Date.now() - 16 * 60 * 1_000).toISOString();
      registry.clients[0].firstSeenAt = staleTimestamp;
      registry.clients[0].lastSeenAt = staleTimestamp;
      return JSON.stringify(registry);
    };
    const staleNjsRegistry = makeRegistryStale(njsRegistryBefore);
    const staleViteRegistry = makeRegistryStale(viteRegistryBefore);
    const legacyDocument = {
      contractVersion: 1,
      schemaVersion: 1,
      scope: 'client',
      revision: 1,
      updatedAt: '2026-07-25T09:00:00.000Z',
      values: { lowPowerMode: true },
      principal: {
        providerId: PRINCIPAL.providerId,
        userId: PRINCIPAL.userId,
        userName: PRINCIPAL.userName,
      },
      clientId: 'client-panel-01',
    };
    const malformedCollections = [
      {
        label: 'literal null collection',
        serialized: 'null',
      },
      {
        label: 'non-object records',
        serialized: JSON.stringify({
          contractVersion: 1,
          records: [],
        }),
      },
      {
        label: 'malformed document beside a migratable legacy document',
        serialized: JSON.stringify({
          contractVersion: 1,
          records: {
            'legacy|client:client-panel-01': legacyDocument,
            'malformed-record': {
              ...legacyDocument,
              values: [],
            },
          },
        }),
      },
    ];
    const mutations = [
      {
        label: 'read migration from a stale client',
        method: 'GET',
        path: '/preferences/client',
        body: '',
        headers: CLIENT_HEADERS,
        registryState: 'stale' as const,
      },
      {
        label: 'preference overwrite from a renamed client',
        method: 'PUT',
        path: '/preferences/client',
        body: JSON.stringify({
          schemaVersion: 1,
          values: { effectsQuality: 'low' },
        }),
        headers: {
          ...CLIENT_HEADERS,
          'X-Navet-Client-Name': encodeURIComponent('Renamed kitchen panel'),
          'X-Navet-Base-Revision': '0',
        },
        registryState: 'current' as const,
      },
      {
        label: 'preference read from a new client',
        method: 'GET',
        path: '/preferences/client',
        body: '',
        headers: {
          ...CLIENT_HEADERS,
          'X-Navet-Client-Id': 'client-panel-new',
          'X-Navet-Client-Name': encodeURIComponent('New panel'),
          Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
        },
        registryState: 'current' as const,
      },
      {
        label: 'client preference deletion by its owning client',
        method: 'DELETE',
        path: '/clients/client-panel-01',
        body: '',
        headers: CLIENT_HEADERS,
        registryState: 'current' as const,
      },
      {
        label: 'client identity rekey on a profile route',
        method: 'GET',
        path: '/default',
        body: '',
        headers: {
          ...CLIENT_HEADERS,
          'X-Navet-Client-Id': 'client-panel-rekeyed',
          'X-Navet-Client-Name': encodeURIComponent('Rekeyed kitchen panel'),
        },
        registryState: 'current' as const,
      },
    ];

    for (const collection of malformedCollections) {
      for (const mutation of mutations) {
        const expectedNjsRegistry =
          mutation.registryState === 'stale' ? staleNjsRegistry : njsRegistryBefore;
        const expectedViteRegistry =
          mutation.registryState === 'stale' ? staleViteRegistry : viteRegistryBefore;
        njsFs.files.set(CLIENT_REGISTRY_PATH, expectedNjsRegistry);
        njsFs.files.set(CLIENT_PREFERENCES_PATH, collection.serialized);
        writeFileSync(viteStore.getPaths().clients, expectedViteRegistry, 'utf8');
        writeFileSync(viteStore.getPaths().clientPreferences, collection.serialized, 'utf8');

        const njsResult = runNjs(
          mutation.method,
          mutation.headers,
          mutation.body,
          true,
          PRINCIPAL,
          mutation.path
        );
        const viteResult = createViteResponse();
        await viteHandler(
          createViteRequest(mutation.method, mutation.headers, mutation.body, mutation.path),
          viteResult.response
        );

        const caseLabel = `${collection.label}: ${mutation.label}`;
        expect([njsResult.status, viteResult.status], caseLabel).toEqual([503, 503]);
        expect([
          njsResult.headers['X-Navet-Profile-Error-Code'],
          viteResult.header('X-Navet-Profile-Error-Code'),
        ]).toEqual(['profile-storage-unavailable', 'profile-storage-unavailable']);
        expect(njsFs.files.get(CLIENT_PREFERENCES_PATH), `${caseLabel} NJS bytes`).toBe(
          collection.serialized
        );
        expect(
          readFileSync(viteStore.getPaths().clientPreferences, 'utf8'),
          `${caseLabel} Vite bytes`
        ).toBe(collection.serialized);
        expect(njsFs.files.get(CLIENT_REGISTRY_PATH), `${caseLabel} NJS registry`).toBe(
          expectedNjsRegistry
        );
        expect(
          readFileSync(viteStore.getPaths().clients, 'utf8'),
          `${caseLabel} Vite registry`
        ).toBe(expectedViteRegistry);
      }
    }

    const migratableClientCollection = JSON.stringify({
      contractVersion: 1,
      records: {
        'legacy|client:client-panel-01': legacyDocument,
      },
    });
    const withoutPreferenceCollectionVersion = (serialized: string): string => {
      const registry = JSON.parse(serialized) as {
        preferenceCollectionVersion?: number;
      };
      delete registry.preferenceCollectionVersion;
      return JSON.stringify(registry);
    };
    const legacyNjsRegistry = withoutPreferenceCollectionVersion(njsRegistryBefore);
    const legacyViteRegistry = withoutPreferenceCollectionVersion(viteRegistryBefore);
    njsFs.files.set(CLIENT_REGISTRY_PATH, legacyNjsRegistry);
    njsFs.files.set(CLIENT_PREFERENCES_PATH, migratableClientCollection);
    writeFileSync(viteStore.getPaths().clients, legacyViteRegistry, 'utf8');
    writeFileSync(viteStore.getPaths().clientPreferences, migratableClientCollection, 'utf8');

    const njsAuthorizedMigration = runNjs(
      'GET',
      CLIENT_HEADERS,
      '',
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    const viteAuthorizedMigration = createViteResponse();
    await viteHandler(
      createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/client'),
      viteAuthorizedMigration.response
    );
    expect([njsAuthorizedMigration.status, viteAuthorizedMigration.status]).toEqual([200, 200]);
    expect([
      JSON.parse(njsAuthorizedMigration.body ?? '{}').values,
      JSON.parse(viteAuthorizedMigration.body).values,
    ]).toEqual([{ lowPowerMode: true }, { lowPowerMode: true }]);
    expect(
      JSON.parse(njsFs.files.get(CLIENT_PREFERENCES_PATH) ?? '{}').records[
        `client-binding:${CLIENT_BINDING_A}`
      ]?.values
    ).toEqual({ lowPowerMode: true });
    expect(
      JSON.parse(readFileSync(viteStore.getPaths().clientPreferences, 'utf8')).records[
        `client-binding:${CLIENT_BINDING_A}`
      ]?.values
    ).toEqual({ lowPowerMode: true });

    const mismatchedBindingHeaders = {
      ...CLIENT_HEADERS,
      Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
    };
    njsFs.files.set(CLIENT_REGISTRY_PATH, legacyNjsRegistry);
    njsFs.files.set(CLIENT_PREFERENCES_PATH, migratableClientCollection);
    writeFileSync(viteStore.getPaths().clients, legacyViteRegistry, 'utf8');
    writeFileSync(viteStore.getPaths().clientPreferences, migratableClientCollection, 'utf8');

    const njsMismatchedBinding = runNjs(
      'GET',
      mismatchedBindingHeaders,
      '',
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    const viteMismatchedBinding = createViteResponse();
    await viteHandler(
      createViteRequest('GET', mismatchedBindingHeaders, '', '/preferences/client'),
      viteMismatchedBinding.response
    );
    expect([njsMismatchedBinding.status, viteMismatchedBinding.status]).toEqual([403, 403]);
    expect([
      njsMismatchedBinding.headers['X-Navet-Profile-Error-Code'],
      viteMismatchedBinding.header('X-Navet-Profile-Error-Code'),
    ]).toEqual(['client-binding-mismatch', 'client-binding-mismatch']);
    expect(njsFs.files.get(CLIENT_PREFERENCES_PATH)).toBe(migratableClientCollection);
    expect(readFileSync(viteStore.getPaths().clientPreferences, 'utf8')).toBe(
      migratableClientCollection
    );
    expect(njsFs.files.get(CLIENT_REGISTRY_PATH)).toBe(legacyNjsRegistry);
    expect(readFileSync(viteStore.getPaths().clients, 'utf8')).toBe(legacyViteRegistry);

    njsFs.files.delete(CLIENT_PREFERENCES_PATH);
    rmSync(viteStore.getPaths().clientPreferences, { force: true });
    const historicalAccountDocument = {
      ...legacyDocument,
      scope: 'account',
      values: { language: 'sv' },
      clientId: null,
    };
    const historicalAccountCollection = JSON.stringify({
      contractVersion: 1,
      records: {
        'home_assistant|user:ha-user-1': historicalAccountDocument,
      },
    });
    njsFs.files.set(CLIENT_REGISTRY_PATH, njsRegistryBefore);
    njsFs.files.set(ACCOUNT_PREFERENCES_PATH, historicalAccountCollection);
    writeFileSync(viteStore.getPaths().clients, viteRegistryBefore, 'utf8');
    writeFileSync(viteStore.getPaths().accountPreferences, historicalAccountCollection, 'utf8');
    const njsHistoricalAccount = runNjs(
      'GET',
      CLIENT_HEADERS,
      '',
      true,
      PRINCIPAL,
      '/preferences/account'
    );
    const viteHistoricalAccount = createViteResponse();
    await viteHandler(
      createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/account'),
      viteHistoricalAccount.response
    );
    expect([njsHistoricalAccount.status, viteHistoricalAccount.status]).toEqual([200, 200]);
    expect([
      JSON.parse(njsHistoricalAccount.body ?? '{}').values,
      JSON.parse(viteHistoricalAccount.body).values,
    ]).toEqual([{ language: 'sv' }, { language: 'sv' }]);
    expect(njsFs.files.get(ACCOUNT_PREFERENCES_PATH)).toBe(historicalAccountCollection);
    expect(readFileSync(viteStore.getPaths().accountPreferences, 'utf8')).toBe(
      historicalAccountCollection
    );

    const malformedAccountCollections = [
      {
        label: 'literal null account collection',
        serialized: 'null',
      },
      {
        label: 'malformed account document beside a historical document',
        serialized: JSON.stringify({
          contractVersion: 1,
          records: {
            'home_assistant|user:ha-user-1': historicalAccountDocument,
            'home_assistant|user:ha-user-2': {
              ...historicalAccountDocument,
              values: [],
            },
          },
        }),
      },
      {
        label: 'account document with a client-owned identity',
        serialized: JSON.stringify({
          contractVersion: 1,
          records: {
            'home_assistant|user:ha-user-1': {
              ...historicalAccountDocument,
              clientId: 'client-panel-01',
            },
          },
        }),
      },
    ];
    const renamedClientHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Client-Name': encodeURIComponent('Renamed kitchen panel'),
    };

    for (const collection of malformedAccountCollections) {
      njsFs.files.set(CLIENT_REGISTRY_PATH, njsRegistryBefore);
      njsFs.files.set(ACCOUNT_PREFERENCES_PATH, collection.serialized);
      writeFileSync(viteStore.getPaths().clients, viteRegistryBefore, 'utf8');
      writeFileSync(viteStore.getPaths().accountPreferences, collection.serialized, 'utf8');

      const njsResult = runNjs(
        'GET',
        renamedClientHeaders,
        '',
        true,
        PRINCIPAL,
        '/preferences/account'
      );
      const viteResult = createViteResponse();
      await viteHandler(
        createViteRequest('GET', renamedClientHeaders, '', '/preferences/account'),
        viteResult.response
      );

      expect([njsResult.status, viteResult.status], collection.label).toEqual([503, 503]);
      expect([
        njsResult.headers['X-Navet-Profile-Error-Code'],
        viteResult.header('X-Navet-Profile-Error-Code'),
      ]).toEqual(['profile-storage-unavailable', 'profile-storage-unavailable']);
      expect(njsFs.files.get(ACCOUNT_PREFERENCES_PATH), `${collection.label} NJS bytes`).toBe(
        collection.serialized
      );
      expect(
        readFileSync(viteStore.getPaths().accountPreferences, 'utf8'),
        `${collection.label} Vite bytes`
      ).toBe(collection.serialized);
      expect(njsFs.files.get(CLIENT_REGISTRY_PATH), `${collection.label} NJS registry`).toBe(
        njsRegistryBefore
      );
      expect(
        readFileSync(viteStore.getPaths().clients, 'utf8'),
        `${collection.label} Vite registry`
      ).toBe(viteRegistryBefore);
    }

    njsFs.files.set(CLIENT_REGISTRY_PATH, njsRegistryBefore);
    njsFs.files.set(
      CLIENT_PREFERENCES_PATH,
      JSON.stringify({
        contractVersion: 1,
        records: {
          [`client-binding:${CLIENT_BINDING_A}`]: legacyDocument,
        },
      })
    );
    const originalNjsReadFile = njsFs.readFileSync;
    let normalPreferenceReads = 0;
    njsFs.readFileSync = (filePath: string) => {
      if (filePath === CLIENT_PREFERENCES_PATH) {
        normalPreferenceReads += 1;
      }
      return originalNjsReadFile(filePath);
    };
    const normalPreferenceRead = runNjs(
      'GET',
      CLIENT_HEADERS,
      '',
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    expect(normalPreferenceRead.status).toBe(200);
    expect(normalPreferenceReads).toBe(1);

    njsFs.files.set(CLIENT_REGISTRY_PATH, njsRegistryBefore);
    normalPreferenceReads = 0;
    const newClientPreferenceRead = runNjs(
      'GET',
      {
        ...CLIENT_HEADERS,
        'X-Navet-Client-Id': 'client-panel-new',
        'X-Navet-Client-Name': encodeURIComponent('New panel'),
        Cookie: `navet_profile_client=${CLIENT_BINDING_B}`,
      },
      '',
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    expect(newClientPreferenceRead.status).toBe(204);
    expect(normalPreferenceReads).toBe(1);
  });

  it('rejects an oversized final patch without advancing or corrupting profile state', async () => {
    const njsFs = createMockFs();
    profileStore.setProfileStoreFsForTests(njsFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-final-size-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });
    const initialProfile = JSON.stringify({
      ...JSON.parse(PROFILE),
      primaryPayload: 'a'.repeat(600_000),
    });
    const initialHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '0',
    };
    const njsInitial = runNjs('PUT', initialHeaders, initialProfile);
    const viteInitial = createViteResponse();
    await viteHandler(
      createViteRequest('PUT', initialHeaders, initialProfile),
      viteInitial.response
    );
    expect([njsInitial.status, viteInitial.status]).toEqual([200, 200]);

    const njsBefore = [
      njsFs.files.get(PROFILE_PATH),
      njsFs.files.get(PROFILE_STATE_PATH),
      njsFs.files.get(PROFILE_HISTORY_PATH),
    ];
    const viteBefore = [
      readFileSync(viteStore.getPaths().profile, 'utf8'),
      readFileSync(viteStore.getPaths().state, 'utf8'),
      readFileSync(viteStore.getPaths().history, 'utf8'),
    ];
    const patch = JSON.stringify([
      {
        op: 'add',
        path: '/secondaryPayload',
        value: 'b'.repeat(600_000),
      },
    ]);
    const patchHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '1',
    };
    const njsPatch = runNjs('PATCH', patchHeaders, patch);
    const vitePatch = createViteResponse();
    await viteHandler(createViteRequest('PATCH', patchHeaders, patch), vitePatch.response);
    expect([njsPatch.status, vitePatch.status]).toEqual([413, 413]);
    expect([
      njsFs.files.get(PROFILE_PATH),
      njsFs.files.get(PROFILE_STATE_PATH),
      njsFs.files.get(PROFILE_HISTORY_PATH),
    ]).toEqual(njsBefore);
    expect([
      readFileSync(viteStore.getPaths().profile, 'utf8'),
      readFileSync(viteStore.getPaths().state, 'utf8'),
      readFileSync(viteStore.getPaths().history, 'utf8'),
    ]).toEqual(viteBefore);
  });

  it('rejects aggregate preference overflow without mutating the prior collection', async () => {
    const njsFs = createMockFs();
    profileStore.setProfileStoreFsForTests(njsFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-preference-final-size-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });
    const preferenceBody = JSON.stringify({
      schemaVersion: 1,
      values: {
        cameraViewModes: {
          'camera.large': 'x'.repeat(240_000),
        },
      },
    });

    for (let index = 0; index < 17; index += 1) {
      const headers = {
        'X-Navet-Client-Id': `client-panel-${String(index).padStart(3, '0')}`,
        'X-Navet-Client-Name': `Panel ${index}`,
        'X-Navet-Client-Kind': 'wall_panel',
        'X-Navet-Base-Revision': '0',
        Cookie: `navet_profile_client=${index.toString(16).padStart(64, '0')}`,
      };
      const njsWrite = runNjs(
        'PUT',
        headers,
        preferenceBody,
        true,
        PRINCIPAL,
        '/preferences/client'
      );
      const viteWrite = createViteResponse();
      await viteHandler(
        createViteRequest('PUT', headers, preferenceBody, '/preferences/client'),
        viteWrite.response
      );
      expect([njsWrite.status, viteWrite.status]).toEqual([200, 200]);
    }

    const njsBefore = njsFs.files.get(CLIENT_PREFERENCES_PATH);
    const viteBefore = readFileSync(viteStore.getPaths().clientPreferences, 'utf8');
    const overflowHeaders = {
      'X-Navet-Client-Id': 'client-panel-overflow',
      'X-Navet-Client-Name': 'Overflow panel',
      'X-Navet-Client-Kind': 'wall_panel',
      'X-Navet-Base-Revision': '0',
      Cookie: `navet_profile_client=${'f'.repeat(64)}`,
    };
    const njsOverflow = runNjs(
      'PUT',
      overflowHeaders,
      preferenceBody,
      true,
      PRINCIPAL,
      '/preferences/client'
    );
    const viteOverflow = createViteResponse();
    await viteHandler(
      createViteRequest('PUT', overflowHeaders, preferenceBody, '/preferences/client'),
      viteOverflow.response
    );
    expect([njsOverflow.status, viteOverflow.status]).toEqual([503, 503]);
    expect([
      njsOverflow.headers['X-Navet-Profile-Error-Code'],
      viteOverflow.header('X-Navet-Profile-Error-Code'),
    ]).toEqual(['client-capacity-reached', 'client-capacity-reached']);
    expect(njsFs.files.get(CLIENT_PREFERENCES_PATH)).toBe(njsBefore);
    expect(readFileSync(viteStore.getPaths().clientPreferences, 'utf8')).toBe(viteBefore);
  });

  it('serves a near-cap legacy preference without bricking storage during binding migration', async () => {
    const njsFs = createMockFs();
    profileStore.setProfileStoreFsForTests(njsFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-preference-near-cap-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });

    const njsBaseline = runNjs('GET', CLIENT_HEADERS, '', true, PRINCIPAL, '/preferences/client');
    const viteBaseline = createViteResponse();
    await viteHandler(
      createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/client'),
      viteBaseline.response
    );
    expect([njsBaseline.status, viteBaseline.status]).toEqual([204, 204]);

    const legacyKey = 'client:client-panel-01';
    const baseCollection = {
      contractVersion: 1,
      records: {
        [legacyKey]: {
          contractVersion: 1,
          schemaVersion: 1,
          scope: 'client',
          revision: 1,
          updatedAt: '2026-07-25T09:00:00.000Z',
          values: {
            cameraViewModes: {
              'camera.large': '',
            },
          },
          principal: {
            providerId: 'home_assistant',
            userId: 'ha-user-1',
            userName: 'Vishal',
          },
          clientId: 'client-panel-01',
        },
      },
    };
    const baseBytes = Buffer.byteLength(JSON.stringify(baseCollection), 'utf8');
    baseCollection.records[legacyKey].values.cameraViewModes['camera.large'] = 'x'.repeat(
      4 * 1024 * 1024 - baseBytes - 16
    );
    const nearCapCollection = JSON.stringify(baseCollection);
    expect(Buffer.byteLength(nearCapCollection, 'utf8')).toBeLessThan(4 * 1024 * 1024);
    njsFs.files.set(CLIENT_PREFERENCES_PATH, nearCapCollection);
    writeFileSync(viteStore.getPaths().clientPreferences, nearCapCollection, 'utf8');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const njsRead = runNjs('GET', CLIENT_HEADERS, '', true, PRINCIPAL, '/preferences/client');
      const viteRead = createViteResponse();
      await viteHandler(
        createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/client'),
        viteRead.response
      );
      expect([njsRead.status, viteRead.status]).toEqual([200, 200]);
      expect(njsFs.files.get(CLIENT_PREFERENCES_PATH)).toBe(nearCapCollection);
      expect(readFileSync(viteStore.getPaths().clientPreferences, 'utf8')).toBe(nearCapCollection);
    }
  });

  it('resolves duplicate profile cookies against the registered browser binding', async () => {
    const njsFs = createMockFs();
    profileStore.setProfileStoreFsForTests(njsFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-cookie-duplicates-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });

    const njsEnrollment = runNjs('GET', CLIENT_HEADERS, '', true, PRINCIPAL, '/preferences/client');
    const viteEnrollment = createViteResponse();
    await viteHandler(
      createViteRequest('GET', CLIENT_HEADERS, '', '/preferences/client'),
      viteEnrollment.response
    );
    expect([njsEnrollment.status, viteEnrollment.status]).toEqual([204, 204]);

    for (const cookie of [
      `navet_profile_client=${CLIENT_BINDING_A}; navet_profile_client=malformed`,
      `navet_profile_client=malformed; navet_profile_client=${CLIENT_BINDING_A}`,
      `navet_profile_client=${CLIENT_BINDING_A}; navet_profile_client=${CLIENT_BINDING_B}`,
      `navet_profile_client=${CLIENT_BINDING_B}; navet_profile_client=${CLIENT_BINDING_A}`,
    ]) {
      const headers = { ...CLIENT_HEADERS, Cookie: cookie };
      const njsRead = runNjs('GET', headers, '', true, PRINCIPAL, '/preferences/client');
      const viteRead = createViteResponse();
      await viteHandler(
        createViteRequest('GET', headers, '', '/preferences/client'),
        viteRead.response
      );
      expect([njsRead.status, viteRead.status], cookie).toEqual([204, 204]);
      expect(clientBindingFromSetCookie(njsRead.headers['Set-Cookie']), cookie).toBe(
        CLIENT_BINDING_A
      );
      expect(clientBindingFromSetCookie(viteRead.header('Set-Cookie')), cookie).toBe(
        CLIENT_BINDING_A
      );
    }

    for (const cookie of [
      'navet_profile_client=malformed',
      `navet_profile_client=${CLIENT_BINDING_B}`,
    ]) {
      const headers = { ...CLIENT_HEADERS, Cookie: cookie };
      const njsRejected = runNjs('GET', headers, '', true, PRINCIPAL, '/preferences/client');
      const viteRejected = createViteResponse();
      await viteHandler(
        createViteRequest('GET', headers, '', '/preferences/client'),
        viteRejected.response
      );
      expect([njsRejected.status, viteRejected.status], cookie).toEqual([403, 403]);
      expect(njsRejected.headers['Set-Cookie']).toBeUndefined();
      expect(viteRejected.header('Set-Cookie')).toBeUndefined();
    }
  });

  it('shares one cold-client binding across isolated NJS request modules and Vite stores', async () => {
    const sharedFs = createMockFs();
    const coldHeaders = {
      'X-Navet-Client-Id': 'client-panel-01',
      'X-Navet-Client-Name': encodeURIComponent('Kitchen panel'),
      'X-Navet-Client-Kind': 'wall_panel',
      'User-Agent': 'Navet cold-start conformance',
      'X-Forwarded-For': '192.0.2.10',
    };

    vi.resetModules();
    const firstNjsStore = (await import('@docker/njs/profile-store.js'))
      .default as typeof profileStore;
    firstNjsStore.setProfileStoreFsForTests(sharedFs);
    const firstNjs = runNjs(
      'GET',
      coldHeaders,
      '',
      true,
      PRINCIPAL,
      '/preferences/client',
      firstNjsStore
    );

    vi.resetModules();
    const secondNjsStore = (await import('@docker/njs/profile-store.js'))
      .default as typeof profileStore;
    secondNjsStore.setProfileStoreFsForTests(sharedFs);
    const secondNjs = runNjs(
      'GET',
      coldHeaders,
      '',
      true,
      PRINCIPAL,
      '/preferences/client',
      secondNjsStore
    );

    expect([firstNjs.status, secondNjs.status]).toEqual([204, 204]);
    expect(clientBindingFromSetCookie(firstNjs.headers['Set-Cookie'])).toBe(
      clientBindingFromSetCookie(secondNjs.headers['Set-Cookie'])
    );

    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-cold-binding-'));
    tempDirectories.push(directory);
    const profilePath = join(directory, 'profile.json');
    const firstVite = createViteResponse();
    const secondVite = createViteResponse();
    const firstViteHandler = createViteDashboardProfileRequestHandler({
      store: createViteDashboardProfileStore(profilePath),
      resolvePrincipal: () => PRINCIPAL,
    });
    const secondViteHandler = createViteDashboardProfileRequestHandler({
      store: createViteDashboardProfileStore(profilePath),
      resolvePrincipal: () => PRINCIPAL,
    });

    await Promise.all([
      firstViteHandler(
        createViteRequest('GET', coldHeaders, '', '/preferences/client'),
        firstVite.response
      ),
      secondViteHandler(
        createViteRequest('GET', coldHeaders, '', '/preferences/client'),
        secondVite.response
      ),
    ]);

    expect([firstVite.status, secondVite.status]).toEqual([204, 204]);
    expect(clientBindingFromSetCookie(firstVite.header('Set-Cookie'))).toBe(
      clientBindingFromSetCookie(secondVite.header('Set-Cookie'))
    );
  });

  it('caps large full-snapshot history while retaining the newest recoverable revisions', async () => {
    const sharedFs = createMockFs();
    profileStore.setProfileStoreFsForTests(sharedFs);
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-history-cap-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => PRINCIPAL,
    });
    const largePayload = 'x'.repeat(900 * 1024);

    for (let revision = 0; revision < 7; revision += 1) {
      const body = JSON.stringify({
        app: 'navet',
        version: 3,
        exportedAt: `2026-07-25T09:0${revision}:00.000Z`,
        dashboard: {
          title: `Large revision ${revision + 1}`,
          payload: largePayload,
        },
      });
      const headers = {
        ...CLIENT_HEADERS,
        'X-Navet-Base-Revision': String(revision),
      };
      const njsWrite = runNjs('PUT', headers, body);
      const viteWrite = createViteResponse();
      await viteHandler(createViteRequest('PUT', headers, body), viteWrite.response);
      expect([njsWrite.status, viteWrite.status]).toEqual([200, 200]);
    }

    const njsHistorySerialized = sharedFs.readFileSync(PROFILE_HISTORY_PATH);
    const viteHistorySerialized = readFileSync(viteStore.getPaths().history, 'utf8');
    const maxHistoryBytes = 4 * 1024 * 1024;
    expect(Buffer.byteLength(njsHistorySerialized, 'utf8')).toBeLessThanOrEqual(maxHistoryBytes);
    expect(Buffer.byteLength(viteHistorySerialized, 'utf8')).toBeLessThanOrEqual(maxHistoryBytes);

    const njsHistory = JSON.parse(njsHistorySerialized) as Array<{
      metadata: { revision: number };
    }>;
    const viteHistory = JSON.parse(viteHistorySerialized) as Array<{
      metadata: { revision: number };
    }>;
    expect(njsHistory.map((entry) => entry.metadata.revision)).toEqual([4, 5, 6, 7]);
    expect(viteHistory.map((entry) => entry.metadata.revision)).toEqual([4, 5, 6, 7]);
  });

  it('shares one workspace across same-HA browser sessions and denies a different HA tenant', async () => {
    profileStore.setProfileStoreFsForTests(createMockFs());
    const directory = mkdtempSync(join(tmpdir(), 'navet-profile-tenant-conformance-'));
    tempDirectories.push(directory);
    const viteStore = createViteDashboardProfileStore(join(directory, 'profile.json'));
    const secondBrowser: ViteDashboardProfilePrincipal = {
      ...PRINCIPAL,
      sessionId: 'nas_session_two',
      userId: null,
      userName: null,
    };
    const otherHomeAssistant: ViteDashboardProfilePrincipal = {
      ...PRINCIPAL,
      tenantId: `hat_${'b'.repeat(64)}`,
      sessionId: 'nas_attacker_session',
      userId: null,
      userName: null,
    };
    let vitePrincipal = PRINCIPAL;
    const viteHandler = createViteDashboardProfileRequestHandler({
      store: viteStore,
      resolvePrincipal: () => vitePrincipal,
    });
    const writeHeaders = {
      ...CLIENT_HEADERS,
      'X-Navet-Base-Revision': '0',
    };

    const njsWrite = runNjs('PUT', writeHeaders, PROFILE);
    const viteWrite = createViteResponse();
    await viteHandler(createViteRequest('PUT', writeHeaders, PROFILE), viteWrite.response);
    expect([njsWrite.status, viteWrite.status]).toEqual([200, 200]);

    const njsSameTenantRead = runNjs('GET', CLIENT_HEADERS, '', true, secondBrowser);
    vitePrincipal = secondBrowser;
    const viteSameTenantRead = createViteResponse();
    await viteHandler(createViteRequest('GET', CLIENT_HEADERS), viteSameTenantRead.response);
    expect([njsSameTenantRead.status, viteSameTenantRead.status]).toEqual([200, 200]);

    vitePrincipal = otherHomeAssistant;
    const deniedRequests = [
      { method: 'GET', headers: CLIENT_HEADERS, body: '' },
      {
        method: 'PUT',
        headers: {
          ...CLIENT_HEADERS,
          'X-Navet-Base-Revision': '1',
        },
        body: PROFILE,
      },
      {
        method: 'DELETE',
        headers: {
          ...CLIENT_HEADERS,
          'X-Navet-Base-Revision': '1',
        },
        body: '',
      },
    ];
    for (const request of deniedRequests) {
      const njsDenied = runNjs(
        request.method,
        request.headers,
        request.body,
        true,
        otherHomeAssistant
      );
      const viteDenied = createViteResponse();
      await viteHandler(
        createViteRequest(request.method, request.headers, request.body),
        viteDenied.response
      );
      expect([njsDenied.status, viteDenied.status]).toEqual([403, 403]);
      expect([
        njsDenied.headers['X-Navet-Profile-Error-Code'],
        viteDenied.header('X-Navet-Profile-Error-Code'),
      ]).toEqual(['workspace-tenant-mismatch', 'workspace-tenant-mismatch']);
    }

    const njsOwnerRead = runNjs('GET', CLIENT_HEADERS);
    vitePrincipal = PRINCIPAL;
    const viteOwnerRead = createViteResponse();
    await viteHandler(createViteRequest('GET', CLIENT_HEADERS), viteOwnerRead.response);
    expect([njsOwnerRead.status, viteOwnerRead.status]).toEqual([200, 200]);
    expect(viteStore.getState()).toMatchObject({ revision: 1, status: 'active' });
  });
});
