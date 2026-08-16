import choreStore from '@docker/njs/chore-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const WORKSPACE_PATH = '/data/navet-dashboard-workspace.json';
const CHORE_PATH = '/data/navet-chore-workspace.json';
const CHORE_LAST_GOOD_PATH = '/data/navet-chore-workspace.last-good.json';
const JOURNAL_PATH = '/data/navet-chore-command-journal.json';
const EVENT_HISTORY_PATH = '/data/navet-chore-events.json';
const OCCURRENCE_ID = 'dishes:2026-08-10T10:00:00.000Z:maya';
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
    args: string;
    headersIn: Record<string, string>;
    requestText: string;
  }> = {}
) {
  return {
    method: 'GET',
    uri: '/__navet_chores__/workspace',
    headersOut: {} as Record<string, string>,
    requestText: '',
    args: '',
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
    unlinkSync: vi.fn((path: string) => {
      if (!files.delete(path)) throw missing(path);
    }),
    getFile: (path: string) => files.get(path),
  };
}

function seededData(commandId: string) {
  const timestamp = '2026-08-10T08:00:00.000Z';
  return {
    schemaVersion: 2,
    participantsById: {
      maya: {
        id: 'maya',
        displayName: 'Maya',
        capabilities: ['complete'],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    definitionsById: {
      dishes: {
        id: 'dishes',
        title: 'Empty dishes',
        enabled: true,
        assignment: { mode: 'person', participantIds: ['maya'] },
        schedule: {
          frequency: 'once',
          date: '2026-08-10',
          time: '10:00',
          timeZone: 'UTC',
        },
        dueWindowMinutes: 120,
        approval: { required: false, approverIds: [] },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    occurrencesById: {
      [OCCURRENCE_ID]: {
        id: OCCURRENCE_ID,
        definitionId: 'dishes',
        scheduledAt: '2026-08-10T10:00:00.000Z',
        dueAt: '2026-08-10T12:00:00.000Z',
        assigneeIds: ['maya'],
        assignmentSlot: 'maya',
        status: 'available',
        updatedAt: timestamp,
      },
    },
    activity: [
      {
        id: `activity:${commandId}`,
        commandId,
        type: 'workspace_materialized',
        timestamp,
      },
    ],
    outbox: [],
  };
}

function parseResponse(request: ReturnType<typeof createRequest>) {
  const body = request.return.mock.calls.at(-1)?.[1];
  return typeof body === 'string' ? JSON.parse(body) : null;
}

function createActionRequest(
  commandId: string,
  baseRevision: number,
  action: Record<string, unknown>
) {
  return createRequest({
    method: 'POST',
    uri: '/__navet_chores__/commands',
    headersIn: { 'X-Navet-Base-Revision': String(baseRevision) },
    requestText: JSON.stringify({ commandId, baseRevision, action }),
  });
}

function managerParticipant(id = 'maya') {
  return {
    id,
    displayName: id === 'maya' ? 'Maya' : 'Sofia',
    capabilities: ['complete', 'approve', 'manage'],
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-10T08:00:00.000Z',
  };
}

function seedOccurrenceWorkspace() {
  const source = seededData('unused');
  const participant = createActionRequest('participant', 0, {
    type: 'participant_create',
    participant: managerParticipant(),
  });
  choreStore.handle(participant);
  const definition = createActionRequest('definition', 1, {
    type: 'definition_create',
    actorParticipantId: 'maya',
    definition: source.definitionsById.dishes,
  });
  choreStore.handle(definition);
  const materialize = createActionRequest('materialize', 2, {
    type: 'materialize_occurrences',
    rangeStart: '2026-08-10T00:00:00.000Z',
    rangeEnd: '2026-08-11T00:00:00.000Z',
  });
  choreStore.handle(materialize);
}

afterEach(() => {
  choreStore.resetChoreStoreForTests();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('NJS chore workspace store', () => {
  it('resolves daylight-saving offsets without unavailable packaged APIs', () => {
    expect(
      choreStore.getNjsTimeZoneOffsetMinutesForTests(
        Date.parse('2026-08-01T12:00:00.000Z'),
        'Europe/Stockholm'
      )
    ).toBe(120);
    expect(
      choreStore.getNjsTimeZoneOffsetMinutesForTests(
        Date.parse('2026-01-01T12:00:00.000Z'),
        'Europe/Stockholm'
      )
    ).toBe(60);
    expect(
      choreStore.getNjsTimeZoneOffsetMinutesForTests(
        Date.parse('2026-07-01T12:00:00.000Z'),
        'America/New_York'
      )
    ).toBe(-240);
    expect(() =>
      choreStore.getNjsTimeZoneOffsetMinutesForTests(
        Date.parse('2026-08-01T12:00:00.000Z'),
        'Atlantic/Unsupported'
      )
    ).toThrow(/Unsupported chore time zone/);
  });

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
    const first = createActionRequest(commandId, 0, {
      type: 'participant_create',
      participant: managerParticipant(),
    });
    choreStore.handle(first);
    expect(first.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(first).revision).toBe(1);
    expect(mockFs.getFile(WORKSPACE_PATH)).toBeDefined();
    expect(mockFs.getFile(CHORE_PATH)).toBeDefined();
    expect(mockFs.getFile(JOURNAL_PATH)).toBeDefined();
    expect(mockFs.getFile(EVENT_HISTORY_PATH)).toBeDefined();

    const stale = createActionRequest('command-2', 0, {
      type: 'participant_create',
      participant: managerParticipant('sofia'),
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

    const history = createRequest({ uri: '/__navet_chores__/history' });
    choreStore.handle(history);
    expect(history.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(history).events).toEqual([
      expect.objectContaining({ commandId, type: 'participant_created' }),
    ]);
  });

  it('rebuilds damaged sidecars and restores the last healthy workspace', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    const first = createActionRequest('first-person', 0, {
      type: 'participant_create',
      participant: managerParticipant(),
    });
    choreStore.handle(first);
    mockFs.writeFileSync(EVENT_HISTORY_PATH, '{');

    const second = createActionRequest('second-person', 1, {
      type: 'participant_create',
      actorParticipantId: 'maya',
      participant: {
        ...managerParticipant('sofia'),
        capabilities: ['complete'],
      },
    });
    choreStore.handle(second);
    expect(second.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(mockFs.getFile(CHORE_LAST_GOOD_PATH)).toBeDefined();

    mockFs.writeFileSync(CHORE_PATH, '{');
    const loaded = createRequest();
    choreStore.handle(loaded);

    expect(loaded.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(loaded)).toMatchObject({
      revision: 2,
      data: { participantsById: { maya: { displayName: 'Maya' } } },
    });
    expect(parseResponse(loaded).data.participantsById).not.toHaveProperty('sofia');
  });

  it('returns recovery details and can start over from an unreadable workspace', () => {
    const mockFs = createMockFs();
    mockFs.writeFileSync(CHORE_PATH, '{');
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    const unavailable = createRequest();
    choreStore.handle(unavailable);
    expect(unavailable.return).toHaveBeenCalledWith(503, expect.any(String));
    expect(parseResponse(unavailable)).toMatchObject({
      recovery: { backupAvailable: false, pinConfigured: false, reason: 'workspace_invalid' },
    });

    const recovered = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/recovery',
      requestText: JSON.stringify({ action: 'reset', confirmation: 'RESET CHORES' }),
    });
    choreStore.handle(recovered);
    expect(recovered.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(recovered)).toMatchObject({
      revision: 0,
      data: { participantsById: {}, definitionsById: {} },
    });
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
        action: {
          type: 'participant_create',
          participant: managerParticipant(),
        },
      }),
    });

    choreStore.handle(request);
    expect(request.return).toHaveBeenCalledWith(403, expect.any(String));
    expect(mockFs.getFile(CHORE_PATH)).toBeUndefined();
  });

  it('applies occurrence actions against authoritative stored state', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    seedOccurrenceWorkspace();

    const actionBody = JSON.stringify({
      commandId: 'complete',
      baseRevision: 3,
      action: {
        type: 'occurrence_action',
        occurrenceId: OCCURRENCE_ID,
        action: { type: 'complete', participantId: 'maya' },
      },
    });
    const complete = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '3' },
      requestText: actionBody,
    });
    choreStore.handle(complete);

    const completedDocument = parseResponse(complete);
    expect(complete.return).toHaveBeenCalledWith(200, expect.any(String));
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

    const retry = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '3' },
      requestText: actionBody,
    });
    choreStore.handle(retry);
    expect(parseResponse(retry).revision).toBe(4);
  });

  it('serves definitions, filtered occurrences, and cursor-based lifecycle events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T13:00:00.000Z'));
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    seedOccurrenceWorkspace();

    const definitions = createRequest({ uri: '/__navet_chores__/definitions' });
    choreStore.handle(definitions);
    expect(parseResponse(definitions)).toMatchObject({
      contractVersion: 1,
      revision: 3,
      definitions: [{ id: 'dishes', title: 'Empty dishes' }],
    });

    const occurrences = createRequest({
      uri: '/__navet_chores__/occurrences',
      args: 'participantId=maya&definitionId=dishes',
    });
    choreStore.handle(occurrences);
    expect(parseResponse(occurrences).occurrences).toEqual([
      expect.objectContaining({ id: OCCURRENCE_ID, status: 'available' }),
    ]);

    const firstEvents = createRequest({
      uri: '/__navet_chores__/events',
      args: 'after=0&limit=2',
    });
    choreStore.handle(firstEvents);
    expect(parseResponse(firstEvents)).toMatchObject({
      contractVersion: 1,
      cursor: '4',
      hasMore: true,
      events: [
        expect.objectContaining({ type: 'occurrence_created' }),
        expect.objectContaining({ type: 'due' }),
      ],
    });

    const nextEvents = createRequest({
      uri: '/__navet_chores__/events',
      args: `after=${parseResponse(firstEvents).cursor}`,
    });
    choreStore.handle(nextEvents);
    expect(parseResponse(nextEvents).events.map((event: { type: string }) => event.type)).toEqual([
      'overdue',
    ]);

    const backup = createRequest({ uri: '/__navet_chores__/backup' });
    choreStore.handle(backup);
    expect(parseResponse(backup)).toMatchObject({
      contract: 'navet.chores',
      version: 1,
      workspace: { schemaVersion: 2 },
    });
    expect(parseResponse(backup).events).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'participant_created' })])
    );

    const reset = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/reset',
      headersIn: { 'X-Navet-Base-Revision': '3' },
      requestText: JSON.stringify({
        commandId: 'reset-all',
        baseRevision: 3,
        actorParticipantId: 'maya',
        confirmation: 'DELETE ALL CHORES',
      }),
    });
    choreStore.handle(reset);
    expect(parseResponse(reset)).toMatchObject({
      revision: 4,
      data: { participantsById: {}, definitionsById: {} },
    });

    const restore = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/restore',
      headersIn: { 'X-Navet-Base-Revision': '4' },
      requestText: JSON.stringify({
        commandId: 'restore-all',
        baseRevision: 4,
        actorParticipantId: 'maya',
        mode: 'replace',
        document: parseResponse(backup),
      }),
    });
    choreStore.handle(restore);
    expect(parseResponse(restore)).toMatchObject({
      revision: 5,
      data: { participantsById: { maya: { displayName: 'Maya' } } },
    });

    const alias = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/actions',
      headersIn: { 'X-Navet-Base-Revision': '5' },
      requestText: JSON.stringify({
        commandId: 'complete-through-alias',
        baseRevision: 5,
        action: {
          type: 'occurrence_action',
          occurrenceId: OCCURRENCE_ID,
          action: { type: 'complete', participantId: 'maya' },
        },
      }),
    });
    choreStore.handle(alias);
    expect(parseResponse(alias).data.occurrencesById[OCCURRENCE_ID]).toMatchObject({
      status: 'done',
    });
  });

  it('rejects invalid occurrence actions without changing the workspace', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    seedOccurrenceWorkspace();

    const invalid = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '3' },
      requestText: JSON.stringify({
        commandId: 'bad-complete',
        baseRevision: 3,
        action: {
          type: 'occurrence_action',
          occurrenceId: 'missing',
          action: { type: 'complete', participantId: 'maya' },
        },
      }),
    });
    choreStore.handle(invalid);

    expect(invalid.return).toHaveBeenCalledWith(
      409,
      JSON.stringify({ error: 'Chore occurrence is no longer available' })
    );
    expect(JSON.parse(mockFs.getFile(CHORE_PATH) ?? '{}').revision).toBe(3);
  });

  it('applies audited manager reassignment and rejects reasonless overrides', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    seedOccurrenceWorkspace();
    const addSofia = createActionRequest('add-sofia', 3, {
      type: 'participant_create',
      actorParticipantId: 'maya',
      participant: managerParticipant('sofia'),
    });
    choreStore.handle(addSofia);

    const reasonless = createActionRequest('skip-without-reason', 4, {
      type: 'occurrence_action',
      occurrenceId: OCCURRENCE_ID,
      action: { type: 'skip', participantId: 'maya' },
    });
    choreStore.handle(reasonless);
    expect(reasonless.return).toHaveBeenCalledWith(400, expect.any(String));

    const reassign = createActionRequest('reassign', 4, {
      type: 'occurrence_action',
      occurrenceId: OCCURRENCE_ID,
      action: {
        type: 'reassign',
        participantId: 'maya',
        assigneeIds: ['sofia'],
        reason: 'Maya is away',
      },
    });
    choreStore.handle(reassign);

    expect(parseResponse(reassign).data.occurrencesById[OCCURRENCE_ID]).toMatchObject({
      assigneeIds: ['sofia'],
      assignmentSlot: 'manager:sofia',
      status: 'available',
    });
    expect(parseResponse(reassign).data.activity.at(-1)).toMatchObject({
      type: 'reassigned',
      reason: 'Maya is away',
      previousAssigneeIds: ['maya'],
      assigneeIds: ['sofia'],
    });
  });

  it('runs missed-work policies from durable state when the workspace is read', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T13:00:00.000Z'));
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    seedOccurrenceWorkspace();

    const stored = JSON.parse(mockFs.getFile(CHORE_PATH) ?? '{}');
    stored.data.definitionsById.dishes.missedPolicy = {
      graceMinutes: 30,
      action: 'carry_forward',
      carryForwardDays: 1,
    };
    mockFs.writeFileSync(CHORE_PATH, JSON.stringify(stored));

    const read = createRequest();
    choreStore.handle(read);
    const document = parseResponse(read);

    expect(document.revision).toBe(4);
    expect(document.data.occurrencesById[OCCURRENCE_ID]).toMatchObject({
      status: 'missed',
      missedAt: '2026-08-11T13:00:00.000Z',
    });
    const occurrences = Object.values(document.data.occurrencesById) as Array<{
      carriedForwardFrom?: string;
      status: string;
    }>;
    const outbox = document.data.outbox as Array<{ eventType: string }>;
    expect(
      occurrences.find((occurrence) => occurrence.carriedForwardFrom === OCCURRENCE_ID)
    ).toMatchObject({ status: 'available' });
    expect(outbox.slice(-2).map((item) => item.eventType)).toEqual([
      'missed',
      'occurrence_created',
    ]);
  });

  it('materializes advanced schedules inside the storage authority', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    choreStore.handle(
      createActionRequest('manager', 0, {
        type: 'participant_create',
        participant: managerParticipant(),
      })
    );
    choreStore.handle(
      createActionRequest('advanced-definition', 1, {
        type: 'definition_create',
        actorParticipantId: 'maya',
        definition: {
          id: 'advanced',
          title: 'Advanced schedule',
          enabled: true,
          assignment: { mode: 'person', participantIds: ['maya'] },
          schedule: {
            frequency: 'daily',
            startDate: '2026-08-01',
            endDate: '2026-08-05',
            excludedDates: ['2026-08-03'],
            intervalDays: 2,
            time: '09:00',
            times: ['09:00', '18:00'],
            timeZone: 'Europe/Stockholm',
          },
          dueWindowMinutes: 60,
          approval: { required: false, approverIds: [] },
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      })
    );
    const materialize = createActionRequest('advanced-materialize', 2, {
      type: 'materialize_occurrences',
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-08-06T00:00:00.000Z',
    });
    choreStore.handle(materialize);

    const scheduled = Object.values(parseResponse(materialize).data.occurrencesById) as Array<{
      scheduledAt: string;
    }>;
    expect(scheduled.map((occurrence) => occurrence.scheduledAt)).toEqual([
      '2026-08-01T07:00:00.000Z',
      '2026-08-01T16:00:00.000Z',
      '2026-08-05T07:00:00.000Z',
      '2026-08-05T16:00:00.000Z',
    ]);
  });

  it('migrates a persisted schema version 1 workspace before serving it', () => {
    const mockFs = createMockFs();
    mockFs.writeFileSync(
      CHORE_PATH,
      JSON.stringify({
        contractVersion: 1,
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
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);

    const request = createRequest();
    choreStore.handle(request);

    expect(request.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(request)).toMatchObject({
      revision: 5,
      data: { schemaVersion: 2, outbox: [] },
    });
  });

  it('creates profiles and definitions through authoritative manager actions', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    const source = seededData('unused');
    const manager = {
      ...source.participantsById.maya,
      capabilities: ['complete', 'approve', 'manage'],
    };

    const createManager = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '0' },
      requestText: JSON.stringify({
        commandId: 'create-manager',
        baseRevision: 0,
        action: { type: 'participant_create', participant: manager },
      }),
    });
    choreStore.handle(createManager);
    expect(createManager.return).toHaveBeenCalledWith(200, expect.any(String));

    const createDefinition = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: { 'X-Navet-Base-Revision': '1' },
      requestText: JSON.stringify({
        commandId: 'create-definition',
        baseRevision: 1,
        action: {
          type: 'definition_create',
          actorParticipantId: 'maya',
          definition: source.definitionsById.dishes,
        },
      }),
    });
    choreStore.handle(createDefinition);

    expect(createDefinition.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(createDefinition)).toMatchObject({
      revision: 2,
      data: {
        definitionsById: { dishes: { title: 'Empty dishes' } },
      },
    });
    expect(parseResponse(createDefinition).data.outbox).toHaveLength(2);
  });

  it('persists chores setup progress in the installation-owned experience state', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    choreStore.handle(
      createActionRequest('setup-manager', 0, {
        type: 'participant_create',
        participant: managerParticipant(),
      })
    );

    const setupProgress = createActionRequest('setup-progress', 1, {
      type: 'experience_update',
      actorParticipantId: 'maya',
      experience: {
        version: 1,
        setupStartedAt: '2026-08-15T08:00:00.000Z',
        setupCompletedAt: '2026-08-15T08:10:00.000Z',
        gamificationMode: 'off',
        presentationByDefinitionId: {},
        missionsById: {},
        rewardGoalsById: {},
        earnedPointsByParticipant: {},
        householdBonusPoints: 0,
        awardedMissionIds: [],
      },
    });
    choreStore.handle(setupProgress);

    expect(setupProgress.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(setupProgress).data.experience).toMatchObject({
      setupStartedAt: '2026-08-15T08:00:00.000Z',
      setupCompletedAt: '2026-08-15T08:10:00.000Z',
    });
  });

  it('requires a verified management PIN for chore and profile changes', () => {
    const mockFs = createMockFs();
    choreStore.setChoreStoreFsForTests(mockFs);
    choreStore.setChoreStorePrincipalResolverForTests(() => PRINCIPAL);
    choreStore.handle(
      createActionRequest('setup-manager', 0, {
        type: 'participant_create',
        participant: managerParticipant(),
      })
    );

    const configure = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/management/pin',
      requestText: JSON.stringify({ actorParticipantId: 'maya', pin: '2468' }),
    });
    choreStore.handle(configure);
    expect(configure.return).toHaveBeenCalledWith(200, expect.any(String));
    const sessionToken = parseResponse(configure).sessionToken;
    expect(sessionToken).toEqual(expect.any(String));

    const blocked = createActionRequest('blocked-profile', 1, {
      type: 'participant_create',
      actorParticipantId: 'maya',
      participant: managerParticipant('sofia'),
    });
    choreStore.handle(blocked);
    expect(blocked.return).toHaveBeenCalledWith(
      403,
      JSON.stringify({ error: 'Unlock chore management to continue' })
    );

    const unlocked = createRequest({
      method: 'POST',
      uri: '/__navet_chores__/commands',
      headersIn: {
        'X-Navet-Base-Revision': '1',
        'X-Navet-Chore-Management-Session': sessionToken,
      },
      requestText: JSON.stringify({
        commandId: 'unlocked-profile',
        baseRevision: 1,
        action: {
          type: 'participant_create',
          actorParticipantId: 'maya',
          participant: managerParticipant('sofia'),
        },
      }),
    });
    choreStore.handle(unlocked);
    expect(unlocked.return).toHaveBeenCalledWith(200, expect.any(String));
    expect(parseResponse(unlocked).data.participantsById.sofia.displayName).toBe('Sofia');
  });
});
