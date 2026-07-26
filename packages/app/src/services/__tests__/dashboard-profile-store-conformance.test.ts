import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

const PRINCIPAL: ViteDashboardProfilePrincipal = {
  providerId: 'home_assistant',
  sessionId: 'nas_session_one',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

const CLIENT_HEADERS = {
  'X-Navet-Client-Id': 'client-panel-01',
  'X-Navet-Client-Name': encodeURIComponent('Kitchen panel'),
  'X-Navet-Client-Kind': 'wall_panel',
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
  authenticated = true
) {
  profileStore.setProfileStorePrincipalResolverForTests(() => (authenticated ? PRINCIPAL : null));
  const request = {
    method,
    uri: '/__navet_profile__/default',
    headersIn,
    headersOut: {} as Record<string, string>,
    requestText: body,
    return: vi.fn(),
  };
  profileStore.handle(request);
  return {
    status: request.return.mock.calls.at(-1)?.[0] as number,
    headers: request.headersOut,
  };
}

function createViteRequest(method: string, headers: Record<string, string> = {}, body = '') {
  return {
    method,
    url: '/default',
    headers: Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
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
    expect(standaloneSnippet).toContain('navet_profile_store.handle;');
    expect(standaloneSnippet).not.toContain('handleIngress');
    expect(ingressSnippet).toContain('navet_profile_store.handleIngress;');
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
});
