import { randomBytes } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import {
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
  sessionId: string
}

interface PersistedProfileState {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  revision: number
  generation: string
  status: 'uninitialized' | 'active' | 'reset'
  resetRevision: number | null
  metadata: DashboardProfileRevisionMetadata | null
}

interface PersistedHistoryEntry {
  metadata: DashboardProfileRevisionMetadata
  profile: DashboardProfileData | null
}

interface PreferenceCollection {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  records: Record<string, DashboardPreferenceDocument>
}

interface RegistryCollection {
  contractVersion: typeof DASHBOARD_PROFILE_CONTRACT_VERSION
  workspaceId: string
  clients: DashboardClientRegistryEntry[]
}

interface StorePaths {
  profile: string
  workspace: string
  state: string
  history: string
  accountPreferences: string
  clientPreferences: string
  clients: string
}

const MAX_PROFILE_BYTES = 1024 * 1024
const MAX_PREFERENCE_BYTES = 256 * 1024
const MAX_PATCH_OPERATIONS = 200
const CLIENT_TOUCH_INTERVAL_MS = 60 * 1000
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
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, value: unknown): void {
  const directory = path.dirname(filePath)
  const temporaryPath = `${filePath}.tmp`
  mkdirSync(directory, { recursive: true })
  writeFileSync(temporaryPath, JSON.stringify(value), 'utf8')
  renameSync(temporaryPath, filePath)
}

function validWorkspace(value: unknown): value is DashboardWorkspaceIdentity {
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

function validState(value: unknown): value is PersistedProfileState {
  const state = value as Partial<PersistedProfileState> | null
  return Boolean(
    state &&
      state.contractVersion === DASHBOARD_PROFILE_CONTRACT_VERSION &&
      Number.isSafeInteger(state.revision) &&
      Number(state.revision) >= 0 &&
      typeof state.generation === 'string' &&
      (state.status === 'uninitialized' ||
        state.status === 'active' ||
        state.status === 'reset')
  )
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

  const readOrCreateWorkspace = (): DashboardWorkspaceIdentity => {
    const existing = readJson<unknown>(paths.workspace, null)
    if (validWorkspace(existing)) {
      return existing
    }
    const workspace: DashboardWorkspaceIdentity = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      installationId: createId('nvi'),
      workspaceId: createId('nvw'),
      defaultProfileId: DASHBOARD_PROFILE_ID,
      createdAt: new Date().toISOString(),
    }
    writeJson(paths.workspace, workspace)
    return workspace
  }

  const getProfile = (): DashboardProfileData | null => {
    try {
      const serialized = readFileSync(paths.profile, 'utf8')
      if (Buffer.byteLength(serialized) > MAX_PROFILE_BYTES) {
        return null
      }
      const parsed = JSON.parse(serialized)
      if (!isValidDashboardProfileData(parsed)) {
        return null
      }
      const sanitized = sanitizeDashboardProfileData(parsed)
      if (JSON.stringify(sanitized) !== serialized) {
        writeJson(paths.profile, sanitized)
      }
      return sanitized
    } catch {
      return null
    }
  }

  const getHistory = (): PersistedHistoryEntry[] => {
    const history = readJson<unknown>(paths.history, [])
    if (!Array.isArray(history)) {
      return []
    }
    let changed = false
    const sanitizedHistory = (history as PersistedHistoryEntry[])
      .filter(
        (entry) =>
          entry &&
          entry.metadata &&
          Number.isSafeInteger(entry.metadata.revision) &&
          (entry.profile === null || isValidDashboardProfileData(entry.profile))
      )
      .map((entry) => {
        if (!entry.profile) {
          return entry
        }
        const profile = sanitizeDashboardProfileData(entry.profile)
        if (JSON.stringify(profile) !== JSON.stringify(entry.profile)) {
          changed = true
        }
        return { metadata: entry.metadata, profile }
      })
      .slice(-DASHBOARD_PROFILE_HISTORY_LIMIT)
    if (sanitizedHistory.length !== history.length) {
      changed = true
    }
    if (changed) {
      writeJson(paths.history, sanitizedHistory)
    }
    return sanitizedHistory
  }

  const appendHistory = (
    metadata: DashboardProfileRevisionMetadata,
    profile: DashboardProfileData | null
  ) => {
    writeJson(
      paths.history,
      [
        ...getHistory(),
        { metadata, profile: profile ? sanitizeDashboardProfileData(profile) : null },
      ].slice(-DASHBOARD_PROFILE_HISTORY_LIMIT)
    )
  }

  const getState = (): PersistedProfileState => {
    const existing = readJson<unknown>(paths.state, null)
    if (validState(existing)) {
      return existing
    }

    const workspace = readOrCreateWorkspace()
    const legacyProfile = getProfile()
    if (legacyProfile) {
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
      }
      writeJson(paths.state, migrated)
      appendHistory(metadata, legacyProfile)
      return migrated
    }

    const history = getHistory()
    const latest = history.at(-1)
    if (latest) {
      const recovered: PersistedProfileState = {
        contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
        revision: latest.metadata.revision,
        generation: latest.metadata.generation,
        status: latest.profile ? 'active' : 'reset',
        resetRevision: latest.profile ? null : latest.metadata.revision,
        metadata: latest.metadata,
      }
      writeJson(paths.state, recovered)
      return recovered
    }

    const initial: PersistedProfileState = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      revision: 0,
      generation: createDashboardProfileGeneration(),
      status: 'uninitialized',
      resetRevision: null,
      metadata: null,
    }
    writeJson(paths.state, initial)
    return initial
  }

  const getRecovery = (): DashboardProfileRecovery => {
    const state = getState()
    const recoverableRevision =
      getHistory()
        .slice()
        .reverse()
        .find((entry) => entry.profile)?.metadata.revision ?? null
    if (state.status === 'reset') {
      return {
        status: 'reset',
        resetRevision: state.resetRevision,
        latestRecoverableRevision: recoverableRevision,
      }
    }
    if (state.status === 'uninitialized') {
      return {
        status: 'uninitialized',
        resetRevision: null,
        latestRecoverableRevision: recoverableRevision,
      }
    }
    if (getProfile()) {
      return {
        status: 'active',
        resetRevision: null,
        latestRecoverableRevision: recoverableRevision,
      }
    }
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
    if (sanitizedProfile) {
      writeJson(paths.profile, sanitizedProfile)
    } else {
      rmSync(paths.profile, { force: true })
    }
    const next: PersistedProfileState = {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      revision: metadata.revision,
      generation: metadata.generation,
      status: sanitizedProfile ? 'active' : 'reset',
      resetRevision: sanitizedProfile ? null : metadata.revision,
      metadata,
    }
    writeJson(paths.state, next)
    appendHistory(metadata, sanitizedProfile)
    return next
  }

  const readRegistry = (): RegistryCollection => {
    const workspace = readOrCreateWorkspace()
    const candidate = readJson<unknown>(paths.clients, null)
    const registry =
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      Array.isArray((candidate as Partial<RegistryCollection>).clients)
        ? (candidate as RegistryCollection)
        : {
            contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
            workspaceId: workspace.workspaceId,
            clients: [],
          }
    return {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      workspaceId: workspace.workspaceId,
      clients: registry.clients,
    }
  }

  const readPreferenceCollection = (
    file: string
  ): PreferenceCollection => {
    const candidate = readJson<unknown>(file, null)
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
          /^[A-Za-z0-9_-]{8,128}$/.test(document.clientId)
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
      if (changed) {
        writeJson(file, collection)
      }
      return collection
    }
    return {
      contractVersion: DASHBOARD_PROFILE_CONTRACT_VERSION,
      records: {},
    }
  }

  return {
    getPaths: () => paths,
    getWorkspace: readOrCreateWorkspace,
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
      return getHistory()
        .slice()
        .reverse()
        .map((entry) => ({ ...entry.metadata, hasProfile: Boolean(entry.profile) }))
    },
    getRevision(revision: number): PersistedHistoryEntry | null {
      return getHistory().find((entry) => entry.metadata.revision === revision) ?? null
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
      const entry = getHistory().find(
        (candidate) => candidate.metadata.revision === revision && candidate.profile
      )
      if (!entry?.profile) {
        return null
      }
      return persistRevision(entry.profile, author, 'restore', ['/'], revision)
    },
    rotateGeneration() {
      const state = getState()
      state.generation = createDashboardProfileGeneration()
      writeJson(paths.state, state)
      return state.generation
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
      client?: DashboardProfileClient
    ): DashboardPreferenceDocument | null {
      const file =
        scope === 'account' ? paths.accountPreferences : paths.clientPreferences
      const collection = readPreferenceCollection(file)
      const key =
        scope === 'client'
          ? `client:${client?.id ?? ''}`
          : principalKey(principal)
      return collection.records[key] ?? null
    },
    savePreference(
      scope: DashboardPreferenceScope,
      principal: ViteDashboardProfilePrincipal,
      schemaVersion: number,
      values: Record<string, unknown>,
      client?: DashboardProfileClient
    ): DashboardPreferenceDocument {
      const file =
        scope === 'account' ? paths.accountPreferences : paths.clientPreferences
      const collection = readPreferenceCollection(file)
      const key =
        scope === 'client'
          ? `client:${client?.id ?? ''}`
          : principalKey(principal)
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
      collection.records[key] = document
      writeJson(file, collection)
      return document
    },
    touchClient(
      principal: ViteDashboardProfilePrincipal,
      client: DashboardProfileClient,
      lastRevision: number | null = null
    ) {
      const registry = readRegistry()
      const current = registry.clients.find((entry) => entry.id === client.id)
      const timestamp = new Date().toISOString()
      const nextPrincipal = publicPrincipal(principal)
      const nextRevision = lastRevision ?? current?.lastRevision ?? null
      if (
        current &&
        current.name === client.name &&
        current.kind === client.kind &&
        current.lastRevision === nextRevision &&
        current.principal.providerId === nextPrincipal.providerId &&
        current.principal.userId === nextPrincipal.userId &&
        current.principal.userName === nextPrincipal.userName &&
        Number.isFinite(Date.parse(current.lastSeenAt)) &&
        Date.now() - Date.parse(current.lastSeenAt) < CLIENT_TOUCH_INTERVAL_MS
      ) {
        return current
      }
      const entry: DashboardClientRegistryEntry = {
        ...client,
        firstSeenAt: current?.firstSeenAt ?? timestamp,
        lastSeenAt: timestamp,
        lastRevision: nextRevision,
        principal: nextPrincipal,
      }
      registry.clients = [
        ...registry.clients.filter((candidate) => candidate.id !== client.id),
        entry,
      ]
        .sort((left, right) => left.lastSeenAt.localeCompare(right.lastSeenAt))
        .slice(-200)
      writeJson(paths.clients, registry)
      return entry
    },
    listClients(): DashboardClientRegistryEntry[] {
      return readRegistry().clients
        .slice()
        .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
    },
    forgetClient(clientId: string): boolean {
      const registry = readRegistry()
      const previousLength = registry.clients.length
      registry.clients = registry.clients.filter((entry) => entry.id !== clientId)
      writeJson(paths.clients, registry)
      const preferences = readPreferenceCollection(paths.clientPreferences)
      preferences.records = Object.fromEntries(
        Object.entries(preferences.records).filter(
          ([key, document]) =>
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

function readClient(req: IncomingMessage, required: boolean): DashboardProfileClient | null {
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
  const baseRevision = parseRevisionHeader(req)
  if (baseRevision !== null) {
    return baseRevision === state.revision ? 'satisfied' : 'failed'
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
  store?: ViteDashboardProfileStore
  resolvePrincipal: (
    request: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
}) {
  const store = options.store ?? createViteDashboardProfileStore()

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const principal = await options.resolvePrincipal(req)
    if (!principal) {
      sendJson(res, 401, { error: 'Authentication required' })
      return
    }

    const route = normalizedProfilePath(req)
    const method = req.method ?? 'GET'
    const client = readClient(req, false)
    if (client) {
      store.touchClient(principal, client, store.getState().revision)
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
        const writeClient = readClient(req, true)
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
            store.saveProfile(profile, { author, changedPaths })
          } else {
            const operations = JSON.parse(serialized) as DashboardProfilePatchOperation[]
            store.patchProfile(operations, author)
          }
          applyStoreHeaders(res, store)
          store.touchClient(principal, writeClient, store.getState().revision)
          sendJson(res, 200, {
            ok: true,
            revision: store.getState().revision,
            updatedAt: store.getState().metadata?.updatedAt ?? null,
          })
        } catch (error) {
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
        const writeClient = readClient(req, true)
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
      const preferenceClient = readClient(req, scope === 'client')
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
      const registryClient = readClient(req, method === 'PUT')
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
      sendJson(res, 200, {
        ok: true,
        forgotten: store.forgetClient(clientId),
        credentialsRevoked: false,
      })
      return
    }

    sendJson(res, 404, { error: 'Dashboard profile resource not found' })
  }
}
