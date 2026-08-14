import choreStore from '@docker/njs/chore-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const WORKSPACE_PATH = '/data/navet-dashboard-workspace.json';
const CHORE_PATH = '/data/navet-chore-workspace.json';
const JOURNAL_PATH = '/data/navet-chore-command-journal.json';
const TENANT_ID = `hat_${'a'.repeat(64)}`;
const PRINCIPAL = {
  providerId: 'home_assistant',
  tenantId: TENANT_ID,
  sessionId: 'nas_chore_test',
  userId: 'ha-user-1',
  userName: 'Vishal',
};

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
    uri: '/__navet_chores__/workspace',
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

function createMockFs() {
  const files = new Map<string, string>();
  const missing = (path: string) => {
    const error = new Error(`ENOENT: ${path}`);
    // @ts-expect-error test-only file-system error shape
    error.code = 'ENOENT';
    return error;
  };
  return {
    statSync: vi.fn((path: string) => {
      const value = files.get(path);
      if (value === undefined) throw missing(path);
      return { size: value.length };
    }),
    readFileSync: vi.fn((path: string) => {
      const value = files.get(path);
      if (value === undefined) throw missing(path);
      return value;
    }),
    writeFileSync: vi.fn((path: string, value: string) => files.set(path, value)),
    renameSync: vi.fn((source: string, destination: string) => {
      const value = files.get(source);
      if (value === undefined) throw missing(source);
      files.set(destination, value);
      files.delete(source);
    }),
    getFile: (path: string) => files.get(path),
  };
}

function emptyData(commandId?: string) {
  return {
    schemaVersion: 1,
    participantsById: {},
    definitionsById: {},
    occurrencesById: {},
    activity: commandId
      ? [
          {
            id: `activity:${commandId}`,
            commandId,
            occurrenceId: 'occurrence-1',
            definitionId: 'definition-1',
            type: 'completed',
            timestamp: '2026-08-10T08:00:00.000Z',
          },
        ]
      : [],
  };
}

function parseResponse(request: ReturnType<typeof createRequest>) {
  const body = request.return.mock.calls.at(-1)?.[1];
  return typeof body === 'string' ? JSON.parse(body) : null;
}

afterEach(() => {
  choreStore.resetChoreStoreForTests();
  vi.restoreAllMocks();
});

describe('NJS chore workspace store', () => {
  it('requires authentication and only trusts ingress in its explicit handler', () => {
    choreStore.setChoreStoreFsForTests(createMockFs());
    choreStore.setChoreStorePrincipalResolverForTests((_request, options) =>
      options.trustIngressHeaders ? PRINCIPAL : null
    );

    const normal = createRequest();
    choreStore.handle(normal);
    expect(normal.return).toHaveBeenCalledWith(
      401,
      JSON.stringify({ error: 'Authentication required' })
    );

    const ingress = createRequest();
    choreStore.handleIngress(ingress);
    expect(ingress.return).toHaveBeenCalledWith(200, expect.any(String));
  });

  it('commits once, rejects stale writes, and makes retries idempotent', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    const commandId = 'command-1';
    const first = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '0' },
      requestText: JSON.stringify({
        commandId,
        baseRevision: 0,
        data: emptyData(commandId),
      }),
    });
    choreStore.handle(first);
    expect(first.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(first).revision).toBe(1);
    expect(mockFs.getFile(WORKSPACE_PATH)).toBeDefined();
    expect(mockFs.getFile(CHORE_PATH)).toBeDefined();
    expect(mockFs.getFile(JOURNAL_PATH)).toBeDefined();

    const stale = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '0' },
      requestText: JSON.stringify({
        commandId: 'command-2',
        baseRevision: 0,
        data: emptyData('command-2'),
      }),
    });
    choreStore.handle(stale);
    expect(stale.return).toHaveBeenCalledWith(412, expect.any(String));

    const retry = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '0' },
      requestText: first.requestText,
    });
    choreStore.handle(retry);
    expect(retry.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(retry).revision).toBe(1);
  });

  it('rejects cross-origin mutations before changing workspace data', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    const request = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: {
        Origin: 'https://attacker.example',
        'X-Navet-Base-Revision': '0',
      },
      requestText: JSON.stringify({
        commandId: 'command-1',
        baseRevision: 0,
        data: emptyData('command-1'),
      }),
    });

    choreStore.handle(request);
    expect(request.return).toHaveBeenCalledWith(403, expect.any(String));
    expect(mockFs.getFile(CHORE_PATH)).toBeUndefined();
  });
});
