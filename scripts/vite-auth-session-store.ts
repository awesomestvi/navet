import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface HomeAssistantAuthData {
  hassUrl: string
  clientId: string | null
  expires: number
  refresh_token: string
  access_token: string
  expires_in: number
}

export function isValidAuthData(value: unknown): value is HomeAssistantAuthData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<HomeAssistantAuthData>
  return (
    typeof data.hassUrl === 'string' &&
    /^https?:\/\//.test(data.hassUrl) &&
    (typeof data.clientId === 'string' || data.clientId === null) &&
    typeof data.expires === 'number' &&
    typeof data.refresh_token === 'string' &&
    data.refresh_token.length > 0 &&
    typeof data.access_token === 'string' &&
    data.access_token.length > 0 &&
    typeof data.expires_in === 'number'
  )
}

export function createViteAuthSessionStore(
  sessionFilePath = path.resolve(process.cwd(), '.cache', 'navet-auth-session.json')
) {
  let authSession = loadPersistedAuthSession(sessionFilePath)

  return {
    getSerializedSession(): string | null {
      return authSession
    },
    getAuthSession(): HomeAssistantAuthData | null {
      if (!authSession) {
        return null
      }

      try {
        const parsed = JSON.parse(authSession)
        return isValidAuthData(parsed) ? parsed : null
      } catch {
        return null
      }
    },
    saveAuthSession(data: HomeAssistantAuthData) {
      const serialized = JSON.stringify(data)
      const sessionDir = path.dirname(sessionFilePath)
      const tempFilePath = `${sessionFilePath}.tmp`

      mkdirSync(sessionDir, { recursive: true })
      writeFileSync(tempFilePath, serialized, 'utf8')
      renameSync(tempFilePath, sessionFilePath)
      authSession = serialized
    },
    clearAuthSession() {
      authSession = null
      rmSync(sessionFilePath, { force: true })
    },
  }
}

function loadPersistedAuthSession(sessionFilePath: string): string | null {
  try {
    const serialized = readFileSync(sessionFilePath, 'utf8')
    const parsed = JSON.parse(serialized)
    return isValidAuthData(parsed) ? serialized : null
  } catch {
    return null
  }
}
