import {
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
} from './installation-cookie-scope'

export const INSTALLATION_KEY_HEADER = 'X-Navet-Installation-Key'
const INSTALLATION_KEY_PATTERN = /^[a-f0-9]{64}$/
const SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000
const MAX_AUTHORITY_BYTES = 64 * 1024

interface InstallationAuthorityState {
  version: 1
  homeAssistantTarget: string | null
  openHABTarget: string | null
  homeyIds: string[]
}

export interface InstallationAuthorization {
  allowed: boolean
  pairingVerified: boolean
}

export interface ViteInstallationAuthority {
  authorizeHomeAssistant(
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
  const authSessionsDirectory =
    options.authSessionsDirectory ??
    path.join(cacheDirectory, 'navet-auth-sessions')
  const homeySessionsDirectory =
    options.homeySessionsDirectory ??
    path.join(cacheDirectory, 'navet-provider-sessions', 'homey')
  const openHABSessionsDirectory =
    options.openHABSessionsDirectory ??
    path.join(cacheDirectory, 'navet-provider-sessions', 'openhab')

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
      console.warn(
        'Navet operator pairing key created. Append ' +
          `#navet_pairing=${candidate} to your trusted Navet URL for first enrollment.`
      )
    }
    return candidate
  }
  const installationKey = resolveInstallationKey()

  const hasValidPairingKey = (req: IncomingMessage) => {
    const candidate = header(req, INSTALLATION_KEY_HEADER).trim()
    const candidateBuffer = Buffer.from(candidate.padEnd(64, '\0').slice(0, 64))
    const expectedBuffer = Buffer.from(installationKey)
    return (
      INSTALLATION_KEY_PATTERN.test(candidate) &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    )
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
    normalizeTarget: (value: unknown) => string
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
    }
    const pairingVerified = hasValidPairingKey(req)
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
      return authorizeTarget(req, 'home_assistant', target, normalizeTarget)
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
      return authorizeTarget(req, 'openhab', target, normalizeTarget)
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
  }
}
