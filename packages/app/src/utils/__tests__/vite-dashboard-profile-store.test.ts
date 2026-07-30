import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInstallationCookieNames } from '@scripts/installation-cookie-scope';
import {
  applyDashboardProfilePatch,
  createViteDashboardProfileRequestHandler,
  createViteDashboardProfileStore,
  type DashboardProfileData,
  sanitizeDashboardProfileData,
  type ViteDashboardProfilePrincipal,
} from '@scripts/vite-dashboard-profile-store';
import { afterEach, describe, expect, it, vi } from 'vitest';

const HA_TENANT_ID = `hat_${'a'.repeat(64)}`;
const CLIENT_BINDING_A = 'a'.repeat(64);
const CLIENT_BINDING_B = 'b'.repeat(64);
const CLIENT_BINDING_C = 'c'.repeat(64);

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
const BOUND_CLIENT = {
  id: AUTHOR.id,
  name: AUTHOR.name,
  kind: AUTHOR.kind,
  bindingId: CLIENT_BINDING_A,
};

const PRINCIPAL: ViteDashboardProfilePrincipal = {
  providerId: 'home_assistant',
  tenantId: HA_TENANT_ID,
  sessionId: 'nas_session_one',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

const CLIENT_HEADERS = {
  'x-navet-client-id': 'client-panel-01',
  'x-navet-client-name': encodeURIComponent('Kitchen panel'),
  'x-navet-client-kind': 'wall_panel',
  cookie: `navet_profile_client=${CLIENT_BINDING_A}`,
};

const tempDirs: string[] = [];

function createStore() {
  const directory = mkdtempSync(join(tmpdir(), 'navet-dashboard-profile-'));
  tempDirs.push(directory);
  return createViteDashboardProfileStore(join(directory, 'profile.json'));
}

interface PersistedTestRegistryClient {
  id: string;
  bindingId?: string;
  lastSeenAt?: unknown;
  [key: string]: unknown;
}

interface PersistedTestRegistry {
  clients: PersistedTestRegistryClient[];
  [key: string]: unknown;
}

function readPersistedRegistry(
  store: ReturnType<typeof createViteDashboardProfileStore>
): PersistedTestRegistry {
  return JSON.parse(readFileSync(store.getPaths().clients, 'utf8')) as PersistedTestRegistry;
}

function writePersistedRegistry(
  store: ReturnType<typeof createViteDashboardProfileStore>,
  registry: PersistedTestRegistry
): void {
  writeFileSync(store.getPaths().clients, JSON.stringify(registry), 'utf8');
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
    headers: {
      host: 'navet.example',
      origin: 'http://navet.example',
      ...headers,
    },
    async *[Symbol.asyncIterator]() {
      if (body) {
        yield Buffer.from(body);
      }
    },
  } as unknown as IncomingMessage;
}

function createDeferredRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string
) {
  let releaseBody!: () => void;
  let markBodyRead!: () => void;
  const bodyGate = new Promise<void>((resolve) => {
    releaseBody = resolve;
  });
  const bodyRead = new Promise<void>((resolve) => {
    markBodyRead = resolve;
  });
  const request = {
    method,
    url,
    headers: {
      host: 'navet.example',
      origin: 'http://navet.example',
      ...headers,
    },
    async *[Symbol.asyncIterator]() {
      markBodyRead();
      await bodyGate;
      yield Buffer.from(body);
    },
  } as unknown as IncomingMessage;

  return { request, bodyRead, releaseBody };
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
  vi.useRealTimers();
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

  it('persists unchanged client presence at most once every fifteen minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();

    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    const clientsPath = store.getPaths().clients;
    const initial = readFileSync(clientsPath, 'utf8');

    vi.setSystemTime(new Date('2026-07-25T09:14:59.999Z'));
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    expect(readFileSync(clientsPath, 'utf8')).toBe(initial);

    vi.setSystemTime(new Date('2026-07-25T09:15:00.000Z'));
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    expect(readFileSync(clientsPath, 'utf8')).not.toBe(initial);
  });

  it('normalizes reversed canonical registry order while listing newest clients first', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);

    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'));
    const secondClient = {
      id: 'client-panel-02',
      name: 'Hallway panel',
      kind: 'wall_panel' as const,
      bindingId: CLIENT_BINDING_B,
    };
    store.touchClient(PRINCIPAL, secondClient);
    const reversedRegistry = readPersistedRegistry(store);
    reversedRegistry.clients.reverse();
    writePersistedRegistry(store, reversedRegistry);

    store.touchClient(PRINCIPAL, secondClient);

    expect(readPersistedRegistry(store).clients.map((client) => client.id)).toEqual([
      BOUND_CLIENT.id,
      secondClient.id,
    ]);
    expect(store.listClients().map((client) => client.id)).toEqual([
      secondClient.id,
      BOUND_CLIENT.id,
    ]);
  });

  it('orders equal client timestamps deterministically by id and binding', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    const zetaClient = {
      id: 'client-panel-zeta',
      name: 'Zeta panel',
      kind: 'wall_panel' as const,
      bindingId: CLIENT_BINDING_C,
    };
    const alphaClient = {
      id: 'client-panel-alpha',
      name: 'Alpha panel',
      kind: 'wall_panel' as const,
      bindingId: CLIENT_BINDING_B,
    };
    store.touchClient(PRINCIPAL, zetaClient);
    store.touchClient(PRINCIPAL, alphaClient);

    const registryWithDuplicate = readPersistedRegistry(store);
    const alphaEntry = registryWithDuplicate.clients.find((client) => client.id === alphaClient.id);
    if (!alphaEntry) {
      throw new Error('Expected the alpha client to be persisted');
    }
    registryWithDuplicate.clients.unshift({
      ...alphaEntry,
      bindingId: 'd'.repeat(64),
    });
    writePersistedRegistry(store, registryWithDuplicate);

    store.touchClient(PRINCIPAL, zetaClient);

    const persistedClients = readPersistedRegistry(store).clients;
    expect(persistedClients.map((client) => client.id)).toEqual([alphaClient.id, zetaClient.id]);
    expect(persistedClients.find((client) => client.id === alphaClient.id)?.bindingId).toBe(
      CLIENT_BINDING_B
    );
    expect(store.listClients().map((client) => client.id)).toEqual([alphaClient.id, zetaClient.id]);
  });

  it('prefers a bound duplicate over a newer legacy record and preserves its preference', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    store.savePreference('client', PRINCIPAL, 1, { lowPowerMode: true }, BOUND_CLIENT);
    const registryWithLegacyDuplicate = readPersistedRegistry(store);
    const boundEntry = registryWithLegacyDuplicate.clients[0];
    if (!boundEntry) {
      throw new Error('Expected the bound dashboard client to be persisted');
    }
    const legacyEntry = { ...boundEntry };
    delete legacyEntry.bindingId;
    legacyEntry.lastSeenAt = '2026-07-25T09:05:00.000Z';
    registryWithLegacyDuplicate.clients.unshift(legacyEntry);
    writePersistedRegistry(store, registryWithLegacyDuplicate);

    vi.setSystemTime(new Date('2026-07-25T09:10:00.000Z'));
    store.touchClient(PRINCIPAL, BOUND_CLIENT);

    expect(readPersistedRegistry(store).clients).toEqual([
      expect.objectContaining({
        id: BOUND_CLIENT.id,
        bindingId: CLIENT_BINDING_A,
      }),
    ]);
    expect(store.getPreference('client', PRINCIPAL, BOUND_CLIENT)).toMatchObject({
      clientId: BOUND_CLIENT.id,
      values: { lowPowerMode: true },
    });
  });

  it('canonicalizes parseable non-UTC client timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    const registry = readPersistedRegistry(store);
    const persistedClient = registry.clients[0];
    if (!persistedClient) {
      throw new Error('Expected the dashboard client to be persisted');
    }
    persistedClient.firstSeenAt = '2026-07-25T11:00:00+02:00';
    persistedClient.lastSeenAt = '2026-07-25T11:00:00+02:00';
    writePersistedRegistry(store, registry);

    vi.setSystemTime(new Date('2026-07-25T09:05:00.000Z'));
    expect(store.listClients()[0]?.firstSeenAt).toBe('2026-07-25T09:00:00.000Z');
    expect(store.listClients()[0]?.lastSeenAt).toBe('2026-07-25T09:00:00.000Z');
    store.touchClient(PRINCIPAL, BOUND_CLIENT);

    expect(readPersistedRegistry(store).clients[0]?.firstSeenAt).toBe('2026-07-25T09:00:00.000Z');
    expect(readPersistedRegistry(store).clients[0]?.lastSeenAt).toBe('2026-07-25T09:00:00.000Z');
  });

  it('clamps far-future client timestamps to the bounded clock-skew allowance', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    const registry = readPersistedRegistry(store);
    const persistedClient = registry.clients[0];
    if (!persistedClient) {
      throw new Error('Expected the dashboard client to be persisted');
    }
    persistedClient.lastSeenAt = '2099-01-01T00:00:00.000Z';
    writePersistedRegistry(store, registry);

    expect(store.listClients()[0]?.lastSeenAt).toBe('2026-07-25T09:00:00.000Z');
    store.touchClient(PRINCIPAL, BOUND_CLIENT);

    expect(readPersistedRegistry(store).clients[0]?.lastSeenAt).toBe('2026-07-25T09:00:00.000Z');
  });

  it.each([
    {
      label: 'array lastSeenAt',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.lastSeenAt = [];
      },
    },
    {
      label: 'null lastSeenAt',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.lastSeenAt = null;
      },
    },
    {
      label: 'missing lastSeenAt',
      corrupt: (client: PersistedTestRegistryClient) => {
        delete client.lastSeenAt;
      },
    },
    {
      label: 'unparseable lastSeenAt',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.lastSeenAt = 'not-a-timestamp';
      },
    },
    {
      label: 'malformed id',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.id = 'bad';
      },
    },
    {
      label: 'malformed firstSeenAt',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.firstSeenAt = [];
      },
    },
    {
      label: 'malformed binding',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.bindingId = 'not-a-binding';
      },
    },
    {
      label: 'malformed principal',
      corrupt: (client: PersistedTestRegistryClient) => {
        client.principal = null;
      },
    },
  ])('rejects a $label without mutating registry or preferences', ({ corrupt }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    store.savePreference('client', PRINCIPAL, 1, { lowPowerMode: true }, BOUND_CLIENT);
    const registry = readPersistedRegistry(store);
    const persistedClient = registry.clients[0];
    if (!persistedClient) {
      throw new Error('Expected the dashboard client to be persisted');
    }
    corrupt(persistedClient);
    writePersistedRegistry(store, registry);
    const registryBefore = readFileSync(store.getPaths().clients, 'utf8');
    const preferencesBefore = readFileSync(store.getPaths().clientPreferences, 'utf8');

    expect(() => store.listClients()).toThrow('Dashboard profile storage cannot be read safely');
    expect(() => store.touchClient(PRINCIPAL, BOUND_CLIENT)).toThrow(
      'Dashboard profile storage cannot be read safely'
    );
    expect(readFileSync(store.getPaths().clients, 'utf8')).toBe(registryBefore);
    expect(readFileSync(store.getPaths().clientPreferences, 'utf8')).toBe(preferencesBefore);
  });

  it('rejects a literal null registry without mutating client preferences', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    store.savePreference('client', PRINCIPAL, 1, { lowPowerMode: true }, BOUND_CLIENT);
    writeFileSync(store.getPaths().clients, 'null', 'utf8');
    const registryBefore = readFileSync(store.getPaths().clients, 'utf8');
    const preferencesBefore = readFileSync(store.getPaths().clientPreferences, 'utf8');

    expect(() => store.listClients()).toThrow('Dashboard profile storage cannot be read safely');
    expect(() => store.touchClient(PRINCIPAL, BOUND_CLIENT)).toThrow(
      'Dashboard profile storage cannot be read safely'
    );
    expect(readFileSync(store.getPaths().clients, 'utf8')).toBe(registryBefore);
    expect(readFileSync(store.getPaths().clientPreferences, 'utf8')).toBe(preferencesBefore);
  });

  it('rekeys one durable browser binding instead of leaving a ghost client', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    const original = store.touchClient(PRINCIPAL, BOUND_CLIENT);
    store.savePreference('client', PRINCIPAL, 1, { compactMode: true }, BOUND_CLIENT);

    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'));
    const rotatedClient = {
      ...BOUND_CLIENT,
      id: 'client-panel-rotated',
      name: 'Kitchen panel restored',
    };
    const rotated = store.touchClient(PRINCIPAL, rotatedClient);

    expect(rotated).toMatchObject({
      id: 'client-panel-rotated',
      firstSeenAt: original?.firstSeenAt,
    });
    expect(store.listClients()).toEqual([
      expect.objectContaining({
        id: 'client-panel-rotated',
        firstSeenAt: original?.firstSeenAt,
      }),
    ]);
    expect(store.getPreference('client', PRINCIPAL, rotatedClient)).toMatchObject({
      clientId: rotatedClient.id,
      revision: 1,
      values: { compactMode: true },
    });
  });

  it('self-heals a stale preference label after an interrupted same-binding rekey', () => {
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    store.savePreference('client', PRINCIPAL, 1, { compactMode: true }, BOUND_CLIENT);
    const rotatedClient = {
      ...BOUND_CLIENT,
      id: 'client-panel-rotated',
      name: 'Kitchen panel restored',
    };
    store.touchClient(PRINCIPAL, rotatedClient);

    const persisted = JSON.parse(readFileSync(store.getPaths().clientPreferences, 'utf8')) as {
      records: Record<string, { clientId: string }>;
    };
    const persistedPreference = persisted.records[`client-binding:${CLIENT_BINDING_A}`];
    if (!persistedPreference) {
      throw new Error('Expected the bound client preference to be persisted');
    }
    persistedPreference.clientId = BOUND_CLIENT.id;
    writeFileSync(store.getPaths().clientPreferences, JSON.stringify(persisted), 'utf8');

    expect(store.getPreference('client', PRINCIPAL, rotatedClient)).toMatchObject({
      clientId: rotatedClient.id,
      revision: 1,
      values: { compactMode: true },
    });
    expect(
      JSON.parse(readFileSync(store.getPaths().clientPreferences, 'utf8')).records[
        `client-binding:${CLIENT_BINDING_A}`
      ]
    ).toMatchObject({
      clientId: rotatedClient.id,
      revision: 1,
    });
  });

  it('rejects a new client when 200 active browser bindings are retained', () => {
    const store = createStore();
    for (let index = 0; index < 200; index += 1) {
      expect(
        store.touchClient(PRINCIPAL, {
          id: `client-panel-${String(index).padStart(3, '0')}`,
          name: `Panel ${index}`,
          kind: 'wall_panel',
          bindingId: index.toString(16).padStart(64, '0'),
        })
      ).not.toBeNull();
    }

    expect(() =>
      store.touchClient(PRINCIPAL, {
        id: 'client-panel-overflow',
        name: 'Overflow panel',
        kind: 'wall_panel',
        bindingId: 'f'.repeat(64),
      })
    ).toThrow('Dashboard client registry capacity reached');
    expect(store.listClients()).toHaveLength(200);
  });

  it('prunes valid stale client entries and their preferences', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
    store.savePreference('client', PRINCIPAL, 1, { lowPowerMode: true }, BOUND_CLIENT);

    vi.advanceTimersByTime(90 * 24 * 60 * 60 * 1_000 + 1);
    const replacement = {
      id: 'client-panel-replacement',
      name: 'Replacement panel',
      kind: 'wall_panel' as const,
      bindingId: 'c'.repeat(64),
    };
    store.touchClient(PRINCIPAL, replacement);

    expect(store.listClients()).toEqual([expect.objectContaining({ id: replacement.id })]);
    expect(store.getPreference('client', PRINCIPAL, BOUND_CLIENT)).toBeNull();
  });

  it('rejects aggregate client preference growth without mutating the prior collection', () => {
    const store = createStore();
    const largeViewModes = {
      'camera.large': 'x'.repeat(240_000),
    };
    for (let index = 0; index < 17; index += 1) {
      const client = {
        id: `client-panel-${String(index).padStart(3, '0')}`,
        name: `Panel ${index}`,
        kind: 'wall_panel' as const,
        bindingId: index.toString(16).padStart(64, '0'),
      };
      store.touchClient(PRINCIPAL, client);
      store.savePreference('client', PRINCIPAL, 1, { cameraViewModes: largeViewModes }, client);
    }
    const preferencesPath = store.getPaths().clientPreferences;
    const before = readFileSync(preferencesPath, 'utf8');
    const overflowClient = {
      id: 'client-panel-overflow',
      name: 'Overflow panel',
      kind: 'wall_panel' as const,
      bindingId: 'f'.repeat(64),
    };
    store.touchClient(PRINCIPAL, overflowClient);

    expect(() =>
      store.savePreference(
        'client',
        PRINCIPAL,
        1,
        { cameraViewModes: largeViewModes },
        overflowClient
      )
    ).toThrow('Dashboard client preference capacity reached');
    expect(readFileSync(preferencesPath, 'utf8')).toBe(before);
  });

  it('rejects a patch whose final profile exceeds the persisted profile limit', () => {
    const store = createStore();
    store.saveProfile(
      {
        ...PROFILE,
        primaryPayload: 'a'.repeat(600_000),
      },
      { author: AUTHOR }
    );
    const profileBefore = readFileSync(store.getPaths().profile, 'utf8');
    const stateBefore = readFileSync(store.getPaths().state, 'utf8');
    const historyBefore = readFileSync(store.getPaths().history, 'utf8');

    expect(() =>
      store.patchProfile(
        [
          {
            op: 'add',
            path: '/secondaryPayload',
            value: 'b'.repeat(600_000),
          },
        ],
        AUTHOR
      )
    ).toThrow('Dashboard profile is too large');
    expect(readFileSync(store.getPaths().profile, 'utf8')).toBe(profileBefore);
    expect(readFileSync(store.getPaths().state, 'utf8')).toBe(stateBefore);
    expect(readFileSync(store.getPaths().history, 'utf8')).toBe(historyBefore);
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

  it.each(['history', 'profile', 'state'] as const)(
    'keeps the prior commit authoritative when the %s atomic write fails',
    (failedPath) => {
      const store = createStore();
      store.saveProfile(PROFILE, { author: AUTHOR });
      const paths = store.getPaths();
      const blockedTemporaryPath = `${paths[failedPath]}.tmp`;
      mkdirSync(blockedTemporaryPath);

      expect(() =>
        store.saveProfile(
          {
            ...PROFILE,
            exportedAt: '2026-07-25T09:05:00.000Z',
            dashboard: { title: 'Bedroom' },
          },
          { author: AUTHOR }
        )
      ).toThrow('Dashboard profile commit could not be persisted');

      expect(store.getState()).toMatchObject({ revision: 1, status: 'active' });
      expect(store.getProfile()).toEqual(PROFILE);
      expect(store.getHistory().map((entry) => entry.revision)).toEqual([1]);

      rmSync(blockedTemporaryPath, { recursive: true });
      store.saveProfile(
        {
          ...PROFILE,
          exportedAt: '2026-07-25T09:10:00.000Z',
          dashboard: { title: 'Bedroom retry' },
        },
        { author: AUTHOR }
      );
      expect(store.getState()).toMatchObject({ revision: 2, status: 'active' });
      expect(store.getHistory().map((entry) => entry.revision)).toEqual([2, 1]);
    }
  );

  it('serves a digest-verified current profile without parsing corrupt secondary history', () => {
    const store = createStore();
    store.saveProfile(PROFILE, { author: AUTHOR });
    const stateBefore = readFileSync(store.getPaths().state, 'utf8');
    const profileBefore = readFileSync(store.getPaths().profile, 'utf8');
    writeFileSync(store.getPaths().history, '{truncated', 'utf8');

    expect(store.getProfile()).toEqual(PROFILE);
    expect(store.getRecovery()).toEqual({
      status: 'active',
      resetRevision: null,
      latestRecoverableRevision: 1,
    });
    expect(() =>
      store.saveProfile({ ...PROFILE, dashboard: { title: 'Must not commit' } }, { author: AUTHOR })
    ).toThrow('Dashboard profile storage cannot be read safely');
    expect(readFileSync(store.getPaths().state, 'utf8')).toBe(stateBefore);
    expect(readFileSync(store.getPaths().profile, 'utf8')).toBe(profileBefore);
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

  it('repairs a missing current file from committed history and preserves reset markers', () => {
    const store = createStore();
    store.saveProfile(PROFILE, { author: AUTHOR });
    unlinkSync(store.getPaths().profile);

    expect(store.getRecovery()).toEqual({
      status: 'active',
      resetRevision: null,
      latestRecoverableRevision: 1,
    });
    expect(store.getProfile()).toEqual(PROFILE);

    writeFileSync(store.getPaths().profile, JSON.stringify(PROFILE), 'utf8');
    store.resetProfile(AUTHOR);
    expect(store.getRecovery()).toEqual({
      status: 'reset',
      resetRevision: 2,
      latestRecoverableRevision: 1,
    });
  });

  it('repairs the active profile when reset is interrupted before state commit', () => {
    const store = createStore();
    store.saveProfile(PROFILE, { author: AUTHOR });
    const stateTemporaryPath = `${store.getPaths().state}.tmp`;
    mkdirSync(stateTemporaryPath);

    expect(() => store.resetProfile(AUTHOR)).toThrow(
      'Dashboard profile commit could not be persisted'
    );
    expect(store.getState()).toMatchObject({ revision: 1, status: 'active' });
    expect(store.getProfile()).toEqual(PROFILE);
    expect(store.getRecovery()).toEqual({
      status: 'active',
      resetRevision: null,
      latestRecoverableRevision: 1,
    });

    rmSync(stateTemporaryPath, { recursive: true });
    store.resetProfile(AUTHOR);
    expect(store.getState()).toMatchObject({
      revision: 2,
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
    store.touchClient(PRINCIPAL, BOUND_CLIENT);
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
      BOUND_CLIENT
    );

    expect(store.getPreference('account', PRINCIPAL)).toMatchObject({
      scope: 'account',
      values: { language: 'sv' },
      clientId: null,
    });
    expect(store.getPreference('client', PRINCIPAL, BOUND_CLIENT)).toMatchObject({
      scope: 'client',
      values: { keepDeviceAwake: true },
      clientId: 'client-panel-01',
    });
    expect(JSON.stringify(store.getPreference('account', PRINCIPAL))).not.toContain('private');
    expect(JSON.stringify(store.getPreference('client', PRINCIPAL, BOUND_CLIENT))).not.toContain(
      'private'
    );
    expect(JSON.stringify(store.getPreference('account', PRINCIPAL))).not.toContain(
      'cameraWebRtcStreamSources'
    );
    expect(JSON.stringify(store.getPreference('client', PRINCIPAL, BOUND_CLIENT))).not.toContain(
      'cameraWebRtcStreamSources'
    );

    const nextSession = {
      ...PRINCIPAL,
      sessionId: 'nas_session_two',
      userId: 'ha-user-2',
      userName: 'Other user',
    };
    expect(store.getPreference('account', nextSession)).toBeNull();
    expect(store.getPreference('client', nextSession, BOUND_CLIENT)).toMatchObject({
      scope: 'client',
      values: { keepDeviceAwake: true },
      clientId: 'client-panel-01',
    });

    expect(store.forgetClient(AUTHOR.id, BOUND_CLIENT)).toBe(true);
    expect(store.getPreference('client', nextSession, BOUND_CLIENT)).toBeNull();
  });
});

describe('Vite dashboard profile request handler', () => {
  it('ignores an unregistered generic profile cookie and migrates only registry-backed continuity', async () => {
    const cookieNames = createInstallationCookieNames('navet_profile_client', '1'.repeat(64));
    const store = createStore();
    const handler = createViteDashboardProfileRequestHandler({
      cookieNames,
      store,
      resolvePrincipal: () => PRINCIPAL,
    });
    const unrecognizedBinding = 'b'.repeat(64);
    const unknownOutput = createResponse();
    await handler(
      createRequest('GET', '/preferences/client', {
        'x-navet-client-id': 'client-unknown-cookie',
        'x-navet-client-name': 'Unknown cookie panel',
        'x-navet-client-kind': 'wall_panel',
        cookie: `navet_profile_client=${unrecognizedBinding}`,
      }),
      unknownOutput.response
    );
    expect(unknownOutput.status).toBe(204);
    expect(unknownOutput.header('set-cookie')).toMatch(new RegExp(`^${cookieNames.currentName}=`));
    expect(unknownOutput.header('set-cookie')).not.toContain(`=${unrecognizedBinding};`);

    const recognizedBinding = 'c'.repeat(64);
    expect(
      store.touchClient(
        PRINCIPAL,
        {
          id: 'client-legacy-continuity',
          name: 'Legacy continuity panel',
          kind: 'wall_panel',
          bindingId: recognizedBinding,
        },
        store.getState().revision
      )
    ).toMatchObject({ id: 'client-legacy-continuity' });
    const recognizedOutput = createResponse();
    await handler(
      createRequest('GET', '/preferences/client', {
        'x-navet-client-id': 'client-legacy-continuity',
        'x-navet-client-name': 'Legacy continuity panel',
        'x-navet-client-kind': 'wall_panel',
        cookie: `navet_profile_client=${recognizedBinding}`,
      }),
      recognizedOutput.response
    );
    expect(recognizedOutput.status).toBe(204);
    expect(recognizedOutput.header('set-cookie')).toContain(
      `${cookieNames.currentName}=${recognizedBinding};`
    );
  });

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

  it('requires an exact public origin for every profile mutation, including restore', async () => {
    const handler = createViteDashboardProfileRequestHandler({
      store: createStore(),
      resolvePrincipal: () => PRINCIPAL,
    });

    for (const [method, route] of [
      ['PUT', '/default'],
      ['PATCH', '/default'],
      ['DELETE', '/default'],
      ['POST', '/default/revisions/1/restore'],
      ['PUT', '/preferences/account'],
      ['DELETE', '/preferences/client'],
      ['PUT', '/clients'],
      ['DELETE', '/clients/client-panel-01'],
    ]) {
      for (const origin of ['', 'http://sibling.navet.example']) {
        const output = createResponse();
        await handler(createRequest(method, route, { origin }), output.response);
        expect(output.status, `${method} ${route} from ${origin || 'no origin'}`).toBe(403);
        expect(JSON.parse(output.body)).toEqual({
          error: 'Cross-origin profile mutation is not allowed',
        });
      }
    }
  });

  it('bounds and expires persisted cold-client bootstrap bindings without storing session data', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T09:00:00.000Z'));
    const store = createStore();
    const handler = createViteDashboardProfileRequestHandler({
      store,
      resolvePrincipal: () => PRINCIPAL,
    });

    for (let index = 0; index < 260; index += 1) {
      const output = createResponse();
      await handler(
        createRequest('GET', '/preferences/client', {
          'x-navet-client-id': `client-panel-${String(index).padStart(3, '0')}`,
          'x-navet-client-name': 'Cold panel',
          'x-navet-client-kind': 'wall_panel',
          'user-agent': 'Navet bootstrap bounds test',
          'x-forwarded-for': '192.0.2.10',
        }),
        output.response
      );
      expect(output.status).toBe(index < 200 ? 204 : 503);
      if (index >= 200) {
        expect(output.header('x-navet-profile-error-code')).toBe('client-capacity-reached');
        expect(output.header('retry-after')).toBe('60');
      }
    }

    const persisted = readFileSync(store.getPaths().clientBindingBootstrap, 'utf8');
    const collection = JSON.parse(persisted) as {
      records: Array<{ key: string; bindingId: string; expiresAt: number }>;
    };
    expect(collection.records).toHaveLength(256);
    expect(persisted).not.toContain(PRINCIPAL.sessionId);
    expect(persisted).not.toContain('Navet bootstrap bounds test');
    expect(persisted).not.toContain('192.0.2.10');

    vi.advanceTimersByTime(90 * 24 * 60 * 60 * 1_000 + 1);
    const afterExpiry = createResponse();
    await handler(
      createRequest('GET', '/preferences/client', {
        'x-navet-client-id': 'client-panel-after-expiry',
        'x-navet-client-name': 'New panel',
        'x-navet-client-kind': 'wall_panel',
      }),
      afterExpiry.response
    );

    expect(afterExpiry.status).toBe(204);
    expect(
      (
        JSON.parse(readFileSync(store.getPaths().clientBindingBootstrap, 'utf8')) as {
          records: unknown[];
        }
      ).records
    ).toHaveLength(1);
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

    const history = createResponse();
    await handler(createRequest('GET', '/default/history'), history.response);
    const historyPayload = JSON.parse(history.body);
    expect(historyPayload.workspace).not.toHaveProperty('tenantBinding');
    expect(history.body).not.toContain(HA_TENANT_ID);

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

  it('rechecks profile and preference revisions after asynchronous request bodies', async () => {
    const store = createStore();
    const handler = createViteDashboardProfileRequestHandler({
      store,
      resolvePrincipal: () => PRINCIPAL,
    });
    const profileHeaders = {
      ...CLIENT_HEADERS,
      'content-type': 'application/json',
      'x-navet-base-revision': '0',
    };
    const firstProfile = createDeferredRequest(
      'PUT',
      '/default',
      profileHeaders,
      JSON.stringify(PROFILE)
    );
    const secondProfile = createDeferredRequest(
      'PUT',
      '/default',
      profileHeaders,
      JSON.stringify({
        ...PROFILE,
        dashboard: { title: 'Stale overwrite' },
      })
    );
    const firstProfileOutput = createResponse();
    const secondProfileOutput = createResponse();
    const firstProfileResult = handler(firstProfile.request, firstProfileOutput.response);
    const secondProfileResult = handler(secondProfile.request, secondProfileOutput.response);

    await Promise.all([firstProfile.bodyRead, secondProfile.bodyRead]);
    firstProfile.releaseBody();
    await firstProfileResult;
    secondProfile.releaseBody();
    await secondProfileResult;

    expect(firstProfileOutput.status).toBe(200);
    expect(secondProfileOutput.status).toBe(412);
    expect(store.getState().revision).toBe(1);
    expect(store.getProfile()?.dashboard).toEqual({ title: 'Kitchen' });

    const preferenceHeaders = {
      ...CLIENT_HEADERS,
      'content-type': 'application/json',
      'x-navet-base-revision': '0',
    };
    const firstPreference = createDeferredRequest(
      'PUT',
      '/preferences/client',
      preferenceHeaders,
      JSON.stringify({
        schemaVersion: 1,
        values: { keepDeviceAwake: true },
      })
    );
    const secondPreference = createDeferredRequest(
      'PUT',
      '/preferences/client',
      preferenceHeaders,
      JSON.stringify({
        schemaVersion: 1,
        values: { keepDeviceAwake: false },
      })
    );
    const firstPreferenceOutput = createResponse();
    const secondPreferenceOutput = createResponse();
    const firstPreferenceResult = handler(firstPreference.request, firstPreferenceOutput.response);
    const secondPreferenceResult = handler(
      secondPreference.request,
      secondPreferenceOutput.response
    );

    await Promise.all([firstPreference.bodyRead, secondPreference.bodyRead]);
    firstPreference.releaseBody();
    await firstPreferenceResult;
    secondPreference.releaseBody();
    await secondPreferenceResult;

    expect(firstPreferenceOutput.status).toBe(200);
    expect(secondPreferenceOutput.status).toBe(412);
    expect(store.getPreference('client', PRINCIPAL, BOUND_CLIENT)).toMatchObject({
      revision: 1,
      values: { keepDeviceAwake: true },
    });
  });
});
