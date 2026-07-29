import type { IncomingMessage } from 'node:http'

const DEFAULT_ATTEMPT_LIMIT = 5
const DEFAULT_WINDOW_MS = 60 * 1000
const DEFAULT_MAX_SOURCES = 512

export interface OpenHABLoginRateLimit {
  allowed: boolean
  retryAfterSeconds: number
}

export interface ViteOpenHABLoginRateLimiter {
  consume(req: IncomingMessage): OpenHABLoginRateLimit
  reset(req: IncomingMessage): void
}

export function createViteOpenHABLoginRateLimiter(
  options: {
    attemptLimit?: number
    maxSources?: number
    now?: () => number
    windowMs?: number
  } = {}
): ViteOpenHABLoginRateLimiter {
  const attemptLimit = options.attemptLimit ?? DEFAULT_ATTEMPT_LIMIT
  const maxSources = options.maxSources ?? DEFAULT_MAX_SOURCES
  const now = options.now ?? Date.now
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const attemptsBySource = new Map<
    string,
    { count: number; resetAt: number }
  >()

  const getSource = (req: IncomingMessage) => {
    const source = req.socket.remoteAddress?.trim() ?? ''
    return source && source.length <= 128 ? source : 'unknown'
  }

  const pruneExpired = (timestamp: number) => {
    for (const [source, attempt] of attemptsBySource) {
      if (attempt.resetAt <= timestamp) {
        attemptsBySource.delete(source)
      }
    }
  }

  const reserveSource = () => {
    if (attemptsBySource.size < maxSources) {
      return
    }
    let oldest: { resetAt: number; source: string } | null = null
    for (const [source, attempt] of attemptsBySource) {
      if (!oldest || attempt.resetAt < oldest.resetAt) {
        oldest = { resetAt: attempt.resetAt, source }
      }
    }
    if (oldest) {
      attemptsBySource.delete(oldest.source)
    }
  }

  return {
    consume(req) {
      const timestamp = now()
      pruneExpired(timestamp)
      const source = getSource(req)
      let attempt = attemptsBySource.get(source)
      if (!attempt) {
        reserveSource()
        attempt = { count: 0, resetAt: timestamp + windowMs }
        attemptsBySource.set(source, attempt)
      }
      if (attempt.count >= attemptLimit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((attempt.resetAt - timestamp) / 1000)
          ),
        }
      }
      attempt.count += 1
      return { allowed: true, retryAfterSeconds: 0 }
    },
    reset(req) {
      attemptsBySource.delete(getSource(req))
    },
  }
}
