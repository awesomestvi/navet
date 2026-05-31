import type { HabitFeedback, HabitRule } from '@navet/core/habits';
import type { HomeEvent } from '@navet/core/home-events';
import { afterEach, describe, expect, it } from 'vitest';
import { habitStorage, trimEvents } from './habit-storage';

function makeEvent(id: string, timestamp: string): HomeEvent {
  return {
    id,
    providerId: 'home_assistant',
    entityId: 'home_assistant:light.kitchen',
    canonicalEntityId: 'home_assistant:light.kitchen',
    domain: 'light',
    roomId: 'Kitchen',
    action: 'turned_on',
    source: 'manual',
    timestamp,
    previousState: 'off',
    currentState: 'on',
    context: {
      roomId: 'Kitchen',
      occupancy: 'occupied',
      lux: 12,
      sunPosition: 'night',
      userPresence: 'home',
    },
  };
}

function makeFeedback(overrides: Partial<HabitFeedback> = {}): HabitFeedback {
  return {
    id: 'feedback-1',
    insightId: 'insight-1',
    candidateId: 'candidate-1',
    outcome: 'dismissed',
    timestamp: '2026-06-10T21:11:00.000Z',
    reason: 'not_useful',
    ...overrides,
  };
}

function makeRule(overrides: Partial<HabitRule> = {}): HabitRule {
  return {
    id: 'rule-1',
    enabled: true,
    scope: 'navet_local',
    trigger: {
      days: [0],
      startMinute: 21 * 60,
      endMinute: 22 * 60,
      roomId: 'Kitchen',
      occupancy: 'any',
      presence: 'any',
    },
    action: {
      type: 'turn_on',
      entityIds: ['home_assistant:light.kitchen'],
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

describe('habitStorage', () => {
  const originalIndexedDb = globalThis.indexedDB;

  afterEach(async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: originalIndexedDb,
    });
    localStorage.clear();
    await habitStorage.clearEvents();
    await habitStorage.clearFeedback();
    await habitStorage.clearRules();
  });

  it('uses localStorage fallback when IndexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await habitStorage.appendEvent(makeEvent('event-1', '2026-06-01T21:00:00.000Z'));
    await habitStorage.appendEvent(makeEvent('event-2', '2026-06-01T21:05:00.000Z'));

    const events = await habitStorage.listEvents();

    expect(events.map((event) => event.id)).toEqual(['event-1', 'event-2']);
    expect(localStorage.getItem('navet-habits-fallback:events')).toContain('event-1');
  });

  it('stores feedback and rules through the localStorage fallback', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await habitStorage.saveFeedback(makeFeedback());
    await habitStorage.saveRule(makeRule());

    await expect(habitStorage.listFeedback()).resolves.toEqual([makeFeedback()]);
    await expect(habitStorage.listRules()).resolves.toEqual([makeRule()]);
  });

  it('stores and trims events through the IndexedDB path', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: createIndexedDbMock(),
    });

    await habitStorage.appendEvent(makeEvent('event-1', '2026-06-01T21:00:00.000Z'));
    await habitStorage.appendEvent(makeEvent('event-2', '2026-06-01T21:05:00.000Z'));
    await habitStorage.appendEvent(makeEvent('event-3', '2026-06-01T21:10:00.000Z'));

    await trimEvents(2);

    const events = await habitStorage.listEvents();

    expect(events.map((event) => event.id)).toEqual(['event-2', 'event-3']);
  });

  it('keeps list ordering stable after updates and deletes', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: createIndexedDbMock(),
    });

    await habitStorage.saveRule(makeRule({ id: 'rule-2', updatedAt: '2026-06-01T21:00:00.000Z' }));
    await habitStorage.saveRule(makeRule({ id: 'rule-1', updatedAt: '2026-06-01T20:00:00.000Z' }));
    await habitStorage.saveRule(makeRule({ id: 'rule-1', updatedAt: '2026-06-01T22:00:00.000Z' }));

    expect((await habitStorage.listRules()).map((rule) => rule.id)).toEqual(['rule-2', 'rule-1']);

    await habitStorage.deleteRule('rule-2');

    expect((await habitStorage.listRules()).map((rule) => rule.id)).toEqual(['rule-1']);
  });

  it('clears every persisted collection', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    await habitStorage.appendEvent(makeEvent('event-1', '2026-06-01T21:00:00.000Z'));
    await habitStorage.saveFeedback(makeFeedback());
    await habitStorage.saveRule(makeRule());

    await habitStorage.clearEvents();
    await habitStorage.clearFeedback();
    await habitStorage.clearRules();

    await expect(habitStorage.listEvents()).resolves.toEqual([]);
    await expect(habitStorage.listFeedback()).resolves.toEqual([]);
    await expect(habitStorage.listRules()).resolves.toEqual([]);
  });
});
