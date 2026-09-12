import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import type { IncomingMessage } from 'node:http'
import path from 'node:path'
import {
  createInstallationCookieNames,
  type InstallationCookieNames,
} from './installation-cookie-scope.ts'

export const INSTALLATION_KEY_HEADER = 'X-Navet-Installation-Key'
const INSTALLATION_KEY_PATTERN = /^[a-f0-9]{64}$/
const SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000
const MAX_AUTHORITY_BYTES = 64 * 1024
const SETUP_GRANT_TTL_SECONDS = 10 * 60
const SETUP_CODE_PATTERN = /^[a-f0-9]{16}$/
const SETUP_ATTEMPT_LIMIT = 8
const SETUP_ATTEMPT_WINDOW_MS = 5 * 60 * 1000

interface InstallationAuthorityState {
  version: 1
  homeAssistantTarget: string | null
  openHABTarget: string | null
  homeyIds: string[]
}

export interface InstallationAuthorization {
  allowed: boolean
  pairingVerified: boolean
  upstreamTarget?: string
}

export interface ViteInstallationAuthority {
  authorizeHomeAssistant(
    req: IncomingMessage,
    target: string,
    normalizeTarget: (value: unknown) => string
  ): InstallationAuthorization
  authorizeHomeAssistantChange?(
    req: IncomingMessage,
    target: string,
    normalizeTarget: (value: unknown) => string
  ): InstallationAuthorization
  authorizeHomeyStart(req: IncomingMessage): InstallationAuthorization
  authorizeOpenHAB(
    req: IncomingMessage,
    target: string,
    normalizeTarget: (value: unknown) => string
  ): InstallationAuthorization
  commitHomeAssistant(
    target: string,
    normalizeTarget: (value: unknown) => string,
    pairingVerified: boolean
  ): boolean
  commitHomey(homeyIds: string[], pairingVerified: boolean): boolean
  commitOpenHAB(
    target: string,
    normalizeTarget: (value: unknown) => string,
    pairingVerified: boolean
  ): boolean
  getCookieNames(baseName: string): InstallationCookieNames
  getProviderSetupStatus?(
    req: IncomingMessage,
    providerId: string
  ): {
    state: 'ready' | 'approval_required' | 'unavailable'
    authorization: string
  }
  exchangeSetupCode?(
    req: IncomingMessage,
    code: unknown
  ): { approved: boolean; setCookie?: string; reason?: 'invalid' | 'rate_limited' }
}

function emptyState(): InstallationAuthorityState {
  return {
    version: 1,
    homeAssistantTarget: null,
    openHABTarget: null,
    homeyIds: [],
  }
}

function normalizeHomeyIds(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0 && value.length <= 256)
    )
  ).sort()
}

function isState(value: unknown): value is InstallationAuthorityState {
  if (!value || typeof value !== 'object') {
    return false
  }
  const state = value as Partial<InstallationAuthorityState>
  return (
    state.version === 1 &&
    (state.homeAssistantTarget === null ||
      typeof state.homeAssistantTarget === 'string') &&
    (state.openHABTarget === null || typeof state.openHABTarget === 'string') &&
    Array.isArray(state.homeyIds)
  )
}

function header(req: IncomingMessage, name: string): string {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function createViteInstallationAuthority(
  options: {
    authSessionsDirectory?: string
    cacheDirectory?: string
    hassUrlPin?: string
    homeySessionsDirectory?: string
    installationKey?: string
    keyPath?: string
    openHABSessionsDirectory?: string
    openhabUrlPin?: string
    setupCodePath?: string
    statePath?: string
    trustIngress?: boolean
  } = {}
): ViteInstallationAuthority {
  const cacheDirectory =
    options.cacheDirectory ?? path.resolve(process.cwd(), '.cache')
  const keyPath =
    options.keyPath ?? path.join(cacheDirectory, 'navet-installation-key')
  const statePath =
    options.statePath ??
    path.join(cacheDirectory, 'navet-installation-authority.json')
  const setupCodePath =
    options.setupCodePath ?? path.join(cacheDirectory, 'navet-setup-code.json')
  const authSessionsDirectory =
    options.authSessionsDirectory ??
    path.join(cacheDirectory, 'navet-auth-sessions')
  const homeySessionsDirectory =
    options.homeySessionsDirectory ??
    path.join(cacheDirectory, 'navet-provider-sessions', 'homey')
  const openHABSessionsDirectory =
    options.openHABSessionsDirectory ??
    path.join(cacheDirectory, 'navet-provider-sessions', 'openhab')
  const setupAttemptBuckets = new Map<string, { count: number; resetAt: number }>()

  const consumeSetupAttempt = (req: IncomingMessage) => {
    const forwarded = String(req.headers['x-real-ip'] ?? '')
    const address = req.socket?.remoteAddress || forwarded || 'local'
    const now = Date.now()
    const bucket = setupAttemptBuckets.get(address)
    if (!bucket || bucket.resetAt <= now) {
      setupAttemptBuckets.set(address, {
        count: 1,
        resetAt: now + SETUP_ATTEMPT_WINDOW_MS,
      })
      return true
    }
    bucket.count += 1
    return bucket.count <= SETUP_ATTEMPT_LIMIT
  }

  const resolveInstallationKey = () => {
    const configured =
      options.installationKey?.trim() ||
      process.env.NAVET_INSTALLATION_KEY?.trim() ||
      ''
    if (configured && !INSTALLATION_KEY_PATTERN.test(configured)) {
      throw new Error(
        'NAVET_INSTALLATION_KEY must contain exactly 64 lowercase hexadecimal characters'
      )
    }

    let persisted = ''
    try {
      persisted = readFileSync(keyPath, 'utf8').trim()
      if (!INSTALLATION_KEY_PATTERN.test(persisted)) {
        throw new Error('Persisted Navet installation key is invalid')
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw error
      }
    }
    if (persisted) {
      if (configured && configured !== persisted) {
        throw new Error(
          'NAVET_INSTALLATION_KEY does not match the persisted Navet installation key'
        )
      }
      return persisted
    }

    const candidate = configured || randomBytes(32).toString('hex')
    mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 })
    try {
      writeFileSync(keyPath, `${candidate}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') {
        throw error
      }
      const persisted = readFileSync(keyPath, 'utf8').trim()
      if (!INSTALLATION_KEY_PATTERN.test(persisted)) {
        throw new Error('Persisted Navet installation key is invalid')
      }
      if (configured && configured !== persisted) {
        throw new Error(
          'NAVET_INSTALLATION_KEY does not match the persisted Navet installation key'
        )
      }
      return persisted
    }
    if (!configured) {
      console.warn('Navet installation security initialized.')
    }
    return candidate
  }
  const installationKey = resolveInstallationKey()

  const createSetupCode = () => {
    const raw = randomBytes(8).toString('hex')
    const code = raw.match(/.{1,4}/g)?.join('-') ?? raw
    mkdirSync(path.dirname(setupCodePath), { recursive: true, mode: 0o700 })
    writeFileSync(
      setupCodePath,
      JSON.stringify({ version: 1, code, expiresAt: Date.now() + 10 * 60 * 1000 }),
      { encoding: 'utf8', mode: 0o600 }
    )
    console.warn(`Navet setup code: ${code} (valid for 10 minutes).`)
  }
  try {
    const stored = JSON.parse(readFileSync(setupCodePath, 'utf8')) as { expiresAt?: unknown }
    if (typeof stored.expiresAt !== 'number' || stored.expiresAt < Date.now()) {
      createSetupCode()
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT' || error instanceof SyntaxError) {
      createSetupCode()
    } else {
      throw error
    }
  }

  const setupCookieName = `navet_setup_grant_${createHash('sha256')
    .update(installationKey)
    .digest('hex')
    .slice(0, 12)}`
  const readCookie = (req: IncomingMessage, name: string) => {
    for (const entry of header(req, 'cookie').split(';')) {
      const separator = entry.indexOf('=')
      if (separator > 0 && entry.slice(0, separator).trim() === name) {
        return entry.slice(separator + 1).trim()
      }
    }
    return ''
  }
  const hasValidSetupGrant = (req: IncomingMessage) => {
    const [expiresAt, signature] = readCookie(req, setupCookieName).split('.')
    if (!expiresAt || !signature || Number(expiresAt) < Date.now()) {
      return false
    }
    const expected = createHmac('sha256', installationKey)
      .update(`setup-grant:${expiresAt}`)
      .digest('hex')
    return (
      /^[a-f0-9]{64}$/.test(signature) &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
  }

  const hasValidPairingKey = (req: IncomingMessage) => {
    const candidate = header(req, INSTALLATION_KEY_HEADER).trim()
    const candidateBuffer = Buffer.from(candidate.padEnd(64, '\0').slice(0, 64))
    const expectedBuffer = Buffer.from(installationKey)
    return (
      INSTALLATION_KEY_PATTERN.test(candidate) &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    ) || hasValidSetupGrant(req)
  }

  const readState = (): InstallationAuthorityState => {
    try {
      if (statSync(statePath).size > MAX_AUTHORITY_BYTES) {
        throw new Error('Installation authority state is too large')
      }
      const parsed: unknown = JSON.parse(readFileSync(statePath, 'utf8'))
      if (!isState(parsed)) {
        throw new Error('Installation authority state is invalid')
      }
      return {
        ...parsed,
        homeyIds: normalizeHomeyIds(parsed.homeyIds),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return emptyState()
      }
      throw error
    }
  }

  const writeState = (state: InstallationAuthorityState) => {
    mkdirSync(path.dirname(statePath), { recursive: true, mode: 0o700 })
    const temporary = `${statePath}.tmp-${randomBytes(8).toString('hex')}`
    try {
      writeFileSync(temporary, JSON.stringify(state), {
        encoding: 'utf8',
        mode: 0o600,
      })
      renameSync(temporary, statePath)
    } catch (error) {
      rmSync(temporary, { force: true })
      throw error
    }
  }

  const readRecords = (directory: string): Array<Record<string, unknown>> => {
    let names: string[]
    try {
      names = readdirSync(directory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return []
      }
      throw error
    }
    const now = Date.now()
    const records: Array<Record<string, unknown>> = []
    for (const name of names) {
      if (records.length >= 256) {
        break
      }
      if (!/^[a-f0-9]{64}\.json$/.test(name)) {
        continue
      }
      const filePath = path.join(directory, name)
      try {
        if (statSync(filePath).size > MAX_AUTHORITY_BYTES) {
          continue
        }
        const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          continue
        }
        const record = parsed as Record<string, unknown>
        if (
          record.auth &&
          typeof record.updatedAt === 'number' &&
          record.updatedAt + SESSION_IDLE_TTL_MS >= now
        ) {
          records.push(record)
        }
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException)?.code !== 'ENOENT' &&
          !(error instanceof SyntaxError)
        ) {
          throw error
        }
      }
    }
    return records
  }

  const unanimousTarget = (
    directory: string,
    normalizeTarget: (value: unknown) => string
  ) => {
    const targets = new Set<string>()
    for (const record of readRecords(directory)) {
      const auth = record.auth as { hassUrl?: unknown }
      const target = normalizeTarget(auth.hassUrl)
      if (target) {
        targets.add(target)
      }
    }
    return targets.size === 1 ? Array.from(targets)[0] : ''
  }

  const authorizeTarget = (
    req: IncomingMessage,
    providerId: 'home_assistant' | 'openhab',
    target: string,
    normalizeTarget: (value: unknown) => string,
    allowBrowserAlias: boolean
  ): InstallationAuthorization => {
    if (options.trustIngress) {
      return { allowed: true, pairingVerified: false }
    }
    const normalizedTarget = normalizeTarget(target)
    if (!normalizedTarget) {
      return { allowed: false, pairingVerified: false }
    }
    const rawPin =
      providerId === 'home_assistant'
        ? options.hassUrlPin
        : options.openhabUrlPin
    const pin = rawPin ? normalizeTarget(rawPin) : ''
    if (rawPin) {
      if (pin && pin !== normalizedTarget && allowBrowserAlias) {
        return {
          allowed: true,
          pairingVerified: false,
          upstreamTarget: pin,
        }
      }
      return {
        allowed: Boolean(pin && pin === normalizedTarget),
        pairingVerified: false,
      }
    }
    const state = readState()
    const stateTarget =
      providerId === 'home_assistant'
        ? state.homeAssistantTarget
        : state.openHABTarget
    if (stateTarget === normalizedTarget) {
      return { allowed: true, pairingVerified: false }
    }
    const pairingVerified = hasValidPairingKey(req)
    if (stateTarget) {
      if (pairingVerified) {
        return { allowed: true, pairingVerified: true }
      }
      if (allowBrowserAlias) {
        return {
          allowed: true,
          pairingVerified: false,
          upstreamTarget: stateTarget,
        }
      }
      return { allowed: false, pairingVerified: false }
    }
    if (!stateTarget) {
      const evidence = unanimousTarget(
        providerId === 'home_assistant'
          ? authSessionsDirectory
          : openHABSessionsDirectory,
        normalizeTarget
      )
      if (evidence === normalizedTarget) {
        return { allowed: true, pairingVerified: false }
      }
      if (evidence && !pairingVerified && allowBrowserAlias) {
        return {
          allowed: true,
          pairingVerified: false,
          upstreamTarget: evidence,
        }
      }
    }
    return { allowed: pairingVerified, pairingVerified }
  }

  const commitTarget = (
    providerId: 'home_assistant' | 'openhab',
    target: string,
    normalizeTarget: (value: unknown) => string,
    pairingVerified: boolean
  ) => {
    if (options.trustIngress) {
      return true
    }
    const normalizedTarget = normalizeTarget(target)
    const rawPin =
      providerId === 'home_assistant'
        ? options.hassUrlPin
        : options.openhabUrlPin
    const pin = rawPin ? normalizeTarget(rawPin) : ''
    if (!normalizedTarget || (rawPin && pin !== normalizedTarget)) {
      return false
    }
    const state = readState()
    const key =
      providerId === 'home_assistant'
        ? 'homeAssistantTarget'
        : 'openHABTarget'
    const pinnedMigration = Boolean(rawPin) && pin === normalizedTarget
    if (
      state[key] &&
      state[key] !== normalizedTarget &&
      !pairingVerified &&
      !pinnedMigration
    ) {
      return false
    }
    if (state[key] !== normalizedTarget) {
      state[key] = normalizedTarget
      writeState(state)
    }
    return true
  }

  const knownHomeyIds = () => {
    const state = readState()
    if (state.homeyIds.length > 0) {
      return state.homeyIds
    }
    const recordIds: string[][] = []
    for (const record of readRecords(homeySessionsDirectory)) {
      const auth = record.auth as { homeys?: Array<{ id?: unknown }> }
      if (!Array.isArray(auth.homeys)) {
        return []
      }
      const ids: string[] = []
      for (const homey of auth.homeys ?? []) {
        if (typeof homey.id === 'string') {
          ids.push(homey.id)
        }
      }
      const normalized = normalizeHomeyIds(ids)
      if (normalized.length === 0) {
        return []
      }
      recordIds.push(normalized)
    }
    if (recordIds.length === 0) {
      return []
    }
    if (recordIds.length === 1) {
      return recordIds[0]
    }
    return recordIds[0].filter((homeyId) =>
      recordIds.slice(1).every((ids) => ids.includes(homeyId))
    )
  }

  return {
    authorizeHomeAssistant(req, target, normalizeTarget) {
      return authorizeTarget(req, 'home_assistant', target, normalizeTarget, true)
    },
    authorizeHomeAssistantChange(req, target, normalizeTarget) {
      return authorizeTarget(req, 'home_assistant', target, normalizeTarget, false)
    },
    authorizeHomeyStart(req) {
      if (options.trustIngress) {
        return { allowed: true, pairingVerified: false }
      }
      const pairingVerified = hasValidPairingKey(req)
      return {
        allowed: pairingVerified || knownHomeyIds().length > 0,
        pairingVerified,
      }
    },
    authorizeOpenHAB(req, target, normalizeTarget) {
      return authorizeTarget(req, 'openhab', target, normalizeTarget, false)
    },
    commitHomeAssistant(target, normalizeTarget, pairingVerified) {
      return commitTarget(
        'home_assistant',
        target,
        normalizeTarget,
        pairingVerified
      )
    },
    commitHomey(homeyIds, pairingVerified) {
      if (options.trustIngress) {
        return true
      }
      const requested = normalizeHomeyIds(homeyIds)
      const known = knownHomeyIds()
      if (
        !pairingVerified &&
        (requested.length === 0 ||
          !requested.every((homeyId) => known.includes(homeyId)))
      ) {
        return false
      }
      const state = readState()
      const nextIds = pairingVerified
        ? normalizeHomeyIds([...state.homeyIds, ...known, ...requested])
        : normalizeHomeyIds(
            state.homeyIds.length > 0 ? state.homeyIds : known
          )
      if (JSON.stringify(nextIds) !== JSON.stringify(state.homeyIds)) {
        state.homeyIds = nextIds
        writeState(state)
      }
      return true
    },
    commitOpenHAB(target, normalizeTarget, pairingVerified) {
      return commitTarget('openhab', target, normalizeTarget, pairingVerified)
    },
    getCookieNames(baseName) {
      return createInstallationCookieNames(baseName, installationKey)
    },
    getProviderSetupStatus(req, providerId) {
      if (options.trustIngress) {
        return { state: 'ready', authorization: 'trusted_runtime' }
      }
      if (hasValidPairingKey(req)) {
        return { state: 'ready', authorization: 'setup_proof' }
      }

      const state = readState()
      let configured = false
      if (providerId === 'home_assistant') {
        configured = Boolean(
          options.hassUrlPin ||
            state.homeAssistantTarget ||
            readRecords(authSessionsDirectory).length > 0
        )
      } else if (providerId === 'openhab') {
        configured = Boolean(
          options.openhabUrlPin ||
            state.openHABTarget ||
            readRecords(openHABSessionsDirectory).length > 0
        )
      } else if (providerId === 'homey') {
        configured = knownHomeyIds().length > 0
      } else {
        return { state: 'unavailable', authorization: 'none' }
      }
      return {
        state: configured ? 'ready' : 'approval_required',
        authorization: configured ? 'approved_connection' : 'none',
      }
    },
    exchangeSetupCode(req, code) {
      if (!consumeSetupAttempt(req)) {
        return { approved: false, reason: 'rate_limited' }
      }
      let record: { code?: unknown; expiresAt?: unknown }
      try {
        record = JSON.parse(readFileSync(setupCodePath, 'utf8')) as typeof record
      } catch {
        return { approved: false, reason: 'invalid' }
      }
      const presented = String(code ?? '')
        .toLowerCase()
        .replace(/[^a-f0-9]/g, '')
      const expected = String(record.code ?? '')
        .toLowerCase()
        .replace(/[^a-f0-9]/g, '')
      if (
        !SETUP_CODE_PATTERN.test(presented) ||
        !SETUP_CODE_PATTERN.test(expected) ||
        typeof record.expiresAt !== 'number' ||
        record.expiresAt < Date.now() ||
        !timingSafeEqual(Buffer.from(presented), Buffer.from(expected))
      ) {
        return { approved: false, reason: 'invalid' }
      }
      try {
        rmSync(setupCodePath)
      } catch {
        return { approved: false, reason: 'invalid' }
      }
      const expiresAt = Date.now() + SETUP_GRANT_TTL_SECONDS * 1000
      const signature = createHmac('sha256', installationKey)
        .update(`setup-grant:${expiresAt}`)
        .digest('hex')
      return {
        approved: true,
        setCookie: `${setupCookieName}=${expiresAt}.${signature}; Path=/; Max-Age=${SETUP_GRANT_TTL_SECONDS}; HttpOnly; SameSite=Strict`,
      }
    },
  }
}
