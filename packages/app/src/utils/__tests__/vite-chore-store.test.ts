import { mkdtempSync, rmSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createViteChoreStoreRequestHandler } from '@scripts/vite-chore-store';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TENANT_ID = `hat_${'a'.repeat(64)}`;
const PRINCIPAL = {
  providerId: 'home_assistant',
  tenantId: TENANT_ID,
  sessionId: 'nas_chore_test',
  userId: 'ha-user-1',
  userName: 'Vishal',
};
const tempDirs: string[] = [];

function createRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body = ''
) {
  return {
    method,
    url,
    headers: { host: 'navet.example', origin: 'http://navet.example', ...headers },
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
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

function commandBody(commandId: string, baseRevision: number) {
  return JSON.stringify({
    commandId,
    baseRevision,
    data: {
      schemaVersion: 1,
      participantsById: {},
      definitionsById: {},
      occurrencesById: {},
      activity: [
        {
          id: `activity:${commandId}`,
          commandId,
          occurrenceId: 'occurrence-1',
          definitionId: 'definition-1',
          type: 'completed',
          timestamp: '2026-08-10T08:00:00.000Z',
        },
      ],
    },
  });
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('Vite chore workspace store', () => {
  it('mirrors revision, conditional reads, conflict, and idempotency behavior', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const handler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'chores.json'),
      resolvePrincipal: () => PRINCIPAL,
    });

    const initial = createResponse();
    await handler(createRequest('GET', '/workspace'), initial.response);
    expect(initial.status).toBe(200);
    expect(JSON.parse(initial.body).revision).toBe(0);

    const committed = createResponse();
    await handler(
      createRequest('POST', '/commands', { 'x-navet-base-revision': '0' }, commandBody('one', 0)),
      committed.response
    );
    expect(committed.status).toBe(200);
    expect(JSON.parse(committed.body).revision).toBe(1);

    const unchanged = createResponse();
    await handler(
      createRequest('GET', '/workspace', { 'x-navet-chore-revision': '1' }),
      unchanged.response
    );
    expect(unchanged.status).toBe(304);

    const stale = createResponse();
    await handler(
      createRequest('POST', '/commands', { 'x-navet-base-revision': '0' }, commandBody('two', 0)),
      stale.response
    );
    expect(stale.status).toBe(412);

    const retry = createResponse();
    await handler(
      createRequest('POST', '/commands', { 'x-navet-base-revision': '0' }, commandBody('one', 0)),
      retry.response
    );
    expect(retry.status).toBe(200);
    expect(JSON.parse(retry.body).revision).toBe(1);
  });

  it('returns client errors for invalid JSON and cross-origin writes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const handler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'chores.json'),
      resolvePrincipal: () => PRINCIPAL,
    });

    const invalid = createResponse();
    await handler(
      createRequest('POST', '/commands', { 'x-navet-base-revision': '0' }, '{'),
      invalid.response
    );
    expect(invalid.status).toBe(400);

    const crossOrigin = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { origin: 'https://attacker.example', 'x-navet-base-revision': '0' },
        commandBody('one', 0)
      ),
      crossOrigin.response
    );
    expect(crossOrigin.status).toBe(403);
  });
});
