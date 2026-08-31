import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

const fixtureTimestamp = '2026-08-10T08:00:00.000Z';
const fixtureDefinition = {
  id: 'dishes',
  title: 'Empty dishes',
  enabled: true,
  assignment: { mode: 'person' as const, participantIds: ['maya'] },
  schedule: {
    frequency: 'once' as const,
    date: '2026-08-10',
    time: '10:00',
    timeZone: 'UTC',
  },
  dueWindowMinutes: 120,
  approval: { required: false, approverIds: [] },
  createdAt: fixtureTimestamp,
  updatedAt: fixtureTimestamp,
};
const OCCURRENCE_ID = 'dishes:2026-08-10T10:00:00.000Z:maya';

function participantActionBody(commandId: string, baseRevision: number, id = 'maya') {
  return JSON.stringify({
    commandId,
    baseRevision,
    action: {
      type: 'participant_create',
      participant: {
        id,
        displayName: id === 'maya' ? 'Maya' : 'Sofia',
        capabilities: ['complete', 'approve', 'manage'],
        createdAt: fixtureTimestamp,
        updatedAt: fixtureTimestamp,
      },
    },
  });
}

function definitionActionBody(commandId: string, baseRevision: number) {
  return JSON.stringify({
    commandId,
    baseRevision,
    action: {
      type: 'definition_create',
      actorParticipantId: 'maya',
      definition: fixtureDefinition,
    },
  });
}

function experienceActionBody(commandId: string, baseRevision: number) {
  return JSON.stringify({
    commandId,
    baseRevision,
    action: {
      type: 'experience_update',
      actorParticipantId: 'maya',
      experience: {
        version: 1,
        setupStartedAt: fixtureTimestamp,
        gamificationMode: 'off',
        presentationByDefinitionId: {},
        missionsById: {},
        rewardGoalsById: {},
        earnedPointsByParticipant: {},
        householdBonusPoints: 0,
        awardedMissionIds: [],
      },
    },
  });
}

function materializeActionBody(commandId: string, baseRevision: number) {
  return JSON.stringify({
    commandId,
    baseRevision,
    action: {
      type: 'materialize_occurrences',
      rangeStart: '2026-08-10T00:00:00.000Z',
      rangeEnd: '2026-08-11T00:00:00.000Z',
    },
  });
}

function occurrenceActionBody(commandId: string, baseRevision: number) {
  return JSON.stringify({
    commandId,
    baseRevision,
    action: {
      type: 'occurrence_action',
      occurrenceId: OCCURRENCE_ID,
      action: { type: 'complete', participantId: 'maya' },
    },
  });
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('Vite chore workspace store', () => {
  it('reports authenticated standalone runtime capabilities', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const handler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'chores.json'),
      resolvePrincipal: () => PRINCIPAL,
    });

    const capabilities = createResponse();
    await handler(createRequest('GET', '/capabilities'), capabilities.response);

    expect(capabilities.status).toBe(200);
    expect(JSON.parse(capabilities.body)).toEqual({
      contractVersion: 1,
      schemaVersion: 2,
      authority: 'standalone',
      backgroundScheduling: false,
      backgroundNotifications: false,
      projectionOwnedByAuthority: false,
      actionServices: false,
    });

    const unauthorizedHandler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'unauthorized-chores.json'),
      resolvePrincipal: () => null,
    });
    const unauthorized = createResponse();
    await unauthorizedHandler(createRequest('GET', '/capabilities'), unauthorized.response);

    expect(unauthorized.status).toBe(401);
    expect(JSON.parse(unauthorized.body)).toEqual({ error: 'Authentication required' });
  });

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
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('one', 0)
      ),
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
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('two', 0, 'sofia')
      ),
      stale.response
    );
    expect(stale.status).toBe(412);

    const retry = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('one', 0)
      ),
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
        participantActionBody('one', 0)
      ),
      crossOrigin.response
    );
    expect(crossOrigin.status).toBe(403);
  });

  it('keeps setup experience data readable after it is committed', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const handler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'chores.json'),
      resolvePrincipal: () => PRINCIPAL,
    });

    const participant = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('create-manager', 0)
      ),
      participant.response
    );
    expect(participant.status).toBe(200);

    const experience = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '1' },
        experienceActionBody('start-setup', 1)
      ),
      experience.response
    );
    expect(experience.status).toBe(200);

    const reloaded = createResponse();
    await handler(createRequest('GET', '/workspace'), reloaded.response);
    expect(reloaded.status).toBe(200);
    expect(JSON.parse(reloaded.body)).toMatchObject({
      revision: 2,
      data: {
        experience: { setupStartedAt: fixtureTimestamp },
        activity: [
          { type: 'participant_created' },
          { type: 'experience_updated', actorParticipantId: 'maya' },
        ],
      },
    });
  });

  it('applies occurrence actions against authoritative stored state', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const handler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'chores.json'),
      resolvePrincipal: () => PRINCIPAL,
    });

    const participant = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('participant', 0)
      ),
      participant.response
    );
    expect(participant.status).toBe(200);

    const definition = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '1' },
        definitionActionBody('definition', 1)
      ),
      definition.response
    );
    expect(definition.status).toBe(200);

    const materialize = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '2' },
        materializeActionBody('materialize', 2)
      ),
      materialize.response
    );
    expect(materialize.status).toBe(200);

    const complete = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '3' },
        occurrenceActionBody('complete', 3)
      ),
      complete.response
    );

    const completedDocument = JSON.parse(complete.body);
    expect(complete.status).toBe(200);
    expect(completedDocument.revision).toBe(4);
    expect(completedDocument.data.occurrencesById[OCCURRENCE_ID]).toMatchObject({
      status: 'done',
      completedBy: 'maya',
    });
    expect(completedDocument.data.activity.at(-1)).toMatchObject({
      commandId: 'complete',
      type: 'completed',
      actorParticipantId: 'maya',
    });
    expect(completedDocument.data.outbox.at(-1)).toMatchObject({
      activityId: 'activity:complete',
      eventType: 'completed',
      status: 'pending',
    });

    const replay = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '3' },
        occurrenceActionBody('complete', 3)
      ),
      replay.response
    );
    expect(replay.status).toBe(200);
    expect(JSON.parse(replay.body).revision).toBe(4);

    const history = createResponse();
    await handler(createRequest('GET', '/history'), history.response);
    expect(history.status).toBe(200);
    expect(JSON.parse(history.body).events.map((event: { type: string }) => event.type)).toEqual([
      'participant_created',
      'definition_created',
      'occurrence_created',
      'due',
      'overdue',
      'workspace_materialized',
      'completed',
    ]);

    const backup = createResponse();
    await handler(createRequest('GET', '/backup'), backup.response);
    expect(JSON.parse(backup.body)).toMatchObject({
      contract: 'navet.chores',
      version: 1,
      workspace: { schemaVersion: 2 },
    });
    expect(JSON.parse(backup.body).events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'participant_created' })])
    );

    const reset = createResponse();
    await handler(
      createRequest(
        'POST',
        '/reset',
        { 'x-navet-base-revision': '4' },
        JSON.stringify({
          commandId: 'reset-all',
          baseRevision: 4,
          actorParticipantId: 'maya',
          confirmation: 'DELETE ALL CHORES',
        })
      ),
      reset.response
    );
    expect(JSON.parse(reset.body)).toMatchObject({
      revision: 5,
      data: { participantsById: {}, definitionsById: {}, occurrencesById: {} },
    });

    const restore = createResponse();
    await handler(
      createRequest(
        'POST',
        '/restore',
        { 'x-navet-base-revision': '5' },
        JSON.stringify({
          commandId: 'restore-all',
          baseRevision: 5,
          actorParticipantId: 'maya',
          mode: 'replace',
          document: JSON.parse(backup.body),
        })
      ),
      restore.response
    );
    expect(JSON.parse(restore.body)).toMatchObject({
      revision: 6,
      data: {
        participantsById: { maya: { displayName: 'Maya' } },
        definitionsById: { dishes: { title: 'Empty dishes' } },
      },
    });

    const definitions = createResponse();
    await handler(createRequest('GET', '/definitions'), definitions.response);
    expect(JSON.parse(definitions.body)).toMatchObject({
      contractVersion: 1,
      revision: 6,
      definitions: [{ id: 'dishes', title: 'Empty dishes' }],
    });

    const occurrences = createResponse();
    await handler(
      createRequest('GET', '/occurrences?participantId=maya&definitionId=dishes'),
      occurrences.response
    );
    expect(JSON.parse(occurrences.body).occurrences).toEqual([
      expect.objectContaining({ id: OCCURRENCE_ID, status: 'done' }),
    ]);

    const firstEvents = createResponse();
    await handler(createRequest('GET', '/events?after=0&limit=2'), firstEvents.response);
    expect(JSON.parse(firstEvents.body)).toMatchObject({
      contractVersion: 1,
      cursor: '4',
      hasMore: true,
      events: [
        expect.objectContaining({ type: 'occurrence_created' }),
        expect.objectContaining({ type: 'due' }),
      ],
    });

    const nextEvents = createResponse();
    await handler(
      createRequest('GET', `/events?after=${JSON.parse(firstEvents.body).cursor}`),
      nextEvents.response
    );
    expect(JSON.parse(nextEvents.body).events.map((event: { type: string }) => event.type)).toEqual(
      ['overdue', 'completed']
    );
  });

  it('protects management mutations after a PIN is configured', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const handler = createViteChoreStoreRequestHandler({
      filePath: join(directory, 'chores.json'),
      resolvePrincipal: () => PRINCIPAL,
    });

    const participant = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('participant', 0)
      ),
      participant.response
    );

    const configure = createResponse();
    await handler(
      createRequest(
        'POST',
        '/management/pin',
        {},
        JSON.stringify({ actorParticipantId: 'maya', pin: '2468' })
      ),
      configure.response
    );
    expect(configure.status).toBe(200);

    const workspace = createResponse();
    await handler(createRequest('GET', '/workspace'), workspace.response);
    expect(JSON.parse(workspace.body).management).toEqual({ pinConfigured: true });

    const blocked = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '1' },
        definitionActionBody('blocked-definition', 1)
      ),
      blocked.response
    );
    expect(blocked.status).toBe(403);

    const verify = createResponse();
    await handler(
      createRequest('POST', '/management/verify', {}, JSON.stringify({ pin: '2468' })),
      verify.response
    );
    const managementSession = JSON.parse(verify.body).sessionToken;
    expect(verify.status).toBe(200);
    expect(managementSession).toEqual(expect.any(String));

    const allowed = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        {
          'x-navet-base-revision': '1',
          'x-navet-chore-management-session': managementSession,
        },
        definitionActionBody('allowed-definition', 1)
      ),
      allowed.response
    );
    expect(allowed.status).toBe(200);

    const remove = createResponse();
    await handler(
      createRequest(
        'DELETE',
        '/management/pin',
        { 'x-navet-chore-management-session': managementSession },
        JSON.stringify({ actorParticipantId: 'maya' })
      ),
      remove.response
    );
    expect(remove.status).toBe(200);
    expect(JSON.parse(remove.body)).toEqual({ pinConfigured: false });

    const unprotected = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '2' },
        experienceActionBody('unprotected-experience', 2)
      ),
      unprotected.response
    );
    expect(unprotected.status).toBe(200);
  });

  it('migrates a persisted schema version 1 workspace before serving it', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const filePath = join(directory, 'chores.json');
    writeFileSync(
      filePath,
      JSON.stringify({
        contractVersion: 1,
        tenantId: TENANT_ID,
        revision: 4,
        updatedAt: '2026-08-10T08:00:00.000Z',
        data: {
          schemaVersion: 1,
          participantsById: {},
          definitionsById: {},
          occurrencesById: {},
          activity: [],
        },
      })
    );
    const handler = createViteChoreStoreRequestHandler({
      filePath,
      resolvePrincipal: () => PRINCIPAL,
    });

    const response = createResponse();
    await handler(createRequest('GET', '/workspace'), response.response);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      revision: 5,
      data: { schemaVersion: 2, outbox: [] },
    });
  });

  it('rebuilds damaged event history without taking the workspace offline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const filePath = join(directory, 'chores.json');
    const handler = createViteChoreStoreRequestHandler({
      filePath,
      resolvePrincipal: () => PRINCIPAL,
    });

    const createPerson = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('person-before-history-error', 0)
      ),
      createPerson.response
    );
    writeFileSync(`${filePath}.events`, '{');

    const loaded = createResponse();
    await handler(createRequest('GET', '/workspace'), loaded.response);

    expect(loaded.status).toBe(200);
    expect(JSON.parse(loaded.body)).toMatchObject({
      data: { participantsById: { maya: { displayName: 'Maya' } } },
    });
  });

  it('restores the last healthy workspace when the primary file is damaged', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const filePath = join(directory, 'chores.json');
    const handler = createViteChoreStoreRequestHandler({
      filePath,
      resolvePrincipal: () => PRINCIPAL,
    });

    const first = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '0' },
        participantActionBody('first-person', 0)
      ),
      first.response
    );
    const second = createResponse();
    await handler(
      createRequest(
        'POST',
        '/commands',
        { 'x-navet-base-revision': '1' },
        JSON.stringify({
          commandId: 'second-person',
          baseRevision: 1,
          action: {
            type: 'participant_create',
            actorParticipantId: 'maya',
            participant: {
              id: 'sofia',
              displayName: 'Sofia',
              capabilities: ['complete'],
              createdAt: fixtureTimestamp,
              updatedAt: fixtureTimestamp,
            },
          },
        })
      ),
      second.response
    );
    expect(second.status).toBe(200);
    writeFileSync(filePath, '{');

    const loaded = createResponse();
    await handler(createRequest('GET', '/workspace'), loaded.response);

    expect(loaded.status).toBe(200);
    expect(JSON.parse(loaded.body)).toMatchObject({
      revision: 2,
      data: { participantsById: { maya: { displayName: 'Maya' } } },
    });
    expect(JSON.parse(loaded.body).data.participantsById).not.toHaveProperty('sofia');
  });

  it('offers an explicit start-over recovery when no healthy copy exists', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'navet-chore-store-'));
    tempDirs.push(directory);
    const filePath = join(directory, 'chores.json');
    writeFileSync(filePath, '{');
    const handler = createViteChoreStoreRequestHandler({
      filePath,
      resolvePrincipal: () => PRINCIPAL,
    });

    const unavailable = createResponse();
    await handler(createRequest('GET', '/workspace'), unavailable.response);
    expect(unavailable.status).toBe(503);
    expect(JSON.parse(unavailable.body)).toMatchObject({
      recovery: { backupAvailable: false, pinConfigured: false, reason: 'workspace_invalid' },
    });

    const recovered = createResponse();
    await handler(
      createRequest(
        'POST',
        '/recovery',
        {},
        JSON.stringify({ action: 'reset', confirmation: 'RESET CHORES' })
      ),
      recovered.response
    );
    expect(recovered.status).toBe(200);
    expect(JSON.parse(recovered.body)).toMatchObject({
      revision: 0,
      data: { participantsById: {}, definitionsById: {} },
    });
  });
});
