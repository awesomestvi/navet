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

export type DashboardPreferenceLayer = 'account' | 'device';

export interface DashboardPreferenceContext {
  installationId: string;
  layer: DashboardPreferenceLayer;
  ownerFingerprint: string;
  workspaceId: string;
}

export interface DashboardPreferenceReceipt extends DashboardPreferenceContext {
  fieldFingerprints: Record<string, string>;
  revision: number;
  savedAt: string;
}

interface DashboardPreferenceReceiptCollection {
  activeContexts: DashboardPreferenceContext[];
  receipts: DashboardPreferenceReceipt[];
  version: 2;
}

export interface DashboardPreferenceReceiptState {
  activeContext: DashboardPreferenceContext | null;
  context: DashboardPreferenceContext | null;
  receipt: DashboardPreferenceReceipt | null;
  storageStatus: 'available' | 'invalid' | 'missing';
}

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const PROFILE_FINGERPRINT_PATTERN = /^dpf1_[a-f0-9]{32}$/;
const PREFERENCE_FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{0,127}$/;
const PREFERENCE_FIELD_FINGERPRINT_PATTERN = /^dpv1_[a-f0-9]{32}$/;
const PREFERENCE_OWNER_FINGERPRINT_PATTERN = /^dpo1_[a-f0-9]{32}$/;
const PROFILE_FINGERPRINT_IGNORED_ROOT_KEYS = new Set(['cardOrders', 'exportedAt', 'navigation']);
const MAX_PREFERENCE_FIELDS = 128;
const MAX_PREFERENCE_RECEIPTS = 16;
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

function parseDashboardPreferenceContext(value: unknown): DashboardPreferenceContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<DashboardPreferenceContext>;
  const keys = Object.keys(value).sort();
  if (
    keys.join(',') !== 'installationId,layer,ownerFingerprint,workspaceId' ||
    typeof candidate.installationId !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.installationId) ||
    (candidate.layer !== 'account' && candidate.layer !== 'device') ||
    typeof candidate.ownerFingerprint !== 'string' ||
    !PREFERENCE_OWNER_FINGERPRINT_PATTERN.test(candidate.ownerFingerprint) ||
    typeof candidate.workspaceId !== 'string' ||
    !SAFE_ID_PATTERN.test(candidate.workspaceId)
  ) {
    return null;
  }

  return {
    installationId: candidate.installationId,
    layer: candidate.layer,
    ownerFingerprint: candidate.ownerFingerprint,
    workspaceId: candidate.workspaceId,
  };
}

function parseDashboardPreferenceFieldFingerprints(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value);
  if (
    entries.length > MAX_PREFERENCE_FIELDS ||
    entries.some(
      ([key, fingerprint]) =>
        !PREFERENCE_FIELD_NAME_PATTERN.test(key) ||
        typeof fingerprint !== 'string' ||
        !PREFERENCE_FIELD_FINGERPRINT_PATTERN.test(fingerprint)
    )
  ) {
    return null;
  }

  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function parseDashboardPreferenceReceipt(value: unknown): DashboardPreferenceReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<DashboardPreferenceReceipt>;
  const keys = Object.keys(value).sort();
  const context = parseDashboardPreferenceContext({
    installationId: candidate.installationId,
    layer: candidate.layer,
    ownerFingerprint: candidate.ownerFingerprint,
    workspaceId: candidate.workspaceId,
  });
  const fieldFingerprints = parseDashboardPreferenceFieldFingerprints(candidate.fieldFingerprints);
  if (
    keys.join(',') !==
      'fieldFingerprints,installationId,layer,ownerFingerprint,revision,savedAt,workspaceId' ||
    !context ||
    !fieldFingerprints ||
    typeof candidate.revision !== 'number' ||
    !Number.isSafeInteger(candidate.revision) ||
    candidate.revision < 0 ||
    typeof candidate.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.savedAt))
  ) {
    return null;
  }

  return {
    ...context,
    fieldFingerprints,
    revision: candidate.revision,
    savedAt: candidate.savedAt,
  };
}

function emptyDashboardPreferenceReceiptCollection(): DashboardPreferenceReceiptCollection {
  return { activeContexts: [], receipts: [], version: 2 };
}

function readDashboardPreferenceReceiptCollection(): {
  collection: DashboardPreferenceReceiptCollection;
  status: DashboardPreferenceReceiptState['storageStatus'];
} {
  if (typeof window === 'undefined') {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'invalid' };
  }

  let serialized: string | null;
  try {
    serialized = window.localStorage.getItem(STORAGE_KEYS.dashboardPreferenceSync);
  } catch {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'invalid' };
  }
  if (serialized === null) {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'missing' };
  }

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'invalid' };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'invalid' };
  }

  const candidate = value as Partial<DashboardPreferenceReceiptCollection>;
  const keys = Object.keys(value).sort();
  if (
    keys.join(',') !== 'activeContexts,receipts,version' ||
    candidate.version !== 2 ||
    !Array.isArray(candidate.activeContexts) ||
    candidate.activeContexts.length > 2 ||
    !Array.isArray(candidate.receipts) ||
    candidate.receipts.length > MAX_PREFERENCE_RECEIPTS
  ) {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'invalid' };
  }

  const activeContexts = candidate.activeContexts.map(parseDashboardPreferenceContext);
  const receipts = candidate.receipts.map(parseDashboardPreferenceReceipt);
  const receiptContextKeys = receipts.map((receipt) =>
    receipt
      ? [receipt.installationId, receipt.workspaceId, receipt.layer, receipt.ownerFingerprint].join(
          '\u0000'
        )
      : null
  );
  if (
    activeContexts.some((context) => context === null) ||
    new Set(activeContexts.map((context) => context?.layer)).size !== activeContexts.length ||
    receipts.some((receipt) => receipt === null) ||
    new Set(receiptContextKeys).size !== receiptContextKeys.length
  ) {
    return { collection: emptyDashboardPreferenceReceiptCollection(), status: 'invalid' };
  }

  return {
    collection: {
      activeContexts: activeContexts as DashboardPreferenceContext[],
      receipts: receipts as DashboardPreferenceReceipt[],
      version: 2,
    },
    status: 'available',
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

export function getDashboardPreferenceFieldFingerprint(value: unknown): string {
  return `dpv1_${hashProfileValue(JSON.stringify(canonicalizeProfileValue(value)))}`;
}

export function getDashboardPreferenceFieldFingerprints(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const settings = (value as { settings?: unknown }).settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }

  return Object.fromEntries(
    Object.keys(settings)
      .filter((key) => PREFERENCE_FIELD_NAME_PATTERN.test(key))
      .sort()
      .flatMap((key) => {
        const fieldValue = (settings as Record<string, unknown>)[key];
        return fieldValue === undefined
          ? []
          : ([[key, getDashboardPreferenceFieldFingerprint(fieldValue)]] as const);
      })
  );
}

function getDashboardPreferenceOwnerFingerprint(ownerKey: string): string {
  return `dpo1_${hashProfileValue(ownerKey)}`;
}

export function dashboardPreferenceContextsEqual(
  left: DashboardPreferenceContext | null,
  right: DashboardPreferenceContext | null
) {
  return (
    left !== null &&
    right !== null &&
    left.installationId === right.installationId &&
    left.workspaceId === right.workspaceId &&
    left.layer === right.layer &&
    left.ownerFingerprint === right.ownerFingerprint
  );
}

export function createDashboardPreferenceContext(input: {
  installationId: string;
  layer: DashboardPreferenceLayer;
  ownerKey: string;
  workspaceId: string;
}): DashboardPreferenceContext | null {
  return parseDashboardPreferenceContext({
    installationId: input.installationId,
    layer: input.layer,
    ownerFingerprint:
      typeof input.ownerKey === 'string' && input.ownerKey.length > 0
        ? getDashboardPreferenceOwnerFingerprint(input.ownerKey)
        : '',
    workspaceId: input.workspaceId,
  });
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

export function readDashboardPreferenceReceipt(input: {
  installationId: string;
  layer: DashboardPreferenceReceipt['layer'];
  ownerKey: string;
  workspaceId: string;
}): DashboardPreferenceReceipt | null {
  return readDashboardPreferenceReceiptState(input).receipt;
}

export function readDashboardPreferenceReceiptState(input: {
  installationId: string;
  layer: DashboardPreferenceReceipt['layer'];
  ownerKey: string;
  workspaceId: string;
}): DashboardPreferenceReceiptState {
  const context = createDashboardPreferenceContext(input);
  const stored = readDashboardPreferenceReceiptCollection();
  if (!context) {
    return {
      activeContext: null,
      context: null,
      receipt: null,
      storageStatus: 'invalid',
    };
  }
  const activeContext =
    stored.collection.activeContexts.find((candidate) => candidate.layer === input.layer) ?? null;
  const receipt =
    stored.collection.receipts.find((receipt) =>
      dashboardPreferenceContextsEqual(receipt, context)
    ) ?? null;
  return {
    activeContext,
    context,
    receipt,
    storageStatus: stored.status,
  };
}

export function writeDashboardPreferenceReceipt(input: {
  installationId: string;
  layer: DashboardPreferenceReceipt['layer'];
  ownerKey: string;
  preference: unknown;
  revision: number;
  savedAt?: string;
  workspaceId: string;
}): DashboardPreferenceReceipt | null {
  const context = createDashboardPreferenceContext(input);
  if (!context) {
    throw new Error('Invalid dashboard preference context');
  }
  const receipt = parseDashboardPreferenceReceipt({
    ...context,
    fieldFingerprints: getDashboardPreferenceFieldFingerprints(input.preference),
    revision: input.revision,
    savedAt: input.savedAt ?? new Date().toISOString(),
  });
  if (!receipt) {
    throw new Error('Invalid dashboard preference receipt');
  }

  const current = readDashboardPreferenceReceiptCollection();
  if (current.status === 'invalid') {
    return null;
  }
  const receipts = current.collection.receipts.filter(
    (candidate) => !dashboardPreferenceContextsEqual(candidate, receipt)
  );
  receipts.push(receipt);
  receipts.sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt));
  const activeContexts = current.collection.activeContexts.filter(
    (candidate) => candidate.layer !== context.layer
  );
  activeContexts.push(context);
  storage.set(STORAGE_KEYS.dashboardPreferenceSync, {
    activeContexts,
    receipts: receipts.slice(0, MAX_PREFERENCE_RECEIPTS),
    version: 2,
  } satisfies DashboardPreferenceReceiptCollection);

  const verified = readDashboardPreferenceReceiptState(input);
  return verified.storageStatus === 'available' &&
    dashboardPreferenceContextsEqual(verified.activeContext, context) &&
    verified.receipt?.revision === receipt.revision &&
    verified.receipt.savedAt === receipt.savedAt &&
    JSON.stringify(verified.receipt.fieldFingerprints) === JSON.stringify(receipt.fieldFingerprints)
    ? receipt
    : null;
}

export function clearDashboardPreferenceReceipts() {
  storage.remove(STORAGE_KEYS.dashboardPreferenceSync);
}
