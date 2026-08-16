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

export function buildHomeAssistantProxyRequestHeaders(
  sourceHeaders: IncomingMessage['headers'],
  sessionAccessToken: string,
  options: { forwardContentType?: boolean; includeAuthorization?: boolean } = {}
) {
  const headers = copyProxyRequestHeaders(sourceHeaders)
  if (options.forwardContentType) {
    const contentType = sourceHeaders['content-type']
    if (typeof contentType === 'string' && contentType.length > 0) {
      headers.set('Content-Type', contentType)
    } else if (Array.isArray(contentType) && contentType.length > 0) {
      headers.set('Content-Type', contentType[0] ?? '')
    }
  }
  if (options.includeAuthorization !== false) {
    headers.set('Authorization', `Bearer ${sessionAccessToken}`)
  }
  return headers
}

export function isHomeAssistantOAuthProxyBodyRequest(
  method: string | undefined,
  targetPath: string
) {
  if ((method ?? 'GET').toUpperCase() !== 'POST') {
    return false
  }

  const pathname = targetPath.split('?', 1)[0]
  return pathname === '/auth/token' || pathname === '/auth/revoke'
}
