import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { ChoreWorkspaceData } from '../packages/core/src/chores'
import { isChoreWorkspaceData } from '../packages/core/src/chores'
import {
  CHORE_WORKSPACE_HEADERS,
  type ChoreWorkspaceCommandRequest,
  type ChoreWorkspaceDocument,
} from '../packages/app/src/services/chore-workspace.contract'
import type { ViteDashboardProfilePrincipal } from './vite-dashboard-profile-store'
import { isViteStrictSameOriginMutation } from './vite-provider-session-store'

const CONTRACT_VERSION = 1
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
const MAX_JOURNAL_BYTES = 512 * 1024
const MAX_JOURNAL_ITEMS = 500

interface PersistedChoreWorkspaceDocument extends ChoreWorkspaceDocument {
  contractVersion: typeof CONTRACT_VERSION
  tenantId: string
}

interface ChoreCommandJournal {
  contractVersion: typeof CONTRACT_VERSION
  commands: Array<{ commandId: string; revision: number; timestamp: string }>
}

function emptyChoreWorkspace(): ChoreWorkspaceData {
  return {
    schemaVersion: 1,
    participantsById: {},
    definitionsById: {},
    occurrencesById: {},
    activity: [],
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

function readJson<T>(filePath: string, fallback: T, maxBytes: number): T {
  try {
    if (statSync(filePath).size > maxBytes) {
      throw new Error('Chore storage exceeds its safe read limit')
    }
    return JSON.parse(readFileSync(filePath, 'utf8')) as T
  } catch (error) {
    if (isMissingFile(error)) {
      return fallback
    }
    throw error
  }
}

function writeJson(filePath: string, value: unknown, maxBytes: number): void {
  const serialized = JSON.stringify(value)
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    throw new Error('Chore workspace is too large')
  }
  mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  writeFileSync(temporaryPath, serialized, 'utf8')
  renameSync(temporaryPath, filePath)
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function publicDocument(document: PersistedChoreWorkspaceDocument): ChoreWorkspaceDocument {
  return {
    revision: document.revision,
    updatedAt: document.updatedAt,
    data: document.data,
  }
}

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > MAX_DOCUMENT_BYTES) {
      throw new Error('Chore command is too large')
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function normalizeRoute(req: IncomingMessage): string {
  const rawUrl = (req.url ?? '/').split('?')[0].replace(/\/+$/, '') || '/'
  return rawUrl.startsWith('/__navet_chores__')
    ? rawUrl.slice('/__navet_chores__'.length) || '/'
    : rawUrl
}

export function createViteChoreStoreRequestHandler(options: {
  filePath?: string
  resolvePrincipal: (
    request: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
}) {
  const filePath =
    options.filePath ?? path.resolve(process.cwd(), '.cache', 'navet-chore-workspace.json')
  const journalPath = `${filePath}.journal`

  const readDocument = (tenantId: string): PersistedChoreWorkspaceDocument => {
    const missing = Symbol('missing-chore-workspace')
    const document = readJson<PersistedChoreWorkspaceDocument | typeof missing>(
      filePath,
      missing,
      MAX_DOCUMENT_BYTES
    )
    if (document === missing) {
      return {
        contractVersion: CONTRACT_VERSION,
        tenantId,
        revision: 0,
        updatedAt: new Date().toISOString(),
        data: emptyChoreWorkspace(),
      }
    }
    if (
      document.contractVersion !== CONTRACT_VERSION ||
      document.tenantId !== tenantId ||
      !Number.isSafeInteger(document.revision) ||
      typeof document.updatedAt !== 'string' ||
      !isChoreWorkspaceData(document.data)
    ) {
      throw new Error('Chore workspace is unavailable for this installation')
    }
    return document
  }

  const readJournal = (): ChoreCommandJournal => {
    const journal = readJson<ChoreCommandJournal>(
      journalPath,
      { contractVersion: CONTRACT_VERSION, commands: [] },
      MAX_JOURNAL_BYTES
    )
    if (journal.contractVersion !== CONTRACT_VERSION || !Array.isArray(journal.commands)) {
      throw new Error('Chore command journal is invalid')
    }
    return journal
  }

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const principal = await options.resolvePrincipal(req)
    if (!principal) {
      sendJson(res, 401, { error: 'Authentication required' })
      return
    }
    const method = req.method ?? 'GET'
    if (method !== 'GET' && !isViteStrictSameOriginMutation(req)) {
      sendJson(res, 403, { error: 'Cross-origin chore mutation is not allowed' })
      return
    }

    try {
      const route = normalizeRoute(req)
      const document = readDocument(principal.tenantId)
      res.setHeader(CHORE_WORKSPACE_HEADERS.revision, String(document.revision))

      if (route === '/workspace' && method === 'GET') {
        const clientRevision = Number.parseInt(
          getHeader(req, CHORE_WORKSPACE_HEADERS.revision) ?? '',
          10
        )
        if (Number.isSafeInteger(clientRevision) && clientRevision === document.revision) {
          res.statusCode = 304
          res.setHeader('Cache-Control', 'no-store')
          res.end()
          return
        }
        sendJson(res, 200, publicDocument(document))
        return
      }

      if (route === '/commands' && method === 'POST') {
        let request: ChoreWorkspaceCommandRequest
        try {
          request = JSON.parse(await readBody(req)) as ChoreWorkspaceCommandRequest
        } catch {
          sendJson(res, 400, { error: 'Chore command must be valid JSON' })
          return
        }
        const baseRevision = Number.parseInt(
          getHeader(req, CHORE_WORKSPACE_HEADERS.baseRevision) ?? '',
          10
        )
        if (
          typeof request.commandId !== 'string' ||
          request.commandId.length === 0 ||
          request.commandId.length > 200 ||
          !Number.isSafeInteger(request.baseRevision) ||
          request.baseRevision !== baseRevision ||
          !isChoreWorkspaceData(request.data)
        ) {
          sendJson(res, 400, { error: 'Chore command is invalid' })
          return
        }

        const journal = readJournal()
        if (
          document.data.activity.some((activity) => activity.commandId === request.commandId) ||
          journal.commands.some((command) => command.commandId === request.commandId)
        ) {
          sendJson(res, 200, publicDocument(document))
          return
        }
        if (baseRevision !== document.revision) {
          sendJson(res, 412, {
            error: 'Chore workspace changed on another client',
            revision: document.revision,
          })
          return
        }
        if (
          request.data.activity.filter((activity) => activity.commandId === request.commandId)
            .length !== 1
        ) {
          sendJson(res, 400, {
            error: 'Chore command must include one matching activity entry',
          })
          return
        }

        const next: PersistedChoreWorkspaceDocument = {
          contractVersion: CONTRACT_VERSION,
          tenantId: principal.tenantId,
          revision: document.revision + 1,
          updatedAt: new Date().toISOString(),
          data: request.data,
        }
        const nextJournal: ChoreCommandJournal = {
          contractVersion: CONTRACT_VERSION,
          commands: [
            ...journal.commands,
            {
              commandId: request.commandId,
              revision: next.revision,
              timestamp: next.updatedAt,
            },
          ].slice(-MAX_JOURNAL_ITEMS),
        }
        writeJson(filePath, next, MAX_DOCUMENT_BYTES)
        writeJson(journalPath, nextJournal, MAX_JOURNAL_BYTES)
        res.setHeader(CHORE_WORKSPACE_HEADERS.revision, String(next.revision))
        sendJson(res, 200, publicDocument(next))
        return
      }

      sendJson(res, 404, { error: 'Chore workspace resource not found' })
    } catch {
      sendJson(res, 503, { error: 'Chore workspace storage is unavailable' })
    }
  }
}
