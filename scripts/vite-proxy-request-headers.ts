import type { IncomingMessage } from 'node:http'

const FORWARDED_PROXY_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'cache-control',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'range',
] as const

export function copyProxyRequestHeaders(sourceHeaders: IncomingMessage['headers']) {
  const headers = new Headers()

  for (const headerName of FORWARDED_PROXY_REQUEST_HEADERS) {
    const value = sourceHeaders[headerName]
    if (typeof value === 'string' && value.length > 0) {
      headers.set(headerName, value)
      continue
    }

    if (Array.isArray(value) && value.length > 0) {
      headers.set(headerName, value.join(', '))
    }
  }

  return headers
}
