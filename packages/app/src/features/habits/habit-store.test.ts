import { resetAppStores } from '@navet/app/test/store-reset';
import type { HabitRule } from '@navet/core/habits';
import type { HomeEvent } from '@navet/core/home-events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { habitStorage } from './habit-storage';
import { useHabitStore } from './habit-store';

function makePatternEvent(id: string, timestamp: string): HomeEvent {
  return {
    id,
    providerId: 'home_assistant',
    entityId: 'home_assistant:light.bedroom',
    canonicalEntityId: 'home_assistant:light.bedroom',
    domain: 'light',
    roomId: 'Bedroom',
    action: 'turned_off',
    source: 'manual',
    timestamp,
    previousState: 'on',
    currentState: 'off',
    context: {
      roomId: 'Bedroom',
      occupancy: 'vacant',
      lux: 8,
      sunPosition: 'night',
      userPresence: 'home',
    },
  };
}

function makeRule(overrides: Partial<HabitRule> = {}): HabitRule {
  return {
    id: 'rule-1',
    enabled: true,
    scope: 'navet_local',
    trigger: {
      days: [0],
      startMinute: 22 * 60,
      endMinute: 23 * 60,
      roomId: 'Bedroom',
      occupancy: 'vacant',
      presence: 'home',
      luxBelow: 20,
    },
    action: {
      type: 'turn_off',
      entityIds: ['home_assistant:light.bedroom'],
    },
    safety: {
      allowDomains: ['light', 'switch'],
      requireUserCreated: true,
    },
    createdAt: '2026-06-01T20:00:00.000Z',
    updatedAt: '2026-06-01T20:00:00.000Z',
    ...overrides,
  };
}

type StoredRecord = Record<string, unknown> & { id: string };

class MockObjectStore {
  constructor(
    private readonly records: Map<string, StoredRecord>,
    private readonly transaction: MockTransaction
  ) {}

  private makeRequest<T>(producer: () => T) {
    const request = {
      result: undefined as T | undefined,
      error: null,
      onsuccess: null as ((this: IDBRequest<T>, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBRequest<T>, ev: Event) => unknown) | null,
    } as unknown as IDBRequest<T>;

    queueMicrotask(() => {
      try {
        (request as { result: T }).result = producer();
        request.onsuccess?.call(request, new Event('success'));
        this.transaction.finish();
      } catch (error) {
        (request as { error: DOMException }).error = error as DOMException;
        request.onerror?.call(request, new Event('error'));
        this.transaction.fail(error as Error);
      }
    });

    return request;
  }

  getAll() {
    return this.makeRequest(() => [...this.records.values()]);
  }

  put(value: StoredRecord) {
    return this.makeRequest(() => {
      this.records.set(value.id, value);
      return value.id;
    });
  }

  delete(id: string) {
    return this.makeRequest(() => {
      this.records.delete(id);
      return undefined;
    });
  }

  clear() {
    return this.makeRequest(() => {
      this.records.clear();
      return undefined;
    });
  }
}

class MockTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  error: Error | null = null;

  constructor(private readonly stores: Map<string, Map<string, StoredRecord>>) {}

  objectStore(name: string) {
    const store = this.stores.get(name);
    if (!store) {
      throw new Error(`Unknown store ${name}`);
    }

    return new MockObjectStore(store, this) as unknown as IDBObjectStore;
  }

  finish() {
    queueMicrotask(() => {
      this.oncomplete?.();
    });
  }

  fail(error: Error) {
    this.error = error;
    queueMicrotask(() => {
      this.onerror?.();
    });
  }
}

class MockDatabase {
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  } as DOMStringList;

  constructor(private readonly stores: Map<string, Map<string, StoredRecord>>) {}

  createObjectStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }

    return {} as IDBObjectStore;
  }

  transaction(_name: string) {
    return new MockTransaction(this.stores) as unknown as IDBTransaction;
  }
}

function createIndexedDbMock() {
  const stores = new Map<string, Map<string, StoredRecord>>();

  return {
    open: () => {
      const request = {
        result: undefined as IDBDatabase | undefined,
        error: null,
        onsuccess: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
        onerror: null as ((this: IDBOpenDBRequest, ev: Event) => unknown) | null,
        onupgradeneeded: null as
          | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
          | null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        const db = new MockDatabase(stores) as unknown as IDBDatabase;
        (request as { result: IDBDatabase }).result = db;
        request.onupgradeneeded?.call(request, {} as IDBVersionChangeEvent);
        request.onsuccess?.call(request, new Event('success'));
      });

      return request;
    },
  };
}

describe('useHabitStore', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T22:10:00.000Z'));
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: createIndexedDbMock(),
    });
    await habitStorage.clearEvents();
    await habitStorage.clearFeedback();
    await habitStorage.clearRules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes from persisted local data and recomputes insights', async () => {
    await habitStorage.appendEvent(makePatternEvent('event-1', '2026-06-01T22:00:00.000Z'));
    await habitStorage.appendEvent(makePatternEvent('event-2', '2026-06-08T22:03:00.000Z'));
    await habitStorage.appendEvent(makePatternEvent('event-3', '2026-06-15T22:06:00.000Z'));
    await habitStorage.saveRule(makeRule());

    await useHabitStore.getState().initialize();

    expect(useHabitStore.getState().initialized).toBe(true);
    expect(useHabitStore.getState().insights).toHaveLength(1);
    expect(useHabitStore.getState().rules).toHaveLength(1);
  });

  it('suppresses dismissed suggestions during cooldown', async () => {
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-1', '2026-06-01T22:00:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-2', '2026-06-08T22:03:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-3', '2026-06-15T22:06:00.000Z'));

    const [insight] = useHabitStore.getState().insights;
    expect(insight).toBeDefined();

    await useHabitStore.getState().addFeedback({
      insightId: insight.id,
      candidateId: insight.candidateId,
      outcome: 'dismissed',
      reason: 'not_useful',
    });

    expect(useHabitStore.getState().insights).toHaveLength(0);
  });

  it('suppresses remind-later suggestions during cooldown', async () => {
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-1', '2026-06-01T22:00:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-2', '2026-06-08T22:03:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-3', '2026-06-15T22:06:00.000Z'));

    const [insight] = useHabitStore.getState().insights;
    expect(insight).toBeDefined();

    await useHabitStore.getState().addFeedback({
      insightId: insight.id,
      candidateId: insight.candidateId,
      outcome: 'remind_later',
      reason: 'wrong_time',
    });

    expect(useHabitStore.getState().insights).toHaveLength(0);

    vi.setSystemTime(new Date('2026-06-16T23:20:00.000Z'));
    useHabitStore.getState().recompute();

    expect(useHabitStore.getState().insights).toHaveLength(1);
    expect(useHabitStore.getState().insights[0]?.status).toBe('deferred');
  });

  it('clears local habits data without turning the feature off', async () => {
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-1', '2026-06-01T22:00:00.000Z'));
    await useHabitStore.getState().saveRule(makeRule());

    useHabitStore.getState().setDebugEnabled(true);

    expect(useHabitStore.getState().events).toHaveLength(1);
    expect(useHabitStore.getState().rules).toHaveLength(1);

    await useHabitStore.getState().resetLocalData();

    expect(useHabitStore.getState().enabled).toBe(true);
    expect(useHabitStore.getState().debugEnabled).toBe(true);
    expect(useHabitStore.getState().events).toEqual([]);
    expect(useHabitStore.getState().feedback).toEqual([]);
    expect(useHabitStore.getState().rules).toEqual([]);
    await expect(habitStorage.listEvents()).resolves.toEqual([]);
    await expect(habitStorage.listRules()).resolves.toEqual([]);
  });

  it('keeps insights empty when the feature is disabled', async () => {
    useHabitStore.getState().setEnabled(false);
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-1', '2026-06-01T22:00:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-2', '2026-06-08T22:03:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-3', '2026-06-15T22:06:00.000Z'));

    expect(useHabitStore.getState().insights).toEqual([]);
    expect(useHabitStore.getState().activity).toEqual([]);
  });

  it('suppresses accepted suggestions for two weeks', async () => {
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-1', '2026-06-01T22:00:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-2', '2026-06-08T22:03:00.000Z'));
    await useHabitStore
      .getState()
      .appendEvent(makePatternEvent('event-3', '2026-06-15T22:06:00.000Z'));

    const [insight] = useHabitStore.getState().insights;
    expect(insight).toBeDefined();

    await useHabitStore.getState().addFeedback({
      insightId: insight.id,
      candidateId: insight.candidateId,
      outcome: 'accepted',
    });

    expect(useHabitStore.getState().insights).toEqual([]);

    vi.setSystemTime(new Date('2026-06-30T22:10:00.000Z'));
    useHabitStore.getState().recompute();

    expect(useHabitStore.getState().insights).toHaveLength(1);
    expect(useHabitStore.getState().insights[0]?.status).toBe('accepted');
  });
});
