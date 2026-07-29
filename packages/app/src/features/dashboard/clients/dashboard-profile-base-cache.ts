import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';

export interface DashboardProfileBaseSnapshot {
  profile: DashboardConfigPayload;
  profileId: string;
  revision: number;
  savedAt: string;
  workspaceId: string;
}

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
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
