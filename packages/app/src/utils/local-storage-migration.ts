import {
  LEGACY_STORAGE_KEYS,
  LEGACY_STORE_STORAGE_KEYS,
  STORAGE_KEYS,
  STORE_STORAGE_KEYS,
} from '@navet/app/constants/storage-keys';

const STORAGE_KEY_MIGRATIONS = new Map<string, string>([
  ...Object.keys(STORAGE_KEYS).map(
    (key) =>
      [
        STORAGE_KEYS[key as keyof typeof STORAGE_KEYS],
        LEGACY_STORAGE_KEYS[key as keyof typeof LEGACY_STORAGE_KEYS],
      ] as const
  ),
  ...Object.keys(STORE_STORAGE_KEYS).map(
    (key) =>
      [
        STORE_STORAGE_KEYS[key as keyof typeof STORE_STORAGE_KEYS],
        LEGACY_STORE_STORAGE_KEYS[key as keyof typeof LEGACY_STORE_STORAGE_KEYS],
      ] as const
  ),
]);

function getStorageArea(storageArea?: Storage) {
  if (storageArea) {
    return storageArea;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function getLegacyStorageKey(key: string) {
  return STORAGE_KEY_MIGRATIONS.get(key) ?? null;
}

export function migrateLocalStorageKey(key: string, storageArea?: Storage) {
  const target = getStorageArea(storageArea);
  const legacyKey = getLegacyStorageKey(key);
  if (!target || !legacyKey) {
    return;
  }

  const currentValue = target.getItem(key);
  const legacyValue = target.getItem(legacyKey);

  if (currentValue === null && legacyValue !== null) {
    target.setItem(key, legacyValue);
  }

  if (legacyValue !== null) {
    target.removeItem(legacyKey);
  }
}

export function readLocalStorageWithMigration(key: string, storageArea?: Storage) {
  const target = getStorageArea(storageArea);
  if (!target) {
    return null;
  }

  migrateLocalStorageKey(key, target);
  return target.getItem(key);
}

export function writeLocalStorageWithMigration(key: string, value: string, storageArea?: Storage) {
  const target = getStorageArea(storageArea);
  if (!target) {
    return;
  }

  target.setItem(key, value);
  const legacyKey = getLegacyStorageKey(key);
  if (legacyKey) {
    target.removeItem(legacyKey);
  }
}

export function removeLocalStorageWithMigration(key: string, storageArea?: Storage) {
  const target = getStorageArea(storageArea);
  if (!target) {
    return;
  }

  target.removeItem(key);
  const legacyKey = getLegacyStorageKey(key);
  if (legacyKey) {
    target.removeItem(legacyKey);
  }
}
