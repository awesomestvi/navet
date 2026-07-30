import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { storage } from '@navet/app/utils/storage';

export type DashboardClientKind = 'desktop' | 'phone' | 'tablet' | 'wall_panel' | 'unknown';

export interface DashboardClientIdentity {
  id: string;
  name: string;
  kind: DashboardClientKind;
  nameSource: 'generated' | 'custom';
  createdAt: string;
  updatedAt: string;
}

interface DashboardClientEnvironment {
  maxTouchPoints?: number;
  screenWidth?: number;
  userAgent?: string;
}

interface DashboardClientIdentityOptions {
  dispatchEvent?: boolean;
  environment?: DashboardClientEnvironment;
  expectedCurrentId?: string;
  now?: () => Date;
  profileMode?: 'standard' | 'wall_display' | 'bedside' | 'custom';
  randomUUID?: () => string;
}

const CLIENT_NAME_MAX_LENGTH = 64;
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
export const DASHBOARD_CLIENT_IDENTITY_EVENT = 'navet:dashboard-client-identity';
let volatileIdentity: DashboardClientIdentity | null = null;

function sanitizeClientName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const sanitized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f ? '' : character;
  })
    .join('')
    .trim();
  return sanitized ? sanitized.slice(0, CLIENT_NAME_MAX_LENGTH) : null;
}

function isDashboardClientKind(value: unknown): value is DashboardClientKind {
  return (
    value === 'desktop' ||
    value === 'phone' ||
    value === 'tablet' ||
    value === 'wall_panel' ||
    value === 'unknown'
  );
}

function resolveEnvironment(
  environment: DashboardClientEnvironment | undefined
): DashboardClientEnvironment {
  if (environment) {
    return environment;
  }
  if (typeof navigator === 'undefined') {
    return {};
  }

  return {
    maxTouchPoints: navigator.maxTouchPoints,
    screenWidth: typeof screen === 'undefined' ? undefined : screen.width,
    userAgent: navigator.userAgent,
  };
}

export function inferDashboardClientKind(
  environment: DashboardClientEnvironment,
  profileMode?: DashboardClientIdentityOptions['profileMode']
): DashboardClientKind {
  if (profileMode === 'wall_display' || profileMode === 'bedside') {
    return 'wall_panel';
  }

  const userAgent = environment.userAgent?.toLowerCase() ?? '';
  const touchPoints = environment.maxTouchPoints ?? 0;
  const screenWidth = environment.screenWidth ?? Number.POSITIVE_INFINITY;

  if (/ipad|tablet|kindle|silk/.test(userAgent)) {
    return 'tablet';
  }
  if (/iphone|ipod|android.+mobile|mobile/.test(userAgent)) {
    return 'phone';
  }
  if (/android/.test(userAgent) || (touchPoints > 1 && screenWidth < 1_200)) {
    return screenWidth < 720 ? 'phone' : 'tablet';
  }
  return userAgent ? 'desktop' : 'unknown';
}

function createClientId(randomUUID?: () => string): string {
  const uuid =
    randomUUID?.() ??
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : null);
  if (uuid) {
    return uuid.replaceAll('-', '_');
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Secure random dashboard client IDs are unavailable');
}

function getGeneratedClientName(kind: DashboardClientKind, id: string): string {
  const label = {
    desktop: 'Computer',
    phone: 'Phone',
    tablet: 'Tablet',
    wall_panel: 'Wall panel',
    unknown: 'Dashboard',
  }[kind];
  return `${label} ${id.slice(-4).toUpperCase()}`;
}

function parseDashboardClientIdentity(value: unknown): DashboardClientIdentity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<DashboardClientIdentity>;
  const name = sanitizeClientName(candidate.name);
  if (
    typeof candidate.id !== 'string' ||
    !CLIENT_ID_PATTERN.test(candidate.id) ||
    !name ||
    !isDashboardClientKind(candidate.kind) ||
    (candidate.nameSource !== 'generated' && candidate.nameSource !== 'custom') ||
    typeof candidate.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.createdAt)) ||
    typeof candidate.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.updatedAt))
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name,
    kind: candidate.kind,
    nameSource: candidate.nameSource,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function identitiesEqual(left: DashboardClientIdentity | null, right: DashboardClientIdentity) {
  return (
    left?.id === right.id &&
    left.name === right.name &&
    left.kind === right.kind &&
    left.nameSource === right.nameSource &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function persistDashboardClientIdentity(identity: DashboardClientIdentity) {
  storage.set(STORAGE_KEYS.dashboardClientIdentity, identity);
  const persisted = parseDashboardClientIdentity(
    storage.get<DashboardClientIdentity | null>(STORAGE_KEYS.dashboardClientIdentity, null)
  );
  volatileIdentity = identitiesEqual(persisted, identity) ? null : identity;
}

export function getDashboardClientIdentity(
  options: DashboardClientIdentityOptions = {}
): DashboardClientIdentity {
  const now = options.now?.() ?? new Date();
  const stored = parseDashboardClientIdentity(
    storage.get<DashboardClientIdentity | null>(STORAGE_KEYS.dashboardClientIdentity, null)
  );
  let current = stored;
  if (volatileIdentity) {
    if (identitiesEqual(stored, volatileIdentity)) {
      volatileIdentity = null;
    } else if (!stored || Date.parse(volatileIdentity.updatedAt) >= Date.parse(stored.updatedAt)) {
      current = volatileIdentity;
      persistDashboardClientIdentity(volatileIdentity);
    } else {
      volatileIdentity = null;
    }
  }
  const kind = inferDashboardClientKind(
    resolveEnvironment(options.environment),
    options.profileMode
  );

  if (current) {
    if (current.kind === kind || kind === 'unknown') {
      return current;
    }

    const nextIdentity: DashboardClientIdentity = {
      ...current,
      kind,
      name:
        current.nameSource === 'generated'
          ? getGeneratedClientName(kind, current.id)
          : current.name,
      updatedAt: now.toISOString(),
    };
    persistDashboardClientIdentity(nextIdentity);
    return nextIdentity;
  }

  const id = createClientId(options.randomUUID);
  const identity: DashboardClientIdentity = {
    id,
    name: getGeneratedClientName(kind, id),
    kind,
    nameSource: 'generated',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  persistDashboardClientIdentity(identity);
  return identity;
}

export function renameDashboardClient(
  name: string,
  options: Pick<DashboardClientIdentityOptions, 'now' | 'profileMode'> = {}
): DashboardClientIdentity {
  const sanitizedName = sanitizeClientName(name);
  if (!sanitizedName) {
    throw new Error('Dashboard client name cannot be empty');
  }

  const identity = getDashboardClientIdentity(options);
  const nextIdentity: DashboardClientIdentity = {
    ...identity,
    name: sanitizedName,
    nameSource: 'custom',
    updatedAt: (options.now?.() ?? new Date()).toISOString(),
  };
  persistDashboardClientIdentity(nextIdentity);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DASHBOARD_CLIENT_IDENTITY_EVENT, { detail: nextIdentity })
    );
  }
  return nextIdentity;
}

export function rotateDashboardClientIdentity(
  options: DashboardClientIdentityOptions = {}
): DashboardClientIdentity {
  const current = getDashboardClientIdentity(options);
  if (options.expectedCurrentId && current.id !== options.expectedCurrentId) {
    return current;
  }
  const now = options.now?.() ?? new Date();
  const id = createClientId(options.randomUUID);
  const nextIdentity: DashboardClientIdentity = {
    ...current,
    id,
    name:
      current.nameSource === 'generated' ? getGeneratedClientName(current.kind, id) : current.name,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  persistDashboardClientIdentity(nextIdentity);
  if (options.dispatchEvent !== false && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DASHBOARD_CLIENT_IDENTITY_EVENT, { detail: nextIdentity })
    );
  }
  return nextIdentity;
}
