import { createHash, randomBytes } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { InstallationCookieNames } from './installation-cookie-scope'
import { isViteStrictSameOriginMutation } from './vite-provider-session-store'
import {
  DASHBOARD_PROFILE_ERROR_CODES,
  DASHBOARD_PROFILE_CONTRACT_VERSION,
  DASHBOARD_PROFILE_HEADERS,
  DASHBOARD_PROFILE_HISTORY_LIMIT,
  DASHBOARD_PROFILE_ID,
  type DashboardClientKind,
  type DashboardClientRegistryEntry,
  type DashboardPreferenceDocument,
  type DashboardPreferenceScope,
  type DashboardProfileAuthor,
  type DashboardProfileClient,
  type DashboardProfileHistoryEntry,
  type DashboardProfilePatchOperation,
  type DashboardProfilePrincipal,
  type DashboardProfileRecovery,
  type DashboardProfileRevisionMetadata,
  type DashboardWorkspaceIdentity,
} from '../packages/app/src/services/dashboard-profile.contract'

export interface DashboardProfileData {
  app: 'navet'
  version: 3
  exportedAt?: string
  [key: string]: unknown
}

export interface DashboardProfileMetadata {
  etag: string
  lastModified: string
}

export interface ViteDashboardProfilePrincipal extends DashboardProfilePrincipal {
  tenantId: string
  sessionId: string
}

interface DashboardWorkspaceTenantBinding {
  providerId: 'home_assistant'
  tenantId: string
  enrolledAt: string
}

interface PersistedDashboardWorkspace extends DashboardWorkspaceIdentity {
  tenantBinding?: DashboardWorkspaceTenantBinding
}

interface PersistedProfileState {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  revision: number
  generation: string
  status: 'uninitialized' | 'active' | 'reset'
  resetRevision: number | null
  metadata: DashboardProfileRevisionMetadata | null
  profileHash?: string | null
  latestRecoverableRevision?: number | null
}

interface PersistedHistoryEntry {
  metadata: DashboardProfileRevisionMetadata
  profile: DashboardProfileData | null
  profileHash?: string | null
}

interface PreferenceCollection {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  records: Record<string, DashboardPreferenceDocument>
}

interface BoundDashboardProfileClient extends DashboardProfileClient {
  bindingId: string
}

interface PersistedDashboardClientRegistryEntry
  extends DashboardClientRegistryEntry {
  bindingId?: string
}

interface RegistryCollection {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  workspaceId: string
  clients: PersistedDashboardClientRegistryEntry[]
  preferenceCollectionVersion?: 1
}

interface ClientBindingBootstrapRecord {
  key: string
  bindingId: string
  expiresAt: number
}

interface ClientBindingBootstrapCollection {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  records: ClientBindingBootstrapRecord[]
}

interface StorePaths {
  profile: string
  workspace: string
  state: string
  history: string
  accountPreferences: string
  clientPreferences: string
  clients: string
  clientBindingBootstrap: string
}

const MAX_PROFILE_BYTES = 1024 * 1024
const MAX_HISTORY_BYTES = 4 * 1024 * 1024
const MAX_PREFERENCE_BYTES = 256 * 1024
const MAX_PREFERENCE_COLLECTION_BYTES = 4 * 1024 * 1024
const MAX_WORKSPACE_BYTES = 128 * 1024
const MAX_PROFILE_STATE_BYTES = 128 * 1024
const MAX_CLIENT_REGISTRY_BYTES = 512 * 1024
const MAX_CLIENT_BINDING_BOOTSTRAP_BYTES = 128 * 1024
const CLIENT_REGISTRY_LIMIT = 200
const MAX_PATCH_OPERATIONS = 200
const PROFILE_HASH_PATTERN = /^[a-f0-9]{64}$/
const CLIENT_TOUCH_INTERVAL_MS = 15 * 60 * 1000
const TENANT_ID_PATTERN = /^hat_[a-f0-9]{64}$/
const CLIENT_BINDING_COOKIE_NAME = 'navet_profile_client'
const CLIENT_BINDING_PATTERN = /^[a-f0-9]{64}$/
const CLIENT_BINDING_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
const CLIENT_STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000
// Tolerate brief host clock skew, but reset timestamps beyond this window to
// the current server time so they cannot retain a registry slot indefinitely.
const CLIENT_FUTURE_SKEW_MS = 5 * 60 * 1000
const CLIENT_BINDING_BOOTSTRAP_TTL_MS = 5 * 1000
const CLIENT_BINDING_BOOTSTRAP_LIMIT = 256
const SHARED_SETTING_KEYS = [
  'showWeatherInHeader',
  'showHomeSummaryBar',
  'weatherForecastMode',
  'weatherMetricIds',
  'advancedCustomizationEnabled',
  'customSidebarActions',
  'customSummaryPills',
] as const
const ACCOUNT_SETTING_KEYS = [
  'language',
  'showNotifications',
  'use24HourTime',
  'temperatureUnit',
  'defaultView',
  'entityInteractionMode',
] as const
const CLIENT_SETTING_KEYS = [
  'headerTitleMode',
  'headerCustomText',
  'keepDeviceAwake',
  'compactMode',
  'kioskMode',
  'dashboardProfileMode',
  'dashboardSpaceMode',
  'disableAnimations',
  'lowPowerMode',
  'effectsQuality',
  'effectsQualityUserOverride',
  'cameraDashboardViewMode',
  'cameraViewModes',
  'cameraStreamPreference',
  'cameraStreamPreferences',
  'cameraFitMode',
  'cameraFitModes',
  'ambientLightBleed',
] as const

const SYSTEM_AUTHOR: DashboardProfileAuthor = {
  id: 'legacy-import',
  name: 'Imported dashboard',
  kind: 'unknown',
  providerId: 'system',
  userId: null,
  userName: null,
}

export function createDashboardProfileGeneration(): string {
  return `nvg_${randomBytes(20).toString('hex')}`
}

function createId(prefix: string): string {
  return `${prefix}_${randomBytes(20).toString('hex')}`
}

export function isValidDashboardProfileData(value: unknown): value is DashboardProfileData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const profile = value as Partial<DashboardProfileData>
  return profile.app === 'navet' && profile.version === 3
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isCredentialFieldName(value: string): boolean {
  const normalized = value.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return (
    normalized.includes('token') ||
    normalized.includes('password') ||
    normalized.includes('passwd') ||
    normalized.includes('passcode') ||
    normalized.includes('jwt') ||
    normalized.includes('secret') ||
    normalized.includes('credential') ||
    normalized === 'key' ||
    normalized === 'sig' ||
    normalized === 'pin' ||
    normalized === 'code' ||
    normalized === 'authorization' ||
    normalized === 'auth' ||
    normalized === 'authsig' ||
    normalized.includes('signature') ||
    normalized === 'bearer' ||
    normalized === 'accesskey' ||
    normalized === 'accesscode' ||
    normalized === 'privatekey' ||
    normalized.endsWith('apikey') ||
    (normalized.startsWith('api') && normalized.endsWith('key'))
  )
}

function isCredentialBearingUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }
  try {
    const url = new URL(value, 'https://navet.invalid')
    const fragment = url.hash.slice(1)
    const fragmentParameters = fragment.includes('?')
      ? fragment.slice(fragment.indexOf('?') + 1)
      : fragment
    return (
      Boolean(url.username || url.password) ||
      Array.from(url.searchParams.keys()).some(isCredentialFieldName) ||
      Array.from(new URLSearchParams(fragmentParameters).keys()).some(isCredentialFieldName)
    )
  } catch {
    return false
  }
}

function sanitizeCredentialBearingValue(value: unknown, depth = 0): unknown {
  if (depth > 16) {
    return undefined
  }
  if (typeof value === 'string') {
    return isCredentialBearingUrl(value) ? undefined : value
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const sanitized = sanitizeCredentialBearingValue(entry, depth + 1)
      return sanitized === undefined ? [] : [sanitized]
    })
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        if (isCredentialFieldName(key)) {
          return []
        }
        const sanitized = sanitizeCredentialBearingValue(entry, depth + 1)
        return sanitized === undefined ? [] : [[key, sanitized]]
      })
    )
  }
  return value
}

function sanitizeSharedExtensionList(value: unknown, urlKey: string): unknown[] {
  return Array.isArray(value)
    ? cloneJson(
        value.filter(
          (entry) => !isRecord(entry) || !isCredentialBearingUrl(entry[urlKey])
        )
      )
    : []
}

function normalizeDashboardCollections(profile: DashboardProfileData): void {
  delete profile.cardOrders

  const cardZonesSource =
    isRecord(profile.cardZones) &&
    isRecord(profile.cardZones.state) &&
    isRecord(profile.cardZones.state.cardZones)
      ? profile.cardZones.state.cardZones
      : profile.cardZones
  if (isRecord(cardZonesSource)) {
    const cardZones = Object.fromEntries(
      Object.entries(cardZonesSource).filter(
        ([, zone]) => typeof zone === 'string' && zone.length > 0
      )
    )
    if (Object.keys(cardZones).length > 0) {
      profile.cardZones = cardZones
    } else {
      delete profile.cardZones
    }
  }
}

export function sanitizeDashboardProfileData(
  profile: DashboardProfileData
): DashboardProfileData {
  const sanitized = cloneJson(profile)
  normalizeDashboardCollections(sanitized)
  const sourceSettings = isRecord(sanitized.settings) ? sanitized.settings : {}
  const settings = Object.fromEntries(
    SHARED_SETTING_KEYS.flatMap((key) =>
      Object.hasOwn(sourceSettings, key) && sourceSettings[key] !== undefined
        ? [[key, cloneJson(sourceSettings[key])]]
        : []
    )
  )

  if (Object.hasOwn(settings, 'customSidebarActions')) {
    settings.customSidebarActions = sanitizeSharedExtensionList(
      settings.customSidebarActions,
      'targetUrl'
    )
  }
  if (Object.hasOwn(settings, 'customSummaryPills')) {
    settings.customSummaryPills = sanitizeSharedExtensionList(
      settings.customSummaryPills,
      'actionUrl'
    )
  }
  if (Object.hasOwn(sanitized, 'settings')) {
    sanitized.settings = settings
  }
  const credentialSafeProfile = sanitizeCredentialBearingValue(sanitized)
  return isValidDashboardProfileData(credentialSafeProfile)
    ? credentialSafeProfile
    : sanitized
}

const PROFILE_COMPARISON_IGNORED_ROOT_KEYS = new Set([
  'cardOrders',
  'exportedAt',
  'navigation',
])

function stableSerializeProfileValue(value: unknown, root = false): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerializeProfileValue(entry)).join(',')}]`
  }
  if (isRecord(value)) {
    const keys = Object.keys(value)
      .filter((key) => !root || !PROFILE_COMPARISON_IGNORED_ROOT_KEYS.has(key))
      .sort()
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableSerializeProfileValue(value[key])}`
      )
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function areDashboardProfilesEquivalent(
  current: DashboardProfileData,
  candidate: DashboardProfileData
): boolean {
  return (
    stableSerializeProfileValue(current, true) ===
    stableSerializeProfileValue(candidate, true)
  )
}

function hashDashboardProfile(profile: DashboardProfileData): string {
  return createHash('sha256').update(JSON.stringify(profile)).digest('hex')
}

function pickPreferenceSettings(
  value: unknown,
  allowedKeys: readonly string[]
): Record<string, unknown> {
  const source = isRecord(value) ? value : {}
  return Object.fromEntries(
    allowedKeys.flatMap((key) =>
      Object.hasOwn(source, key) && source[key] !== undefined
        ? (() => {
            const sanitized = sanitizeCredentialBearingValue(source[key])
            return sanitized === undefined ? [] : [[key, sanitized]]
          })()
        : []
    )
  )
}

export function sanitizeDashboardPreferenceValues(
  value: Record<string, unknown>,
  scope: DashboardPreferenceScope
): Record<string, unknown> {
  const allowedKeys = scope === 'account' ? ACCOUNT_SETTING_KEYS : CLIENT_SETTING_KEYS
  if (isRecord(value.settings)) {
    return {
      schemaVersion: Number.isSafeInteger(value.schemaVersion)
        ? value.schemaVersion
        : 1,
      settings: pickPreferenceSettings(value.settings, allowedKeys),
    }
  }
  return pickPreferenceSettings(value, allowedKeys)
}

export function buildDashboardProfileMetadata(
  serializedProfile: string,
  stat: { mtimeMs: number; mtime: Date }
): DashboardProfileMetadata {
  const parsed = JSON.parse(serializedProfile) as Partial<DashboardProfileData>
  const exportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : 'unknown'

  return {
    etag: `"${stat.mtimeMs}-${serializedProfile.length}-${exportedAt}"`,
    lastModified: stat.mtime.toUTCString(),
  }
}

function buildRevisionMetadata(
  workspace: DashboardWorkspaceIdentity,
  state: PersistedProfileState
): DashboardProfileMetadata {
  const candidateUpdatedAt = state.metadata?.updatedAt ?? workspace.createdAt
  const updatedAt = Number.isFinite(Date.parse(candidateUpdatedAt))
    ? candidateUpdatedAt
    : new Date().toISOString()
  return {
    etag: `"navet-${workspace.workspaceId}-${state.revision}"`,
    lastModified: new Date(updatedAt).toUTCString(),
  }
}

function resolveStorePaths(profileFilePath: string): StorePaths {
  return {
    profile: profileFilePath,
    workspace: `${profileFilePath}.workspace`,
    state: `${profileFilePath}.state`,
    history: `${profileFilePath}.history`,
    accountPreferences: `${profileFilePath}.account-preferences`,
    clientPreferences: `${profileFilePath}.client-preferences`,
    clients: `${profileFilePath}.clients`,
    clientBindingBootstrap: `${profileFilePath}.client-binding-bootstrap`,
  }
}

class DashboardProfileStorageReadError extends Error {}

class DashboardProfileStorageCapacityError extends Error {}

class DashboardClientCapacityError extends Error {}

class DashboardProfileWriteLimitError extends Error {}

type StoredProfileResult =
  | {
      status: 'present'
      profile: DashboardProfileData
      profileHash: string
      needsRewrite: boolean
    }
  | {
      status: 'missing' | 'invalid'
      profile: null
      profileHash: null
      needsRewrite: false
    }

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

function readJson<T>(filePath: string, fallback: T, maxBytes: number): T {
  try {
    if (statSync(filePath).size > maxBytes) {
      throw new DashboardProfileStorageReadError(
        `Dashboard profile storage cannot be read safely: ${filePath}`
      )
    }
    return JSON.parse(readFileSync(filePath, 'utf8')) as T
  } catch (error) {
    if (isMissingFileError(error)) {
      return fallback
    }
    if (error instanceof DashboardProfileStorageReadError) {
      throw error
    }
    throw new DashboardProfileStorageReadError(
      `Dashboard profile storage cannot be read safely: ${filePath}`
    )
  }
}

function writeJson(filePath: string, value: unknown): void {
  const directory = path.dirname(filePath)
  const temporaryPath = `${filePath}.tmp`
  mkdirSync(directory, { recursive: true })
  writeFileSync(temporaryPath, JSON.stringify(value), 'utf8')
  renameSync(temporaryPath, filePath)
}

function pruneHistoryBySerializedSize(
  history: PersistedHistoryEntry[]
): PersistedHistoryEntry[] {
  const candidates = history.slice(-DASHBOARD_PROFILE_HISTORY_LIMIT)
  const retained: PersistedHistoryEntry[] = []
  let serializedBytes = 2
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const entryBytes = Buffer.byteLength(JSON.stringify(candidates[index]), 'utf8')
    const nextBytes = serializedBytes + entryBytes + (retained.length > 0 ? 1 : 0)
    if (retained.length > 0 && nextBytes > MAX_HISTORY_BYTES) {
      break
    }
    retained.unshift(candidates[index])
    serializedBytes = nextBytes
  }
  return retained
}

function validWorkspace(value: unknown): value is PersistedDashboardWorkspace {
  const workspace = value as Partial<DashboardWorkspaceIdentity> | null
  return Boolean(
    workspace &&
      workspace.contractVersion === DASHBOARD_PROFILE_CONTRACT_VERSION &&
      typeof workspace.installationId === 'string' &&
      typeof workspace.workspaceId === 'string' &&
      workspace.defaultProfileId === DASHBOARD_PROFILE_ID &&
      typeof workspace.createdAt === 'string'
  )
}

function validTenantBinding(value: unknown): value is DashboardWorkspaceTenantBinding {
  const binding = value as Partial<DashboardWorkspaceTenantBinding> | null
  return Boolean(
    binding &&
      binding.providerId === 'home_assistant' &&
      typeof binding.tenantId === 'string' &&
      TENANT_ID_PATTERN.test(binding.tenantId) &&
      typeof binding.enrolledAt === 'string' &&
      Number.isFinite(Date.parse(binding.enrolledAt))
  )
}

function publicWorkspace(
  workspace: PersistedDashboardWorkspace
): DashboardWorkspaceIdentity {
  return {
    contractVersion: workspace.contractVersion,
    installationId: workspace.installationId,
    workspaceId: workspace.workspaceId,
    defaultProfileId: workspace.defaultProfileId,
    createdAt: workspace.createdAt,
  }
}

function validRevisionMetadata(
  value: unknown,
  workspace?: PersistedDashboardWorkspace
): value is DashboardProfileRevisionMetadata {
  const metadata = value as Partial<DashboardProfileRevisionMetadata> | null
  return Boolean(
    metadata &&
      metadata.contractVersion === DASHBOARD_PROFILE_CONTRACT_VERSION &&
      typeof metadata.installationId === 'string' &&
      typeof metadata.workspaceId === 'string' &&
      metadata.profileId === DASHBOARD_PROFILE_ID &&
      Number.isSafeInteger(metadata.revision) &&
      Number(metadata.revision) > 0 &&
      typeof metadata.generation === 'string' &&
      (metadata.kind === 'update' ||
        metadata.kind === 'patch' ||
        metadata.kind === 'reset' ||
        metadata.kind === 'restore') &&
      typeof metadata.updatedAt === 'string' &&
      Number.isFinite(Date.parse(metadata.updatedAt)) &&
      metadata.author &&
      typeof metadata.author.id === 'string' &&
      typeof metadata.author.name === 'string' &&
      typeof metadata.author.kind === 'string' &&
      typeof metadata.author.providerId === 'string' &&
      Array.isArray(metadata.changedPaths) &&
      metadata.changedPaths.every(
        (entry) => typeof entry === 'string' && entry.startsWith('/')
      ) &&
      (!workspace ||
        (metadata.installationId === workspace.installationId &&
          metadata.workspaceId === workspace.workspaceId))
  )
}

function validState(
  value: unknown,
  workspace?: PersistedDashboardWorkspace
): value is PersistedProfileState {
  const state = value as Partial<PersistedProfileState> | null
  if (
    !state ||
    state.contractVersion !== DASHBOARD_PROFILE_CONTRACT_VERSION ||
    !Number.isSafeInteger(state.revision) ||
    Number(state.revision) < 0 ||
    typeof state.generation !== 'string' ||
    (state.status !== 'uninitialized' &&
      state.status !== 'active' &&
      state.status !== 'reset')
  ) {
    return false
  }
  if (
    state.metadata !== null &&
    (!validRevisionMetadata(state.metadata, workspace) ||
      state.metadata.revision !== state.revision ||
      state.metadata.generation !== state.generation)
  ) {
    return false
  }
  if (
    state.revision === 0
      ? state.status !== 'uninitialized' || state.metadata !== null
      : state.metadata === null || state.status === 'uninitialized'
  ) {
    return false
  }
  if (
    state.status === 'reset'
      ? state.resetRevision !== state.revision
      : state.resetRevision !== null
  ) {
    return false
  }
  if (
    state.metadata &&
    (state.status === 'reset'
      ? state.metadata.kind !== 'reset'
      : state.metadata.kind === 'reset')
  ) {
    return false
  }
  if (
    Object.hasOwn(state, 'profileHash') &&
    (state.status === 'active'
      ? typeof state.profileHash !== 'string' ||
        !PROFILE_HASH_PATTERN.test(state.profileHash)
      : state.profileHash !== null)
  ) {
    return false
  }
  if (
    Object.hasOwn(state, 'latestRecoverableRevision') &&
    state.latestRecoverableRevision !== null &&
    (!Number.isSafeInteger(state.latestRecoverableRevision) ||
      Number(state.latestRecoverableRevision) <= 0 ||
      Number(state.latestRecoverableRevision) > Number(state.revision))
  ) {
    return false
  }
  return true
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function decodePointer(pointer: string): string[] {
  if (pointer === '') {
    return []
  }
  if (!pointer.startsWith('/')) {
    throw new Error('Invalid JSON pointer')
  }
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => {
      const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~')
      if (
        decoded === '__proto__' ||
        decoded === 'prototype' ||
        decoded === 'constructor'
      ) {
        throw new Error('Unsafe JSON pointer')
      }
      return decoded
    })
}

export function applyDashboardProfilePatch(
  source: DashboardProfileData,
  operations: DashboardProfilePatchOperation[]
): DashboardProfileData {
  if (!Array.isArray(operations) || operations.length > MAX_PATCH_OPERATIONS) {
    throw new Error('Unsupported dashboard patch')
  }

  let document: unknown = cloneJson(source)
  for (const operation of operations) {
    const segments = decodePointer(operation.path)
    if (segments.length === 0) {
      if (operation.op === 'remove') {
        throw new Error('The profile root cannot be removed')
      }
      document = cloneJson(operation.value)
      continue
    }

    let parent = document as Record<string, unknown> | unknown[]
    for (const segment of segments.slice(0, -1)) {
      if (
        parent === null ||
        typeof parent !== 'object' ||
        !Object.prototype.hasOwnProperty.call(parent, segment)
      ) {
        throw new Error('Patch path does not exist')
      }
      parent = (parent as Record<string, Record<string, unknown> | unknown[]>)[segment]
    }

    const key = segments.at(-1)!
    if (Array.isArray(parent)) {
      if (operation.op === 'add' && key === '-') {
        parent.push(cloneJson(operation.value))
        continue
      }
      if (!/^\d+$/.test(key)) {
        throw new Error('Invalid array index')
      }
      const index = Number.parseInt(key, 10)
      if (operation.op === 'add') {
        if (index > parent.length) {
          throw new Error('Patch array index is out of range')
        }
        parent.splice(index, 0, cloneJson(operation.value))
      } else if (index >= parent.length) {
        throw new Error('Patch array index is out of range')
      } else if (operation.op === 'remove') {
        parent.splice(index, 1)
      } else {
        parent[index] = cloneJson(operation.value)
      }
      continue
    }

    if (!parent || typeof parent !== 'object') {
      throw new Error('Patch parent is not an object')
    }
    if (operation.op === 'remove') {
      if (!Object.prototype.hasOwnProperty.call(parent, key)) {
        throw new Error('Patch path does not exist')
      }
      delete (parent as Record<string, unknown>)[key]
    } else {
      if (
        operation.op === 'replace' &&
        !Object.prototype.hasOwnProperty.call(parent, key)
      ) {
        throw new Error('Patch path does not exist')
      }
      ;(parent as Record<string, unknown>)[key] = cloneJson(operation.value)
    }
  }

  if (!isValidDashboardProfileData(document)) {
    throw new Error('Dashboard patch produced an invalid profile')
  }
  return document
}

function publicPrincipal(principal: ViteDashboardProfilePrincipal): DashboardProfilePrincipal {
  return {
    providerId: principal.providerId.slice(0, 64),
    userId: principal.userId?.slice(0, 128) ?? null,
    userName: principal.userName?.slice(0, 120) ?? null,
  }
}

function principalKey(principal: ViteDashboardProfilePrincipal): string {
  const identity = principal.userId
    ? `user:${principal.userId.slice(0, 128)}`
    : `session:${principal.sessionId.slice(0, 128)}`
  return `${principal.providerId.slice(0, 64)}|${identity}`
}

export function createViteDashboardProfileStore(
  profileFilePath = path.resolve(process.cwd(), '.cache', 'navet-dashboard-profile.json')
) {
  const paths = resolveStorePaths(profileFilePath)

  const readOrCreateWorkspace = (): PersistedDashboardWorkspace => {
    const existing = readJson<unknown>(
      paths.workspace,
      null,
      MAX_WORKSPACE_BYTES
    )
    if (validWorkspace(existing)) {
      return existing
    }
    const workspace: PersistedDashboardWorkspace = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      installationId: createId('nvi'),
      workspaceId: createId('nvw'),
      defaultProfileId: DASHBOARD_PROFILE_ID,
      createdAt: new Date().toISOString(),
    }
    writeJson(paths.workspace, workspace)
    return workspace
  }

  const authorizePrincipal = (
    principal: ViteDashboardProfilePrincipal
  ): boolean => {
    if (
      principal.providerId !== 'home_assistant' ||
      !TENANT_ID_PATTERN.test(principal.tenantId)
    ) {
      return false
    }

    const workspace = readOrCreateWorkspace()
    if (workspace.tenantBinding === undefined) {
      // Legacy workspaces did not persist an HA tenant. Enroll only from the
      // server-resolved authenticated principal; request headers and client IDs
      // are intentionally excluded from this trust decision.
      writeJson(paths.workspace, {
        ...workspace,
        tenantBinding: {
          providerId: 'home_assistant',
          tenantId: principal.tenantId,
          enrolledAt: new Date().toISOString(),
        },
      } satisfies PersistedDashboardWorkspace)
      return true
    }

    return (
      validTenantBinding(workspace.tenantBinding) &&
      workspace.tenantBinding.providerId === principal.providerId &&
      workspace.tenantBinding.tenantId === principal.tenantId
    )
  }

  const readProfileFile = (): StoredProfileResult => {
    try {
      if (statSync(paths.profile).size > MAX_PROFILE_BYTES) {
        throw new DashboardProfileStorageReadError(
          `Dashboard profile storage cannot be read safely: ${paths.profile}`
        )
      }
      const serialized = readFileSync(paths.profile, 'utf8')
      const parsed = JSON.parse(serialized)
      if (!isValidDashboardProfileData(parsed)) {
        return {
          status: 'invalid',
          profile: null,
          profileHash: null,
          needsRewrite: false,
        }
      }
      const sanitized = sanitizeDashboardProfileData(parsed)
      return {
        status: 'present',
        profile: sanitized,
        profileHash: hashDashboardProfile(sanitized),
        needsRewrite: JSON.stringify(sanitized) !== JSON.stringify(parsed),
      }
    } catch (error) {
      if (isMissingFileError(error)) {
        return {
          status: 'missing',
          profile: null,
          profileHash: null,
          needsRewrite: false,
        }
      }
      if (error instanceof DashboardProfileStorageReadError) {
        throw error
      }
      throw new DashboardProfileStorageReadError(
        `Dashboard profile storage cannot be read safely: ${paths.profile}`
      )
    }
  }

  const getHistory = (): PersistedHistoryEntry[] => {
    const history = readJson<unknown>(
      paths.history,
      [],
      MAX_HISTORY_BYTES
    )
    if (!Array.isArray(history)) {
      return []
    }
    let changed = false
    const sanitizedCandidates: PersistedHistoryEntry[] = []
    for (const entry of history as PersistedHistoryEntry[]) {
      if (!entry || !validRevisionMetadata(entry.metadata)) {
        changed = true
        continue
      }
      if (entry.profile === null) {
        if (entry.profileHash !== null) {
          changed = true
        }
        sanitizedCandidates.push({
          metadata: entry.metadata,
          profile: null,
          profileHash: null,
        })
        continue
      }
      if (!isValidDashboardProfileData(entry.profile)) {
        changed = true
        continue
      }
      const profile = sanitizeDashboardProfileData(entry.profile)
      const serializedProfile = JSON.stringify(profile)
      if (Buffer.byteLength(serializedProfile, 'utf8') > MAX_PROFILE_BYTES) {
        changed = true
        continue
      }
      const profileHash = hashDashboardProfile(profile)
      if (
        serializedProfile !== JSON.stringify(entry.profile) ||
        entry.profileHash !== profileHash
      ) {
        changed = true
      }
      sanitizedCandidates.push({
        metadata: entry.metadata,
        profile,
        profileHash,
      })
    }
    const sanitizedHistory = pruneHistoryBySerializedSize(sanitizedCandidates)
    if (sanitizedHistory.length !== history.length) {
      changed = true
    }
    if (changed) {
      writeJson(paths.history, sanitizedHistory)
    }
    return sanitizedHistory
  }

  const historyEntryMatchesState = (
    entry: PersistedHistoryEntry,
    state: PersistedProfileState
  ): boolean => {
    if (
      !state.metadata ||
      entry.metadata.installationId !== state.metadata.installationId ||
      entry.metadata.workspaceId !== state.metadata.workspaceId ||
      entry.metadata.profileId !== state.metadata.profileId ||
      entry.metadata.revision !== state.revision ||
      entry.metadata.generation !== state.generation
    ) {
      return false
    }
    if (state.status === 'reset') {
      return entry.profile === null
    }
    if (state.status !== 'active' || !entry.profile) {
      return false
    }
    return (
      typeof state.profileHash !== 'string' ||
      !PROFILE_HASH_PATTERN.test(state.profileHash) ||
      entry.profileHash === state.profileHash
    )
  }

  const getCommittedHistory = (
    state: PersistedProfileState
  ): PersistedHistoryEntry[] =>
    getHistory().filter(
      (entry) =>
        Boolean(
          state.metadata &&
            entry.metadata.installationId === state.metadata.installationId &&
            entry.metadata.workspaceId === state.metadata.workspaceId &&
            entry.metadata.profileId === state.metadata.profileId &&
            (entry.metadata.revision < state.revision ||
              (entry.metadata.revision === state.revision &&
                historyEntryMatchesState(entry, state)))
        )
    )

  const latestRecoverableRevision = (
    state: PersistedProfileState
  ): number | null => {
    if (
      Number.isSafeInteger(state.latestRecoverableRevision) &&
      Number(state.latestRecoverableRevision) > 0 &&
      Number(state.latestRecoverableRevision) <= state.revision
    ) {
      return Number(state.latestRecoverableRevision)
    }
    return (
      getCommittedHistory(state)
        .slice()
        .reverse()
        .find((entry) => entry.profile)?.metadata.revision ?? null
    )
  }

  const stageHistoryRevision = (
    currentState: PersistedProfileState,
    currentProfile: DashboardProfileData | null,
    metadata: DashboardProfileRevisionMetadata,
    nextProfile: DashboardProfileData | null
  ): void => {
    const newestByRevision = new Map<number, PersistedHistoryEntry>()
    for (const entry of getHistory()) {
      if (
        entry.metadata.installationId === metadata.installationId &&
        entry.metadata.workspaceId === metadata.workspaceId &&
        entry.metadata.profileId === metadata.profileId &&
        entry.metadata.revision < metadata.revision
      ) {
        newestByRevision.set(entry.metadata.revision, entry)
      }
    }
    const retained = [...newestByRevision.values()]
    if (
      currentState.revision < metadata.revision &&
      currentState.status === 'active' &&
      currentProfile
    ) {
      const currentProfileHash = hashDashboardProfile(currentProfile)
      const hasCurrentSnapshot = retained.some(
        (entry) =>
          entry.metadata.revision === currentState.revision &&
          entry.metadata.generation === currentState.generation &&
          entry.profileHash === currentProfileHash
      )
      if (!hasCurrentSnapshot && currentState.metadata) {
        retained.push({
          metadata: currentState.metadata,
          profile: currentProfile,
          profileHash: currentProfileHash,
        })
      }
    }
    const nextProfileHash = nextProfile
      ? hashDashboardProfile(nextProfile)
      : null
    retained.push({
      metadata,
      profile: nextProfile,
      profileHash: nextProfileHash,
    })
    retained.sort(
      (left, right) => left.metadata.revision - right.metadata.revision
    )
    const staged = pruneHistoryBySerializedSize(retained)
    const candidateRetained = staged.some(
      (entry) =>
        entry.metadata.revision === metadata.revision &&
        entry.metadata.generation === metadata.generation &&
        entry.profileHash === nextProfileHash
    )
    const currentRetained =
      currentState.status !== 'active' ||
      currentState.revision >= metadata.revision ||
      (currentProfile !== null &&
        staged.some(
          (entry) =>
            entry.metadata.revision === currentState.revision &&
            entry.metadata.generation === currentState.generation &&
            entry.profileHash === hashDashboardProfile(currentProfile)
        ))
    if (!candidateRetained || !currentRetained) {
      throw new DashboardProfileStorageCapacityError(
        'Dashboard profile history cannot retain the commit boundary'
      )
    }
    writeJson(paths.history, staged)
  }

  const getState = (): PersistedProfileState => {
    const workspace = readOrCreateWorkspace()
    const existing = readJson<unknown>(
      paths.state,
      null,
      MAX_PROFILE_STATE_BYTES
    )
    if (validState(existing, workspace)) {
      return existing
    }

    const history = getHistory()
      .filter(
        (entry) =>
          entry.metadata.installationId === workspace.installationId &&
          entry.metadata.workspaceId === workspace.workspaceId &&
          entry.metadata.profileId === DASHBOARD_PROFILE_ID
      )
      .slice()
      .sort((left, right) => left.metadata.revision - right.metadata.revision)
    const latest = history.at(-1)
    if (latest) {
      const recovered: PersistedProfileState = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        revision: latest.metadata.revision,
        generation: latest.metadata.generation,
        status: latest.profile ? 'active' : 'reset',
        resetRevision: latest.profile ? null : latest.metadata.revision,
        metadata: latest.metadata,
        profileHash: latest.profileHash ?? null,
        latestRecoverableRevision:
          history
            .slice()
            .reverse()
            .find((entry) => entry.profile)?.metadata.revision ?? null,
      }
      if (latest.profile) {
        writeJson(paths.profile, latest.profile)
      } else {
        rmSync(paths.profile, { force: true })
      }
      writeJson(paths.state, recovered)
      return recovered
    }

    const legacyProfileResult = readProfileFile()
    if (legacyProfileResult.status === 'present') {
      const legacyProfile = legacyProfileResult.profile
      const metadata: DashboardProfileRevisionMetadata = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        installationId: workspace.installationId,
        workspaceId: workspace.workspaceId,
        profileId: DASHBOARD_PROFILE_ID,
        revision: 1,
        generation: createDashboardProfileGeneration(),
        kind: 'update',
        updatedAt:
          legacyProfile.exportedAt && Number.isFinite(Date.parse(legacyProfile.exportedAt))
            ? legacyProfile.exportedAt
            : new Date().toISOString(),
        author: SYSTEM_AUTHOR,
        changedPaths: ['/'],
      }
      const migrated: PersistedProfileState = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        revision: 1,
        generation: metadata.generation,
        status: 'active',
        resetRevision: null,
        metadata,
        profileHash: legacyProfileResult.profileHash,
        latestRecoverableRevision: 1,
      }
      stageHistoryRevision(
        {
          contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
          revision: 0,
          generation: createDashboardProfileGeneration(),
          status: 'uninitialized',
          resetRevision: null,
          metadata: null,
          profileHash: null,
          latestRecoverableRevision: null,
        },
        null,
        metadata,
        legacyProfile
      )
      writeJson(paths.profile, legacyProfile)
      writeJson(paths.state, migrated)
      return migrated
    }

    const initial: PersistedProfileState = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      revision: 0,
      generation: createDashboardProfileGeneration(),
      status: 'uninitialized',
      resetRevision: null,
      metadata: null,
      profileHash: null,
      latestRecoverableRevision: null,
    }
    writeJson(paths.state, initial)
    return initial
  }

  const getProfileForState = (
    state: PersistedProfileState
  ): DashboardProfileData | null => {
    if (state.status !== 'active') {
      return null
    }
    const profileResult = readProfileFile()
    if (
      typeof state.profileHash === 'string' &&
      PROFILE_HASH_PATTERN.test(state.profileHash) &&
      profileResult.status === 'present' &&
      profileResult.profileHash === state.profileHash
    ) {
      if (profileResult.needsRewrite) {
        try {
          writeJson(paths.profile, profileResult.profile)
        } catch {
          // The sanitized profile still matches the committed digest.
        }
      }
      return profileResult.profile
    }

    const history = getHistory().filter(
      (entry) =>
        state.metadata &&
        entry.metadata.installationId === state.metadata.installationId &&
        entry.metadata.workspaceId === state.metadata.workspaceId &&
        entry.metadata.profileId === state.metadata.profileId
    )
    const historyEntry = history
      .slice()
      .reverse()
      .find((entry) => historyEntryMatchesState(entry, state))
    if (historyEntry?.profile) {
      try {
        writeJson(paths.profile, historyEntry.profile)
      } catch {
        // The exact history snapshot remains safe to serve.
      }
      if (
        typeof state.profileHash !== 'string' ||
        !PROFILE_HASH_PATTERN.test(state.profileHash)
      ) {
        try {
          writeJson(paths.state, {
            ...state,
            profileHash: historyEntry.profileHash,
            latestRecoverableRevision: state.revision,
          } satisfies PersistedProfileState)
        } catch {
          // Legacy state remains readable through the exact history snapshot.
        }
      }
      return historyEntry.profile
    }

    if (
      (typeof state.profileHash !== 'string' ||
        !PROFILE_HASH_PATTERN.test(state.profileHash)) &&
      profileResult.status === 'present' &&
      !history.some((entry) => entry.metadata.revision > state.revision) &&
      state.metadata
    ) {
      try {
        const legacyState = {
          ...state,
          profileHash: profileResult.profileHash,
          latestRecoverableRevision: state.revision,
        } satisfies PersistedProfileState
        stageHistoryRevision(
          legacyState,
          profileResult.profile,
          state.metadata,
          profileResult.profile
        )
        writeJson(paths.state, legacyState)
      } catch {
        // The legacy profile remains the only available committed snapshot.
      }
      return profileResult.profile
    }
    return null
  }

  const getProfile = (): DashboardProfileData | null =>
    getProfileForState(getState())

  const getRecovery = (): DashboardProfileRecovery => {
    const state = getState()
    if (state.status === 'reset') {
      return {
        status: 'reset',
        resetRevision: state.resetRevision,
        latestRecoverableRevision: latestRecoverableRevision(state),
      }
    }
    if (state.status === 'uninitialized') {
      return {
        status: 'uninitialized',
        resetRevision: null,
        latestRecoverableRevision: latestRecoverableRevision(state),
      }
    }
    if (getProfileForState(state)) {
      return {
        status: 'active',
        resetRevision: null,
        latestRecoverableRevision: state.revision,
      }
    }
    const recoverableRevision = latestRecoverableRevision(state)
    return {
      status: recoverableRevision === null ? 'missing' : 'recoverable',
      resetRevision: null,
      latestRecoverableRevision: recoverableRevision,
    }
  }

  const persistRevision = (
    profile: DashboardProfileData | null,
    author: DashboardProfileAuthor,
    kind: DashboardProfileRevisionMetadata['kind'],
    changedPaths: string[],
    restoredFromRevision?: number
  ) => {
    const workspace = readOrCreateWorkspace()
    const current = getState()
    const currentProfile = getProfileForState(current)
    const metadata: DashboardProfileRevisionMetadata = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      installationId: workspace.installationId,
      workspaceId: workspace.workspaceId,
      profileId: DASHBOARD_PROFILE_ID,
      revision: current.revision + 1,
      generation:
        kind === 'reset' ? createDashboardProfileGeneration() : current.generation,
      kind,
      updatedAt: new Date().toISOString(),
      author,
      changedPaths,
      ...(restoredFromRevision === undefined ? {} : { restoredFromRevision }),
    }
    const sanitizedProfile = profile ? sanitizeDashboardProfileData(profile) : null
    if (
      sanitizedProfile &&
      Buffer.byteLength(JSON.stringify(sanitizedProfile), 'utf8') >
        MAX_PROFILE_BYTES
    ) {
      throw new DashboardProfileWriteLimitError('Dashboard profile is too large')
    }
    const next: PersistedProfileState = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      revision: metadata.revision,
      generation: metadata.generation,
      status: sanitizedProfile ? 'active' : 'reset',
      resetRevision: sanitizedProfile ? null : metadata.revision,
      metadata,
      profileHash: sanitizedProfile
        ? hashDashboardProfile(sanitizedProfile)
        : null,
      latestRecoverableRevision: sanitizedProfile
        ? metadata.revision
        : current.status === 'active'
          ? current.revision
          : latestRecoverableRevision(current),
    }
    try {
      stageHistoryRevision(current, currentProfile, metadata, sanitizedProfile)
      if (sanitizedProfile) {
        writeJson(paths.profile, sanitizedProfile)
      } else {
        rmSync(paths.profile, { force: true })
      }
      writeJson(paths.state, next)
    } catch (error) {
      if (
        error instanceof DashboardProfileStorageReadError ||
        error instanceof DashboardProfileStorageCapacityError
      ) {
        throw error
      }
      throw new DashboardProfileStorageCapacityError(
        'Dashboard profile commit could not be persisted'
      )
    }
    return next
  }

  const invalidRegistry = (): DashboardProfileStorageReadError =>
    new DashboardProfileStorageReadError(
      `Dashboard profile storage cannot be read safely: ${paths.clients}`
    )

  const parseRegistryClient = (
    candidate: unknown
  ): {
    entry: PersistedDashboardClientRegistryEntry
    parsedFirstSeenAt: number
    parsedLastSeenAt: number
  } => {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    ) {
      throw invalidRegistry()
    }
    const entry = candidate as Record<string, unknown>
    const parsedFirstSeenAt =
      typeof entry.firstSeenAt === 'string'
        ? Date.parse(entry.firstSeenAt)
        : Number.NaN
    const parsedLastSeenAt =
      typeof entry.lastSeenAt === 'string'
        ? Date.parse(entry.lastSeenAt)
        : Number.NaN
    const principal =
      entry.principal &&
      typeof entry.principal === 'object' &&
      !Array.isArray(entry.principal)
        ? (entry.principal as Record<string, unknown>)
        : null
    if (
      typeof entry.id !== 'string' ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(entry.id) ||
      entry.id.includes('..') ||
      typeof entry.name !== 'string' ||
      (entry.kind !== 'desktop' &&
        entry.kind !== 'phone' &&
        entry.kind !== 'tablet' &&
        entry.kind !== 'wall_panel' &&
        entry.kind !== 'unknown') ||
      !Number.isFinite(parsedFirstSeenAt) ||
      !Number.isFinite(parsedLastSeenAt) ||
      (entry.lastRevision !== undefined &&
        entry.lastRevision !== null &&
        (!Number.isSafeInteger(entry.lastRevision) ||
          Number(entry.lastRevision) < 0)) ||
      !principal ||
      typeof principal.providerId !== 'string' ||
      (principal.userId !== null && typeof principal.userId !== 'string') ||
      (principal.userName !== null &&
        typeof principal.userName !== 'string') ||
      (entry.bindingId !== undefined &&
        entry.bindingId !== null &&
        (typeof entry.bindingId !== 'string' ||
          !CLIENT_BINDING_PATTERN.test(entry.bindingId)))
    ) {
      throw invalidRegistry()
    }
    return {
      entry: candidate as PersistedDashboardClientRegistryEntry,
      parsedFirstSeenAt,
      parsedLastSeenAt,
    }
  }

  const normalizeRegistryBinding = (
    entry: PersistedDashboardClientRegistryEntry
  ): string | undefined =>
    typeof entry.bindingId === 'string' &&
    CLIENT_BINDING_PATTERN.test(entry.bindingId)
      ? entry.bindingId
      : undefined

  const normalizeRegistryLastRevision = (
    entry: PersistedDashboardClientRegistryEntry
  ): number | null =>
    Number.isSafeInteger(entry.lastRevision) &&
    Number(entry.lastRevision) >= 0
      ? Number(entry.lastRevision)
      : null

  const readRegistry = (): RegistryCollection => {
    const workspace = readOrCreateWorkspace()
    const missingRegistry = Symbol('missing-dashboard-client-registry')
    const candidate = readJson<unknown | typeof missingRegistry>(
      paths.clients,
      missingRegistry,
      MAX_CLIENT_REGISTRY_BYTES
    )
    if (candidate === missingRegistry) {
      return {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        workspaceId: workspace.workspaceId,
        clients: [],
      }
    }
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate) ||
      (candidate as Partial<RegistryCollection>).contractVersion !==
        DASHBOARD_PROFILE_CONTRACT_VERSION ||
      !Array.isArray((candidate as Partial<RegistryCollection>).clients)
    ) {
      throw new DashboardProfileStorageReadError(
        `Dashboard profile storage cannot be read safely: ${paths.clients}`
      )
    }
    const registry = candidate as RegistryCollection
    for (const client of registry.clients) {
      parseRegistryClient(client)
    }
    return {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      workspaceId: workspace.workspaceId,
      clients: registry.clients,
      ...(registry.preferenceCollectionVersion === 1
        ? { preferenceCollectionVersion: 1 as const }
        : {}),
    }
  }

  const readPreferenceCollection = (
    file: string
  ): PreferenceCollection => {
    const candidate = readJson<unknown>(
      file,
      null,
      MAX_PREFERENCE_COLLECTION_BYTES
    )
    if (
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      (candidate as Partial<PreferenceCollection>).contractVersion ===
        DASHBOARD_PROFILE_CONTRACT_VERSION &&
      (candidate as Partial<PreferenceCollection>).records &&
      typeof (candidate as Partial<PreferenceCollection>).records === 'object' &&
      !Array.isArray((candidate as Partial<PreferenceCollection>).records)
    ) {
      const collection = candidate as PreferenceCollection
      let changed = false
      for (const [key, document] of Object.entries(collection.records)) {
        if (document.scope !== 'account' && document.scope !== 'client') {
          continue
        }
        const values = sanitizeDashboardPreferenceValues(
          document.values,
          document.scope
        )
        if (JSON.stringify(values) !== JSON.stringify(document.values)) {
          document.values = values
          changed = true
        }
        if (
          document.scope === 'client' &&
          typeof document.clientId === 'string' &&
          /^[A-Za-z0-9_-]{8,128}$/.test(document.clientId) &&
          !key.startsWith('client-binding:')
        ) {
          const canonicalKey = `client:${document.clientId}`
          if (key !== canonicalKey) {
            const canonical = collection.records[canonicalKey]
            if (!canonical || document.revision > canonical.revision) {
              collection.records[canonicalKey] = document
            }
            delete collection.records[key]
            changed = true
          }
        }
      }
      const scope =
        file === paths.clientPreferences ? 'client' : 'account'
      if (changed && preferenceCollectionFits(collection, scope)) {
        writeJson(file, collection)
      }
      return collection
    }
    return {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      records: {},
    }
  }

  const normalizeRegistryClients = (
    clients: readonly unknown[],
    now: number,
    newestFirst = false
  ): PersistedDashboardClientRegistryEntry[] => {
    const compareText = (left: string, right: string): number => {
      if (left < right) {
        return -1
      }
      if (left > right) {
        return 1
      }
      return 0
    }
    const bindingSortValue = (
      entry: PersistedDashboardClientRegistryEntry
    ): { bound: boolean; value: string } => {
      const value = typeof entry.bindingId === 'string' ? entry.bindingId : ''
      return {
        bound: CLIENT_BINDING_PATTERN.test(value),
        value,
      }
    }
    const compareClients = (
      left: PersistedDashboardClientRegistryEntry,
      right: PersistedDashboardClientRegistryEntry,
      newestFirst: boolean
    ): number => {
      const leftBinding = bindingSortValue(left)
      const rightBinding = bindingSortValue(right)
      if (
        left.id === right.id &&
        leftBinding.bound !== rightBinding.bound
      ) {
        return leftBinding.bound ? -1 : 1
      }
      const timestampComparison = compareText(left.lastSeenAt, right.lastSeenAt)
      if (timestampComparison !== 0) {
        return newestFirst ? -timestampComparison : timestampComparison
      }
      const idComparison = compareText(left.id, right.id)
      if (idComparison !== 0) {
        return idComparison
      }
      if (leftBinding.bound !== rightBinding.bound) {
        return leftBinding.bound ? -1 : 1
      }
      return compareText(leftBinding.value, rightBinding.value)
    }
    const futureBoundary = now + CLIENT_FUTURE_SKEW_MS
    const normalized: PersistedDashboardClientRegistryEntry[] = []
    for (const candidate of clients) {
      const { entry, parsedFirstSeenAt, parsedLastSeenAt } =
        parseRegistryClient(candidate)
      const boundedLastSeenAt =
        parsedLastSeenAt > futureBoundary ? now : parsedLastSeenAt
      if (now - boundedLastSeenAt > CLIENT_STALE_AFTER_MS) {
        continue
      }
      const boundedFirstSeenAt = Math.min(
        parsedFirstSeenAt,
        boundedLastSeenAt
      )
      normalized.push({
        ...entry,
        firstSeenAt: new Date(boundedFirstSeenAt).toISOString(),
        lastSeenAt: new Date(boundedLastSeenAt).toISOString(),
        lastRevision: normalizeRegistryLastRevision(entry),
        bindingId: normalizeRegistryBinding(entry),
      })
    }

    const seenIds = new Set<string>()
    const seenBindings = new Set<string>()
    return normalized
      .sort((left, right) => compareClients(left, right, true))
      .filter((entry) => {
        const bindingId =
          typeof entry.bindingId === 'string' &&
          CLIENT_BINDING_PATTERN.test(entry.bindingId)
            ? entry.bindingId
            : null
        if (seenIds.has(entry.id) || (bindingId && seenBindings.has(bindingId))) {
          return false
        }
        seenIds.add(entry.id)
        if (bindingId) {
          seenBindings.add(bindingId)
        }
        return true
      })
      .sort((left, right) => compareClients(left, right, newestFirst))
  }

  const reconcileClientPreferences = (
    registry: RegistryCollection,
    allowEmptyRegistry = false
  ): void => {
    const collection = readPreferenceCollection(paths.clientPreferences)
    const originalRecordCount = Object.keys(collection.records).length
    if (!allowEmptyRegistry && registry.clients.length === 0 && originalRecordCount > 0) {
      throw new DashboardProfileStorageReadError(
        `Dashboard profile storage cannot be reconciled safely: ${paths.clientPreferences}`
      )
    }
    const records: Record<string, DashboardPreferenceDocument> = {}
    for (const client of registry.clients) {
      const legacyKey = `client:${client.id}`
      const canonicalKey =
        client.bindingId && CLIENT_BINDING_PATTERN.test(client.bindingId)
          ? `client-binding:${client.bindingId}`
          : legacyKey
      const boundDocument = client.bindingId
        ? collection.records[canonicalKey]
        : undefined
      const legacyDocument = collection.records[legacyKey]
      if (boundDocument?.scope === 'client') {
        records[canonicalKey] = boundDocument
      } else if (
        legacyDocument?.scope === 'client' &&
        legacyDocument.clientId === client.id
      ) {
        records[canonicalKey] = legacyDocument
      }
    }
    if (JSON.stringify(records) !== JSON.stringify(collection.records)) {
      const reconciled = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        records,
      } satisfies PreferenceCollection
      if (preferenceCollectionFits(reconciled, 'client')) {
        writeJson(paths.clientPreferences, reconciled)
      } else if (originalRecordCount > CLIENT_REGISTRY_LIMIT) {
        throw new DashboardProfileStorageReadError(
          `Dashboard profile storage cannot be reconciled safely: ${paths.clientPreferences}`
        )
      }
    }
  }

  const preferenceCollectionFits = (
    collection: PreferenceCollection,
    scope: DashboardPreferenceScope
  ): boolean =>
    (scope !== 'client' ||
      Object.keys(collection.records).length <= CLIENT_REGISTRY_LIMIT) &&
    Buffer.byteLength(JSON.stringify(collection), 'utf8') <=
      MAX_PREFERENCE_COLLECTION_BYTES

  const resolveRegisteredClientBinding = (
    clientId: string,
    candidates: string[]
  ): {
    clientExists: boolean
    bindingId: string | null
    expectedBindingId: string | null
  } => {
    const registry = readRegistry()
    const existing = registry.clients.find((entry) => entry.id === clientId)
    if (
      existing?.bindingId &&
      CLIENT_BINDING_PATTERN.test(existing.bindingId)
    ) {
      return {
        clientExists: true,
        bindingId: candidates.includes(existing.bindingId)
          ? existing.bindingId
          : null,
        expectedBindingId: existing.bindingId,
      }
    }
    const continuity = candidates.find((candidate) =>
      registry.clients.some((entry) => entry.bindingId === candidate)
    )
    return {
      clientExists: Boolean(existing),
      bindingId: continuity ?? null,
      expectedBindingId: null,
    }
  }

  return {
    getPaths: () => paths,
    resolveRegisteredClientBinding,
    authorizePrincipal,
    getWorkspace: () => publicWorkspace(readOrCreateWorkspace()),
    getState,
    getRecovery,
    getGeneration(): string {
      return getState().generation
    },
    getSerializedProfile(): string | null {
      const profile = getProfile()
      return profile ? JSON.stringify(profile) : null
    },
    getProfile,
    getProfileMetadata(): DashboardProfileMetadata {
      return buildRevisionMetadata(readOrCreateWorkspace(), getState())
    },
    getHistory(): DashboardProfileHistoryEntry[] {
      return getCommittedHistory(getState())
        .slice()
        .reverse()
        .map((entry) => ({ ...entry.metadata, hasProfile: Boolean(entry.profile) }))
    },
    getRevision(revision: number): PersistedHistoryEntry | null {
      return (
        getCommittedHistory(getState()).find(
          (entry) => entry.metadata.revision === revision
        ) ?? null
      )
    },
    saveProfile(
      profile: DashboardProfileData,
      options: {
        author?: DashboardProfileAuthor
        changedPaths?: string[]
        kind?: 'update' | 'patch'
      } = {}
    ) {
      const sanitizedProfile = sanitizeDashboardProfileData(profile)
      const current = getProfile()
      if (current && areDashboardProfilesEquivalent(current, sanitizedProfile)) {
        return getState()
      }
      return persistRevision(
        sanitizedProfile,
        options.author ?? SYSTEM_AUTHOR,
        options.kind ?? 'update',
        options.changedPaths ?? ['/']
      )
    },
    patchProfile(
      operations: DashboardProfilePatchOperation[],
      author: DashboardProfileAuthor
    ) {
      const current = getProfile()
      if (!current) {
        throw new Error('There is no active dashboard profile to patch')
      }
      const patchedProfile = sanitizeDashboardProfileData(
        applyDashboardProfilePatch(current, operations)
      )
      if (areDashboardProfilesEquivalent(current, patchedProfile)) {
        return getState()
      }
      return persistRevision(
        patchedProfile,
        author,
        'patch',
        operations.map((operation) => operation.path || '/')
      )
    },
    restoreRevision(revision: number, author: DashboardProfileAuthor) {
      const entry = getCommittedHistory(getState()).find(
        (candidate) => candidate.metadata.revision === revision && candidate.profile
      )
      if (!entry?.profile) {
        return null
      }
      return persistRevision(entry.profile, author, 'restore', ['/'], revision)
    },
    rotateGeneration() {
      const state = getState()
      const generation = createDashboardProfileGeneration()
      if (state.revision === 0 || !state.metadata) {
        writeJson(paths.state, { ...state, generation })
        return generation
      }
      const profile = getProfileForState(state)
      const metadata = { ...state.metadata, generation }
      const next = { ...state, generation, metadata }
      stageHistoryRevision(next, profile, metadata, profile)
      writeJson(paths.state, next)
      return generation
    },
    clearProfile() {
      rmSync(paths.profile, { force: true })
    },
    resetProfile(author: DashboardProfileAuthor = SYSTEM_AUTHOR) {
      return persistRevision(null, author, 'reset', ['/'])
    },
    getPreference(
      scope: DashboardPreferenceScope,
      principal: ViteDashboardProfilePrincipal,
      client?: BoundDashboardProfileClient
    ): DashboardPreferenceDocument | null {
      const file =
        scope === 'account' ? paths.accountPreferences : paths.clientPreferences
      const collection = readPreferenceCollection(file)
      const key =
        scope === 'client'
          ? `client-binding:${client?.bindingId ?? ''}`
          : principalKey(principal)
      if (
        scope === 'client' &&
        client &&
        !collection.records[key] &&
        collection.records[`client:${client.id}`]
      ) {
        const nextCollection: PreferenceCollection = {
          contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
          records: { ...collection.records },
        }
        nextCollection.records[key] = nextCollection.records[`client:${client.id}`]
        delete nextCollection.records[`client:${client.id}`]
        if (preferenceCollectionFits(nextCollection, 'client')) {
          collection.records = nextCollection.records
          writeJson(file, nextCollection)
        }
      }
      return (
        collection.records[key] ??
        (scope === 'client' && client
          ? collection.records[`client:${client.id}`]
          : null) ??
        null
      )
    },
    savePreference(
      scope: DashboardPreferenceScope,
      principal: ViteDashboardProfilePrincipal,
      schemaVersion: number,
      values: Record<string, unknown>,
      client?: BoundDashboardProfileClient
    ): DashboardPreferenceDocument {
      const file =
        scope === 'account' ? paths.accountPreferences : paths.clientPreferences
      const collection = readPreferenceCollection(file)
      const key =
        scope === 'client'
          ? `client-binding:${client?.bindingId ?? ''}`
          : principalKey(principal)
      if (
        scope === 'client' &&
        client &&
        !collection.records[key] &&
        collection.records[`client:${client.id}`]
      ) {
        collection.records[key] = collection.records[`client:${client.id}`]
        delete collection.records[`client:${client.id}`]
      }
      const current = collection.records[key]
      const document: DashboardPreferenceDocument = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        schemaVersion,
        scope,
        revision: (current?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        values: sanitizeDashboardPreferenceValues(values, scope),
        principal: publicPrincipal(principal),
        clientId: scope === 'client' ? (client?.id ?? null) : null,
      }
      const nextCollection: PreferenceCollection = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        records: {
          ...collection.records,
          [key]: document,
        },
      }
      if (!preferenceCollectionFits(nextCollection, scope)) {
        if (scope === 'client') {
          throw new DashboardClientCapacityError(
            'Dashboard client preference capacity reached'
          )
        }
        throw new DashboardProfileStorageCapacityError(
          'Dashboard preference storage capacity reached'
        )
      }
      writeJson(file, nextCollection)
      return document
    },
    touchClient(
      principal: ViteDashboardProfilePrincipal,
      client: BoundDashboardProfileClient,
      lastRevision: number | null = null
    ): DashboardClientRegistryEntry | null {
      const registry = readRegistry()
      const hadRegistryClients = registry.clients.length > 0
      const normalizedClients = normalizeRegistryClients(
        registry.clients,
        Date.now()
      )
      const registryChanged =
        JSON.stringify(normalizedClients) !== JSON.stringify(registry.clients)
      if (registryChanged) {
        registry.clients = normalizedClients
      }
      if (registry.preferenceCollectionVersion !== 1 || registryChanged) {
        reconcileClientPreferences(registry, registryChanged && hadRegistryClients)
        registry.preferenceCollectionVersion = 1
        writeJson(paths.clients, registry)
      }
      const current = registry.clients.find((entry) => entry.id === client.id)
      const bindingContinuity = registry.clients.find(
        (entry) => entry.bindingId === client.bindingId
      )
      if (
        current?.bindingId &&
        CLIENT_BINDING_PATTERN.test(current.bindingId) &&
        current.bindingId !== client.bindingId
      ) {
        return null
      }
      const continuity = current ?? bindingContinuity
      if (!continuity && registry.clients.length >= CLIENT_REGISTRY_LIMIT) {
        throw new DashboardClientCapacityError(
          'Dashboard client registry capacity reached'
        )
      }
      if (
        (!continuity?.bindingId ||
          !CLIENT_BINDING_PATTERN.test(continuity.bindingId)) &&
        Object.entries(readPreferenceCollection(paths.clientPreferences).records).some(
          ([key, document]) =>
            key.startsWith('client-binding:') &&
            key !== `client-binding:${client.bindingId}` &&
            document.clientId === client.id
        )
      ) {
        return null
      }
      const timestamp = new Date().toISOString()
      const nextPrincipal = publicPrincipal(principal)
      const nextRevision = lastRevision ?? continuity?.lastRevision ?? null
      if (
        continuity &&
        continuity.id === client.id &&
        continuity.name === client.name &&
        continuity.kind === client.kind &&
        continuity.lastRevision === nextRevision &&
        continuity.principal.providerId === nextPrincipal.providerId &&
        continuity.principal.userId === nextPrincipal.userId &&
        continuity.principal.userName === nextPrincipal.userName &&
        continuity.bindingId === client.bindingId &&
        Number.isFinite(Date.parse(continuity.lastSeenAt)) &&
        Date.now() - Date.parse(continuity.lastSeenAt) < CLIENT_TOUCH_INTERVAL_MS
      ) {
        return continuity
      }
      const entry: DashboardClientRegistryEntry = {
        id: client.id,
        name: client.name,
        kind: client.kind,
        firstSeenAt: continuity?.firstSeenAt ?? timestamp,
        lastSeenAt: timestamp,
        lastRevision: nextRevision,
        principal: nextPrincipal,
      }
      const persistedEntry: PersistedDashboardClientRegistryEntry = {
        ...entry,
        bindingId: client.bindingId,
      }
      const retainedClients = registry.clients.filter(
        (candidate) =>
          candidate.id !== client.id &&
          candidate.bindingId !== client.bindingId
      )
      if (!continuity && retainedClients.length >= CLIENT_REGISTRY_LIMIT) {
        throw new DashboardClientCapacityError(
          'Dashboard client registry capacity reached'
        )
      }
      registry.clients = normalizeRegistryClients(
        [...retainedClients, persistedEntry],
        Date.now()
      )
      writeJson(paths.clients, registry)
      if (continuity && continuity.id !== client.id) {
        reconcileClientPreferences(registry)
      }
      return entry
    },
    listClients(): DashboardClientRegistryEntry[] {
      return normalizeRegistryClients(readRegistry().clients, Date.now(), true)
        .map(({ bindingId: _bindingId, ...client }) => client)
    },
    forgetClient(clientId: string, requestingClient: BoundDashboardProfileClient): boolean {
      const registry = readRegistry()
      const ownedClient = registry.clients.find(
        (entry) =>
          entry.id === clientId &&
          requestingClient.id === clientId &&
          entry.bindingId === requestingClient.bindingId
      )
      if (!ownedClient) {
        return false
      }
      const previousLength = registry.clients.length
      registry.clients = registry.clients.filter((entry) => entry.id !== clientId)
      writeJson(paths.clients, registry)
      const preferences = readPreferenceCollection(paths.clientPreferences)
      preferences.records = Object.fromEntries(
        Object.entries(preferences.records).filter(
          ([key, document]) =>
            key !== `client-binding:${ownedClient.bindingId}` &&
            key !== `client:${clientId}` &&
            !key.endsWith(`|client:${clientId}`) &&
            document.clientId !== clientId
        )
      )
      writeJson(paths.clientPreferences, preferences)
      return registry.clients.length !== previousLength
    },
  }
}

type ViteDashboardProfileStore = ReturnType<typeof createViteDashboardProfileStore>

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function readCookieValues(
  value: string | undefined,
  cookieName: string
): string[] {
  return [
    ...new Set(
      (value ?? '')
        .split(';')
        .map((entry) => entry.trim())
        .flatMap((entry) => {
          const separator = entry.indexOf('=')
          return separator > 0 &&
            entry.slice(0, separator).trim() === cookieName
            ? [entry.slice(separator + 1).trim()]
            : []
        })
    ),
  ]
}

function normalizeIngressPath(value: string | undefined): string {
  const normalized = (value ?? '').trim().replace(/\/+$/, '')
  let decoded = ''
  try {
    decoded = decodeURIComponent(normalized)
  } catch {
    return ''
  }
  if (
    !normalized ||
    normalized === '/' ||
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    !/^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(normalized) ||
    decoded.startsWith('//') ||
    !/^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(decoded) ||
    normalized.includes('..') ||
    decoded.includes('..') ||
    decoded.includes('\\')
  ) {
    return ''
  }
  return normalized
}

function requestUsesHttps(req: IncomingMessage): boolean {
  return (
    (getHeader(req, 'X-Forwarded-Proto') ?? '')
      .split(',')[0]
      ?.trim()
      .toLowerCase() === 'https'
  )
}

function readClientBindingBootstraps(
  filePath: string,
  now: number
): ClientBindingBootstrapRecord[] {
  const persisted = readJson<unknown>(
    filePath,
    null,
    MAX_CLIENT_BINDING_BOOTSTRAP_BYTES
  )
  const candidates =
    persisted &&
    typeof persisted === 'object' &&
    !Array.isArray(persisted) &&
    (persisted as Partial<ClientBindingBootstrapCollection>).contractVersion ===
      DASHBOARD_PROFILE_CONTRACT_VERSION &&
    Array.isArray((persisted as Partial<ClientBindingBootstrapCollection>).records)
      ? (persisted as ClientBindingBootstrapCollection).records
      : []
  return candidates
    .filter(
      (candidate): candidate is ClientBindingBootstrapRecord =>
        Boolean(
          candidate &&
            typeof candidate.key === 'string' &&
            CLIENT_BINDING_PATTERN.test(candidate.key) &&
            typeof candidate.bindingId === 'string' &&
            CLIENT_BINDING_PATTERN.test(candidate.bindingId) &&
            Number.isFinite(candidate.expiresAt) &&
            candidate.expiresAt > now
        )
    )
    .sort((left, right) => left.expiresAt - right.expiresAt)
    .slice(-CLIENT_BINDING_BOOTSTRAP_LIMIT)
}

function resolvePersistedClientBinding(
  filePath: string,
  bootstrapKey: string,
  now: number
): string {
  const records = readClientBindingBootstraps(filePath, now)
  const bindingId =
    records.find((candidate) => candidate.key === bootstrapKey)?.bindingId ??
    randomBytes(32).toString('hex')
  const nextRecords = [
    ...records.filter((candidate) => candidate.key !== bootstrapKey),
    {
      key: bootstrapKey,
      bindingId,
      expiresAt: now + CLIENT_BINDING_BOOTSTRAP_TTL_MS,
    },
  ].slice(-CLIENT_BINDING_BOOTSTRAP_LIMIT)
  writeJson(filePath, {
    contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
    records: nextRecords,
  } satisfies ClientBindingBootstrapCollection)
  return bindingId
}

function resolveClientBinding(
  req: IncomingMessage,
  res: ServerResponse,
  principal: ViteDashboardProfilePrincipal,
  clientId: string,
  store: ViteDashboardProfileStore,
  cookieNames: InstallationCookieNames
): string {
  const currentCookieBindings = readCookieValues(
    getHeader(req, 'Cookie'),
    cookieNames.currentName
  ).filter((candidate) => CLIENT_BINDING_PATTERN.test(candidate))
  const legacyCookieBindings = cookieNames.scoped
    ? readCookieValues(
        getHeader(req, 'Cookie'),
        cookieNames.legacyName
      ).filter((candidate) => CLIENT_BINDING_PATTERN.test(candidate))
    : currentCookieBindings
  const cookieBindings = [
    ...currentCookieBindings,
    ...legacyCookieBindings.filter(
      (candidate) => !currentCookieBindings.includes(candidate)
    ),
  ]
  const now = Date.now()
  const remoteAddress =
    (getHeader(req, 'X-Forwarded-For') ?? '').split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  const userAgent = (getHeader(req, 'User-Agent') ?? '').slice(0, 512)
  const bootstrapKey = createHash('sha256')
    .update(
      JSON.stringify([
        principal.sessionId,
        clientId,
        remoteAddress,
        userAgent,
      ])
    )
    .digest('hex')
  const registered = store.resolveRegisteredClientBinding(
    clientId,
    cookieBindings
  )
  if (registered.bindingId) {
    setClientBindingCookie(req, res, registered.bindingId, cookieNames)
    return registered.bindingId
  }
  if (registered.clientExists) {
    const concurrentBootstrap = readClientBindingBootstraps(
      store.getPaths().clientBindingBootstrap,
      now
    ).find(
      (record) =>
        record.key === bootstrapKey &&
        record.bindingId === registered.expectedBindingId
    )
    if (concurrentBootstrap) {
      setClientBindingCookie(
        req,
        res,
        concurrentBootstrap.bindingId,
        cookieNames
      )
      return concurrentBootstrap.bindingId
    }
    // Do not overwrite a registered browser binding because a duplicate,
    // stale, or malformed parent-path cookie was presented.
    return currentCookieBindings[0] ?? randomBytes(32).toString('hex')
  }
  if (currentCookieBindings.length > 0) {
    setClientBindingCookie(
      req,
      res,
      currentCookieBindings[0],
      cookieNames
    )
    return currentCookieBindings[0]
  }

  const bindingId = resolvePersistedClientBinding(
    store.getPaths().clientBindingBootstrap,
    bootstrapKey,
    now
  )

  setClientBindingCookie(req, res, bindingId, cookieNames)
  return bindingId
}

function setClientBindingCookie(
  req: IncomingMessage,
  res: ServerResponse,
  bindingId: string,
  cookieNames: InstallationCookieNames
): void {
  const ingressPath = normalizeIngressPath(getHeader(req, 'X-Ingress-Path'))
  const attributes = [
    `${cookieNames.currentName}=${bindingId}`,
    `Path=${ingressPath || '/'}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${CLIENT_BINDING_MAX_AGE_SECONDS}`,
  ]
  if (requestUsesHttps(req)) {
    attributes.push('Secure')
  }
  res.setHeader('Set-Cookie', attributes.join('; '))
}

function decodeHeader(value: string | undefined): string {
  if (!value) {
    return ''
  }
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function readClient(
  req: IncomingMessage,
  res: ServerResponse,
  principal: ViteDashboardProfilePrincipal,
  store: ViteDashboardProfileStore,
  cookieNames: InstallationCookieNames,
  required: boolean
): BoundDashboardProfileClient | null {
  const id = getHeader(req, DASHBOARD_PROFILE_HEADERS.clientId)
  if (!id || !/^[A-Za-z0-9_-]{8,128}$/.test(id) || id.includes('..')) {
    return required ? null : null
  }
  const kindValue = getHeader(req, DASHBOARD_PROFILE_HEADERS.clientKind)
  const kind: DashboardClientKind =
    kindValue === 'desktop' ||
    kindValue === 'phone' ||
    kindValue === 'tablet' ||
    kindValue === 'wall_panel'
      ? kindValue
      : 'unknown'
  return {
    id,
    name:
      decodeHeader(getHeader(req, DASHBOARD_PROFILE_HEADERS.clientName))
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 120) || 'Navet dashboard',
    kind,
    bindingId: resolveClientBinding(
      req,
      res,
      principal,
      id,
      store,
      cookieNames
    ),
  }
}

function createAuthor(
  principal: ViteDashboardProfilePrincipal,
  client: DashboardProfileClient
): DashboardProfileAuthor {
  return {
    ...client,
    ...publicPrincipal(principal),
  }
}

function parseRevisionHeader(req: IncomingMessage): number | null {
  const value = getHeader(req, DASHBOARD_PROFILE_HEADERS.baseRevision)
  if (!value || !/^\d+$/.test(value)) {
    return null
  }
  const revision = Number.parseInt(value, 10)
  return Number.isSafeInteger(revision) ? revision : null
}

function writePrecondition(
  req: IncomingMessage,
  store: ViteDashboardProfileStore
): 'satisfied' | 'failed' | 'required' {
  const state = store.getState()
  const rawBaseRevision = getHeader(req, DASHBOARD_PROFILE_HEADERS.baseRevision)
  const baseRevision = parseRevisionHeader(req)
  if (rawBaseRevision !== undefined) {
    return baseRevision !== null && baseRevision === state.revision
      ? 'satisfied'
      : 'failed'
  }
  const ifMatch = getHeader(req, 'If-Match')
  if (ifMatch) {
    return ifMatch === store.getProfileMetadata().etag ? 'satisfied' : 'failed'
  }
  const ifUnmodifiedSince = getHeader(req, 'If-Unmodified-Since')
  if (ifUnmodifiedSince) {
    return ifUnmodifiedSince === store.getProfileMetadata().lastModified
      ? 'satisfied'
      : 'failed'
  }
  return state.revision === 0 ? 'satisfied' : 'required'
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204
  res.setHeader('Cache-Control', 'no-store')
  res.end()
}

function sendClientCapacityUnavailable(res: ServerResponse): void {
  res.setHeader(
    DASHBOARD_PROFILE_HEADERS.errorCode,
    DASHBOARD_PROFILE_ERROR_CODES.clientCapacityReached
  )
  res.setHeader('Retry-After', '60')
  sendJson(res, 503, {
    error:
      'Dashboard client capacity is currently full; existing clients remain protected while Navet waits for an inactive slot',
  })
}

function sendProfileStorageUnavailable(res: ServerResponse): void {
  res.setHeader(
    DASHBOARD_PROFILE_HEADERS.errorCode,
    DASHBOARD_PROFILE_ERROR_CODES.profileStorageUnavailable
  )
  res.setHeader('Retry-After', '60')
  sendJson(res, 503, { error: 'Dashboard profile storage is unavailable' })
}

function applyStoreHeaders(res: ServerResponse, store: ViteDashboardProfileStore): void {
  const workspace = store.getWorkspace()
  const state = store.getState()
  const recovery = store.getRecovery()
  const validators = store.getProfileMetadata()
  res.setHeader(DASHBOARD_PROFILE_HEADERS.contractVersion, String(DASHBOARD_PROFILE_CONTRACT_VERSION))
  res.setHeader(DASHBOARD_PROFILE_HEADERS.installationId, workspace.installationId)
  res.setHeader(DASHBOARD_PROFILE_HEADERS.workspaceId, workspace.workspaceId)
  res.setHeader(DASHBOARD_PROFILE_HEADERS.profileId, DASHBOARD_PROFILE_ID)
  res.setHeader('X-Navet-Workspace-Created-At', workspace.createdAt)
  res.setHeader(DASHBOARD_PROFILE_HEADERS.generation, state.generation)
  res.setHeader(DASHBOARD_PROFILE_HEADERS.revision, String(state.revision))
  res.setHeader(DASHBOARD_PROFILE_HEADERS.recovery, recovery.status)
  res.setHeader('ETag', validators.etag)
  res.setHeader('Last-Modified', validators.lastModified)
  if (recovery.resetRevision !== null) {
    res.setHeader(DASHBOARD_PROFILE_HEADERS.resetRevision, String(recovery.resetRevision))
  }
  if (recovery.latestRecoverableRevision !== null) {
    res.setHeader(
      'X-Navet-Latest-Recoverable-Revision',
      String(recovery.latestRecoverableRevision)
    )
  }
  if (state.metadata) {
    res.setHeader(
      DASHBOARD_PROFILE_HEADERS.author,
      encodeURIComponent(JSON.stringify(state.metadata.author))
    )
    res.setHeader(
      DASHBOARD_PROFILE_HEADERS.changedPaths,
      encodeURIComponent(JSON.stringify(state.metadata.changedPaths))
    )
    res.setHeader('X-Navet-Profile-Change-Kind', state.metadata.kind)
    res.setHeader('X-Navet-Profile-Updated-At', state.metadata.updatedAt)
    if (state.metadata.restoredFromRevision !== undefined) {
      res.setHeader(
        'X-Navet-Restored-From-Revision',
        String(state.metadata.restoredFromRevision)
      )
    }
  }
}

async function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > maxBytes) {
      throw new Error('Request body is too large')
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function normalizedProfilePath(req: IncomingMessage): string {
  const rawUrl = (req.url ?? '/').split('?')[0].replace(/\/+$/, '') || '/'
  if (rawUrl.startsWith('/__navet_profile__')) {
    return rawUrl.slice('/__navet_profile__'.length) || '/'
  }
  return rawUrl
}

function sendPrecondition(
  req: IncomingMessage,
  res: ServerResponse,
  store: ViteDashboardProfileStore
): boolean {
  const result = writePrecondition(req, store)
  if (result === 'satisfied') {
    return false
  }
  applyStoreHeaders(res, store)
  sendJson(
    res,
    result === 'failed' ? 412 : 428,
    result === 'failed'
      ? { error: 'Dashboard profile changed before save', revision: store.getState().revision }
      : { error: 'A base revision or current ETag is required', revision: store.getState().revision }
  )
  return true
}

export function createViteDashboardProfileRequestHandler(options: {
  cookieNames?: InstallationCookieNames
  store?: ViteDashboardProfileStore
  resolvePrincipal: (
    request: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
}) {
  const store = options.store ?? createViteDashboardProfileStore()
  const cookieNames =
    options.cookieNames ?? {
      currentName: CLIENT_BINDING_COOKIE_NAME,
      legacyName: CLIENT_BINDING_COOKIE_NAME,
      scoped: false,
    }

  const handleRequest = async (
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> => {
    const principal = await options.resolvePrincipal(req)
    if (!principal) {
      sendJson(res, 401, { error: 'Authentication required' })
      return
    }
    if (!store.authorizePrincipal(principal)) {
      res.setHeader(
        DASHBOARD_PROFILE_HEADERS.errorCode,
        DASHBOARD_PROFILE_ERROR_CODES.workspaceTenantMismatch
      )
      sendJson(res, 403, {
        error:
          'This dashboard workspace belongs to a different Home Assistant installation',
      })
      return
    }

    const route = normalizedProfilePath(req)
    const method = req.method ?? 'GET'
    if (method !== 'GET' && !isViteStrictSameOriginMutation(req)) {
      sendJson(res, 403, { error: 'Cross-origin profile mutation is not allowed' })
      return
    }
    const client = readClient(
      req,
      res,
      principal,
      store,
      cookieNames,
      false
    )
    if (
      client &&
      !store.touchClient(principal, client, store.getState().revision)
    ) {
      res.setHeader(
        DASHBOARD_PROFILE_HEADERS.errorCode,
        DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch
      )
      sendJson(res, 403, {
        error: 'This dashboard client identity belongs to another browser',
      })
      return
    }

    if (route === '/default') {
      if (method === 'GET') {
        applyStoreHeaders(res, store)
        const recovery = store.getRecovery()
        if (recovery.status === 'recoverable' || recovery.status === 'missing') {
          sendJson(res, 409, {
            error: 'The current dashboard profile file is missing',
            recovery,
          })
          return
        }
        const serialized = store.getSerializedProfile()
        if (!serialized) {
          sendNoContent(res)
          return
        }
        const metadata = store.getProfileMetadata()
        if (
          getHeader(req, 'If-None-Match') === metadata.etag ||
          getHeader(req, 'If-Modified-Since') === metadata.lastModified
        ) {
          res.statusCode = 304
          res.setHeader('Cache-Control', 'no-store')
          res.end()
          return
        }
        res.statusCode = 200
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(serialized)
        return
      }

      if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
        if (sendPrecondition(req, res, store)) {
          return
        }
        const writeClient = client
        if (!writeClient) {
          sendJson(res, 400, { error: 'A valid dashboard client identity is required' })
          return
        }
        const author = createAuthor(principal, writeClient)
        try {
          if (method === 'DELETE') {
            store.resetProfile(author)
            applyStoreHeaders(res, store)
            sendNoContent(res)
            return
          }
          const serialized = await readBody(req, MAX_PROFILE_BYTES)
          if (!serialized) {
            sendJson(res, 400, { error: 'Missing dashboard profile body' })
            return
          }
          if (method === 'PUT') {
            const profile = JSON.parse(serialized)
            if (!isValidDashboardProfileData(profile)) {
              sendJson(res, 400, { error: 'Unsupported dashboard profile' })
              return
            }
            let changedPaths = ['/']
            const rawPaths = getHeader(req, DASHBOARD_PROFILE_HEADERS.changedPaths)
            if (rawPaths) {
              const parsed = JSON.parse(decodeHeader(rawPaths))
              if (Array.isArray(parsed)) {
                changedPaths = parsed.filter(
                  (entry): entry is string =>
                    typeof entry === 'string' && entry.startsWith('/')
                )
              }
            }
            if (sendPrecondition(req, res, store)) {
              return
            }
            store.saveProfile(profile, { author, changedPaths })
          } else {
            const operations = JSON.parse(serialized) as DashboardProfilePatchOperation[]
            if (sendPrecondition(req, res, store)) {
              return
            }
            store.patchProfile(operations, author)
          }
          applyStoreHeaders(res, store)
          try {
            store.touchClient(principal, writeClient, store.getState().revision)
          } catch {
            // Profile state is already committed; registry freshness is
            // secondary and must not turn success into an apparent failure.
          }
          sendJson(res, 200, {
            ok: true,
            revision: store.getState().revision,
            updatedAt: store.getState().metadata?.updatedAt ?? null,
          })
        } catch (error) {
          if (
            error instanceof DashboardProfileStorageReadError ||
            error instanceof DashboardProfileStorageCapacityError ||
            error instanceof DashboardClientCapacityError ||
            error instanceof DashboardProfileWriteLimitError
          ) {
            throw error
          }
          const message = error instanceof Error ? error.message : ''
          sendJson(res, message === 'Request body is too large' ? 413 : 400, {
            error:
              message === 'Request body is too large'
                ? 'Dashboard profile is too large'
                : 'Unable to save dashboard profile',
          })
        }
        return
      }

      res.setHeader('Allow', 'GET, PUT, PATCH, DELETE')
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    if (route === '/default/history') {
      if (method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      applyStoreHeaders(res, store)
      sendJson(res, 200, {
        workspace: store.getWorkspace(),
        entries: store.getHistory(),
      })
      return
    }

    const revisionMatch = route.match(/^\/default\/revisions\/(\d+)(\/restore)?$/)
    if (revisionMatch) {
      const revision = Number.parseInt(revisionMatch[1], 10)
      if (revisionMatch[2]) {
        if (method !== 'POST') {
          res.setHeader('Allow', 'POST')
          sendJson(res, 405, { error: 'Method not allowed' })
          return
        }
        if (sendPrecondition(req, res, store)) {
          return
        }
        const writeClient = client
        if (!writeClient) {
          sendJson(res, 400, { error: 'A valid dashboard client identity is required' })
          return
        }
        if (!store.restoreRevision(revision, createAuthor(principal, writeClient))) {
          sendJson(res, 404, { error: 'Recoverable dashboard profile revision not found' })
          return
        }
        applyStoreHeaders(res, store)
        sendJson(res, 200, {
          ok: true,
          revision: store.getState().revision,
          restoredFromRevision: revision,
        })
        return
      }
      if (method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      const entry = store.getRevision(revision)
      if (!entry) {
        sendJson(res, 404, { error: 'Dashboard profile revision not found' })
        return
      }
      applyStoreHeaders(res, store)
      sendJson(res, 200, {
        workspace: store.getWorkspace(),
        metadata: entry.metadata,
        recovery: entry.profile
          ? {
              status: 'active',
              resetRevision: null,
              latestRecoverableRevision: revision,
            }
          : {
              status: 'reset',
              resetRevision: revision,
              latestRecoverableRevision: store.getRecovery().latestRecoverableRevision,
            },
        profile: entry.profile,
      })
      return
    }

    const preferenceMatch = route.match(/^\/preferences\/(account|client)$/)
    if (preferenceMatch) {
      const scope = preferenceMatch[1] as DashboardPreferenceScope
      if (scope === 'account' && !principal.userId) {
        sendJson(res, 403, { error: 'A verified account identity is required' })
        return
      }
      const preferenceClient = client
      if (scope === 'client' && !preferenceClient) {
        sendJson(res, 400, { error: 'A valid dashboard client identity is required' })
        return
      }
      if (method === 'GET') {
        const document = store.getPreference(
          scope,
          principal,
          preferenceClient ?? undefined
        )
        if (!document) {
          sendNoContent(res)
          return
        }
        res.setHeader(DASHBOARD_PROFILE_HEADERS.preferenceRevision, String(document.revision))
        res.setHeader('ETag', `"navet-preference-${scope}-${document.revision}"`)
        sendJson(res, 200, document)
        return
      }
      if (method === 'PUT') {
        try {
          const current = store.getPreference(
            scope,
            principal,
            preferenceClient ?? undefined
          )
          const baseRevision = parseRevisionHeader(req)
          if (baseRevision === null && current) {
            res.setHeader(
              DASHBOARD_PROFILE_HEADERS.preferenceRevision,
              String(current.revision)
            )
            sendJson(res, 428, { error: 'A base preference revision is required' })
            return
          }
          if (baseRevision !== null && baseRevision !== (current?.revision ?? 0)) {
            res.setHeader(
              DASHBOARD_PROFILE_HEADERS.preferenceRevision,
              String(current?.revision ?? 0)
            )
            sendJson(res, 412, { error: 'Preferences changed before save' })
            return
          }
          const serialized = await readBody(req, MAX_PREFERENCE_BYTES)
          const input = JSON.parse(serialized) as {
            schemaVersion?: number
            values?: Record<string, unknown>
          }
          if (
            typeof input.schemaVersion !== 'number' ||
            !Number.isSafeInteger(input.schemaVersion) ||
            input.schemaVersion < 1 ||
            !input.values ||
            typeof input.values !== 'object' ||
            Array.isArray(input.values)
          ) {
            sendJson(res, 400, { error: 'Unsupported preference document' })
            return
          }
          const latest = store.getPreference(
            scope,
            principal,
            preferenceClient ?? undefined
          )
          if (
            (baseRevision === null && latest) ||
            (baseRevision !== null && baseRevision !== (latest?.revision ?? 0))
          ) {
            res.setHeader(
              DASHBOARD_PROFILE_HEADERS.preferenceRevision,
              String(latest?.revision ?? 0)
            )
            sendJson(res, 412, { error: 'Preferences changed before save' })
            return
          }
          const document = store.savePreference(
            scope,
            principal,
            input.schemaVersion,
            input.values,
            preferenceClient ?? undefined
          )
          res.setHeader(
            DASHBOARD_PROFILE_HEADERS.preferenceRevision,
            String(document.revision)
          )
          res.setHeader('ETag', `"navet-preference-${scope}-${document.revision}"`)
          sendJson(res, 200, document)
        } catch (error) {
          if (
            error instanceof DashboardProfileStorageReadError ||
            error instanceof DashboardProfileStorageCapacityError ||
            error instanceof DashboardClientCapacityError ||
            error instanceof DashboardProfileWriteLimitError
          ) {
            throw error
          }
          sendJson(
            res,
            error instanceof Error && error.message === 'Request body is too large'
              ? 413
              : 400,
            { error: 'Unable to save preferences' }
          )
        }
        return
      }
      res.setHeader('Allow', 'GET, PUT')
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    if (route === '/clients') {
      if (method !== 'GET' && method !== 'PUT') {
        res.setHeader('Allow', 'GET, PUT')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      const registryClient = client
      if (method === 'PUT' && !registryClient) {
        sendJson(res, 400, { error: 'A valid dashboard client identity is required' })
        return
      }
      if (registryClient) {
        store.touchClient(principal, registryClient)
      }
      sendJson(res, 200, {
        workspace: store.getWorkspace(),
        clients: store.listClients(),
      })
      return
    }

    const clientMatch = route.match(/^\/clients\/([^/]+)$/)
    if (clientMatch) {
      if (method !== 'DELETE') {
        res.setHeader('Allow', 'DELETE')
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      const clientId = decodeURIComponent(clientMatch[1])
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientId)) {
        sendJson(res, 400, { error: 'Invalid dashboard client identity' })
        return
      }
      if (!client || !store.forgetClient(clientId, client)) {
        res.setHeader(
          DASHBOARD_PROFILE_HEADERS.errorCode,
          DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch
        )
        sendJson(res, 403, {
          error: 'This dashboard client identity belongs to another browser',
        })
        return
      }
      sendJson(res, 200, {
        ok: true,
        forgotten: true,
        credentialsRevoked: false,
      })
      return
    }

    sendJson(res, 404, { error: 'Dashboard profile resource not found' })
  }

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      await handleRequest(req, res)
    } catch (error) {
      if (error instanceof DashboardClientCapacityError) {
        sendClientCapacityUnavailable(res)
        return
      }
      if (
        error instanceof DashboardProfileStorageReadError ||
        error instanceof DashboardProfileStorageCapacityError
      ) {
        sendProfileStorageUnavailable(res)
        return
      }
      if (error instanceof DashboardProfileWriteLimitError) {
        sendJson(res, 413, { error: 'Dashboard profile is too large' })
        return
      }
      throw error
    }
  }
}
