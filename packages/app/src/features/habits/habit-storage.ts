import type { HabitFeedback, HabitRule } from '@navet/core/habits';
import type { HomeEvent } from '@navet/core/home-events';

const DATABASE_NAME = 'navet-habits';
const DATABASE_VERSION = 1;
const EVENT_STORE = 'events';
const FEEDBACK_STORE = 'feedback';
const RULE_STORE = 'rules';
const LOCAL_STORAGE_PREFIX = 'navet-habits-fallback';

type HabitStoreName = typeof EVENT_STORE | typeof FEEDBACK_STORE | typeof RULE_STORE;
type HabitStoreValue = HomeEvent | HabitFeedback | HabitRule;

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function openHabitsDb() {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;

    if (!db.objectStoreNames.contains(EVENT_STORE)) {
      db.createObjectStore(EVENT_STORE, { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains(FEEDBACK_STORE)) {
      db.createObjectStore(FEEDBACK_STORE, { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains(RULE_STORE)) {
      db.createObjectStore(RULE_STORE, { keyPath: 'id' });
    }
  };

  return await requestToPromise(request);
}

function getFallbackKey(storeName: HabitStoreName) {
  return `${LOCAL_STORAGE_PREFIX}:${storeName}`;
}

function readFallbackStore<T extends HabitStoreValue>(storeName: HabitStoreName): T[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getFallbackKey(storeName));
    return raw ? ((JSON.parse(raw) as T[]) ?? []) : [];
  } catch {
    return [];
  }
}

function writeFallbackStore<T extends HabitStoreValue>(storeName: HabitStoreName, values: T[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getFallbackKey(storeName), JSON.stringify(values));
  } catch {
    // Ignore storage quota and embedded-browser failures.
  }
}

async function getAllFromStore<T extends HabitStoreValue>(storeName: HabitStoreName): Promise<T[]> {
  if (!isIndexedDbAvailable()) {
    return readFallbackStore<T>(storeName);
  }

  const db = await openHabitsDb();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const values = await requestToPromise(store.getAll());
  await transactionDone(transaction);
  return values as T[];
}

async function putIntoStore<T extends HabitStoreValue>(storeName: HabitStoreName, value: T) {
  if (!isIndexedDbAvailable()) {
    const nextValues = [
      ...readFallbackStore<T>(storeName).filter((item) => item.id !== value.id),
      value,
    ];
    writeFallbackStore(storeName, nextValues);
    return;
  }

  const db = await openHabitsDb();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).put(value);
  await transactionDone(transaction);
}

async function deleteFromStore(storeName: HabitStoreName, id: string) {
  if (!isIndexedDbAvailable()) {
    writeFallbackStore(
      storeName,
      readFallbackStore(storeName).filter((item) => item.id !== id)
    );
    return;
  }

  const db = await openHabitsDb();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).delete(id);
  await transactionDone(transaction);
}

async function clearStore(storeName: HabitStoreName) {
  if (!isIndexedDbAvailable()) {
    writeFallbackStore(storeName, []);
    return;
  }

  const db = await openHabitsDb();
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).clear();
  await transactionDone(transaction);
}

export async function trimEvents(maxEvents: number) {
  const events = await getAllFromStore<HomeEvent>(EVENT_STORE);
  if (events.length <= maxEvents) {
    return;
  }

  const staleEvents = [...events]
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .slice(0, events.length - maxEvents);

  await Promise.all(staleEvents.map((event) => deleteFromStore(EVENT_STORE, event.id)));
}

export const habitStorage = {
  listEvents: async () =>
    [...(await getAllFromStore<HomeEvent>(EVENT_STORE))].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp)
    ),
  appendEvent: async (event: HomeEvent) => {
    await putIntoStore(EVENT_STORE, event);
  },
  clearEvents: async () => {
    await clearStore(EVENT_STORE);
  },
  listFeedback: async () =>
    [...(await getAllFromStore<HabitFeedback>(FEEDBACK_STORE))].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp)
    ),
  saveFeedback: async (feedback: HabitFeedback) => {
    await putIntoStore(FEEDBACK_STORE, feedback);
  },
  clearFeedback: async () => {
    await clearStore(FEEDBACK_STORE);
  },
  listRules: async () =>
    [...(await getAllFromStore<HabitRule>(RULE_STORE))].sort((left, right) =>
      left.updatedAt.localeCompare(right.updatedAt)
    ),
  saveRule: async (rule: HabitRule) => {
    await putIntoStore(RULE_STORE, rule);
  },
  deleteRule: async (ruleId: string) => {
    await deleteFromStore(RULE_STORE, ruleId);
  },
  clearRules: async () => {
    await clearStore(RULE_STORE);
  },
};
