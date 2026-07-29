import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { storage } from '@navet/app/utils/storage';

export interface DashboardProfileBaseSnapshot {
  generation: string;
  profile: DashboardConfigPayload;
  profileId: string;
  revision: number;
  savedAt: string;
  workspaceId: string;
}

export interface DashboardProfileReceipt {
  profileFingerprint: string;
  profileId: string;
  revision: number;
  savedAt: string;
  workspaceId: string;
}

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const PROFILE_FINGERPRINT_PATTERN = /^dpf1_[a-f0-9]{32}$/;
const PROFILE_FINGERPRINT_IGNORED_ROOT_KEYS = new Set(['cardOrders', 'exportedAt', 'navigation']);
let observedBase: DashboardProfileBaseSnapshot | null = null;

function clearPersistedBases() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEYS.dashboardProfileBase);
    window.sessionStorage.removeItem(STORAGE_KEYS.dashboardProfileBase);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[DashboardProfile] Unable to clear a legacy persisted merge base:', error);
    }
  }
}

function parseDashboardProfileBaseSnapshot(value: unknown): DashboardProfileBaseSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<DashboardProfileBaseSnapshot>;
  if (
    candidate.profile?.app !== 'navet' ||
    candidate.profile.version !== 3 ||
    typeof candidate.generation !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.generation) ||
    typeof candidate.profileId !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.profileId) ||
    typeof candidate.workspaceId !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.workspaceId) ||
    typeof candidate.revision !== 'number' ||
    !Number.isSafeInteger(candidate.revision) ||
    candidate.revision < 0 ||
    typeof candidate.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.savedAt))
  ) {
    return null;
  }

  return candidate as DashboardProfileBaseSnapshot;
}

function parseDashboardProfileReceipt(value: unknown): DashboardProfileReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<DashboardProfileReceipt>;
  const keys = Object.keys(value).sort();
  if (
    keys.join(',') !== 'profileFingerprint,profileId,revision,savedAt,workspaceId' ||
    typeof candidate.profileFingerprint !== 'string' ||
    !PROFILE_FINGERPRINT_PATTERN.test(candidate.profileFingerprint) ||
    typeof candidate.profileId !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.profileId) ||
    typeof candidate.workspaceId !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.workspaceId) ||
    typeof candidate.revision !== 'number' ||
    !Number.isSafeInteger(candidate.revision) ||
    candidate.revision < 0 ||
    typeof candidate.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.savedAt))
  ) {
    return null;
  }

  return {
    profileFingerprint: candidate.profileFingerprint,
    profileId: candidate.profileId,
    revision: candidate.revision,
    savedAt: candidate.savedAt,
    workspaceId: candidate.workspaceId,
  };
}

function canonicalizeProfileValue(value: unknown, root = false): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeProfileValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !root || !PROFILE_FINGERPRINT_IGNORED_ROOT_KEYS.has(key))
        .sort()
        .flatMap((key) => {
          const entry = (value as Record<string, unknown>)[key];
          return entry === undefined ? [] : ([[key, canonicalizeProfileValue(entry)]] as const);
        })
    );
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function hashProfileValue(value: string): string {
  let first = 1_779_033_703;
  let second = 3_144_134_277;
  let third = 1_013_904_242;
  let fourth = 2_773_480_762;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = second ^ Math.imul(first ^ code, 597_399_067);
    second = third ^ Math.imul(second ^ code, 2_869_860_233);
    third = fourth ^ Math.imul(third ^ code, 951_274_213);
    fourth = first ^ Math.imul(fourth ^ code, 2_716_044_179);
  }

  first = Math.imul(third ^ (first >>> 18), 597_399_067);
  second = Math.imul(fourth ^ (second >>> 22), 2_869_860_233);
  third = Math.imul(first ^ (third >>> 17), 951_274_213);
  fourth = Math.imul(second ^ (fourth >>> 19), 2_716_044_179);

  const hashes = [
    (first ^ second ^ third ^ fourth) >>> 0,
    (second ^ first) >>> 0,
    (third ^ first) >>> 0,
    (fourth ^ first) >>> 0,
  ];
  return hashes.map((hash) => hash.toString(16).padStart(8, '0')).join('');
}

export function getDashboardProfileFingerprint(profile: DashboardConfigPayload): string {
  const canonicalProfile = canonicalizeProfileValue(profile, true);
  return `dpf1_${hashProfileValue(JSON.stringify(canonicalProfile))}`;
}

export function readDashboardProfileBase(): DashboardProfileBaseSnapshot | null {
  clearPersistedBases();
  return observedBase;
}

export function writeDashboardProfileBase(snapshot: DashboardProfileBaseSnapshot) {
  const validSnapshot = parseDashboardProfileBaseSnapshot(snapshot);
  if (!validSnapshot) {
    throw new Error('Invalid dashboard profile base snapshot');
  }
  observedBase = validSnapshot;
  clearPersistedBases();
}

export function clearDashboardProfileBase() {
  observedBase = null;
  clearPersistedBases();
}

export function readDashboardProfileReceipt(): DashboardProfileReceipt | null {
  const receipt = parseDashboardProfileReceipt(
    storage.get<unknown>(STORAGE_KEYS.dashboardProfileSync, null)
  );
  if (!receipt) {
    storage.remove(STORAGE_KEYS.dashboardProfileSync);
  }
  return receipt;
}

export function writeDashboardProfileReceipt(
  snapshot: DashboardProfileBaseSnapshot
): DashboardProfileReceipt {
  const validSnapshot = parseDashboardProfileBaseSnapshot(snapshot);
  if (!validSnapshot) {
    throw new Error('Invalid dashboard profile receipt snapshot');
  }

  const receipt: DashboardProfileReceipt = {
    profileFingerprint: getDashboardProfileFingerprint(validSnapshot.profile),
    profileId: validSnapshot.profileId,
    revision: validSnapshot.revision,
    savedAt: validSnapshot.savedAt,
    workspaceId: validSnapshot.workspaceId,
  };
  storage.set(STORAGE_KEYS.dashboardProfileSync, receipt);
  return receipt;
}

export function clearDashboardProfileReceipt() {
  storage.remove(STORAGE_KEYS.dashboardProfileSync);
}
