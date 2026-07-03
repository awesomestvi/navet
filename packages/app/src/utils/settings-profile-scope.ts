import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { UserSettings } from '@navet/app/stores/settings-store';
import { storage } from '@navet/app/utils/storage';

export type SettingsProfileScope = 'all' | 'device';

export type ScopedUserSettingKey = Extract<
  keyof UserSettings,
  | 'dashboardSpaceMode'
  | 'headerCustomText'
  | 'headerTitleMode'
  | 'keepDeviceAwake'
  | 'kioskMode'
  | 'showHomeSummaryBar'
>;

const scopedSettingKeys = new Set<ScopedUserSettingKey>([
  'dashboardSpaceMode',
  'headerCustomText',
  'headerTitleMode',
  'keepDeviceAwake',
  'kioskMode',
  'showHomeSummaryBar',
]);

interface SettingsProfileScopeEntry {
  scope: SettingsProfileScope;
  sharedValue?: UserSettings[ScopedUserSettingKey];
}

type SettingsProfileScopes = Partial<Record<ScopedUserSettingKey, SettingsProfileScopeEntry>>;

function normalizeScopeEntry(value: unknown): SettingsProfileScopeEntry | null {
  if (value === 'all' || value === 'device') {
    return { scope: value };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const scope = (value as { scope?: unknown }).scope;
  if (scope !== 'all' && scope !== 'device') {
    return null;
  }

  return {
    scope,
    sharedValue: (value as { sharedValue?: UserSettings[ScopedUserSettingKey] }).sharedValue,
  };
}

function readSettingsProfileScopes(): SettingsProfileScopes {
  const value = storage.get<unknown>(STORAGE_KEYS.settingsProfileScopes, {});
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, normalizeScopeEntry(entry)] as const)
      .filter(
        (entry): entry is [ScopedUserSettingKey, SettingsProfileScopeEntry] =>
          scopedSettingKeys.has(entry[0] as ScopedUserSettingKey) && entry[1] !== null
      )
  );
}

function writeSettingsProfileScopes(scopes: SettingsProfileScopes) {
  const next = Object.fromEntries(
    Object.entries(scopes).filter(
      (entry): entry is [ScopedUserSettingKey, SettingsProfileScopeEntry] =>
        Boolean(entry[1]) && entry[1].scope === 'device'
    )
  );

  if (Object.keys(next).length === 0) {
    storage.remove(STORAGE_KEYS.settingsProfileScopes);
    return;
  }

  storage.set(STORAGE_KEYS.settingsProfileScopes, next);
}

export function getSettingsProfileScope(key: ScopedUserSettingKey): SettingsProfileScope {
  return readSettingsProfileScopes()[key]?.scope ?? 'all';
}

export function getSettingsProfileSharedValue(key: ScopedUserSettingKey) {
  return readSettingsProfileScopes()[key]?.sharedValue;
}

export function setSettingsProfileScope(
  keys: readonly ScopedUserSettingKey[],
  scope: SettingsProfileScope,
  sharedSettings?: Partial<UserSettings>
) {
  const scopes = readSettingsProfileScopes();

  for (const key of keys) {
    if (scope === 'all') {
      delete scopes[key];
    } else {
      scopes[key] = {
        scope,
        sharedValue: sharedSettings?.[key] ?? scopes[key]?.sharedValue,
      };
    }
  }

  writeSettingsProfileScopes(scopes);
}

export function setSettingsProfileSharedValues(sharedSettings: Partial<UserSettings>) {
  const scopes = readSettingsProfileScopes();

  for (const key of scopedSettingKeys) {
    const entry = scopes[key];
    if (entry?.scope !== 'device') {
      continue;
    }

    scopes[key] = {
      ...entry,
      sharedValue: sharedSettings[key],
    };
  }

  writeSettingsProfileScopes(scopes);
}

export function shouldSyncSettingToProfile(key: ScopedUserSettingKey) {
  return getSettingsProfileScope(key) === 'all';
}
