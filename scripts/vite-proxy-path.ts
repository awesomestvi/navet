export function normalizeViteProxyTargetPath(proxyBasePath: string, requestUrl: string): string {
  const normalizedBasePath = proxyBasePath.endsWith('/')
    ? proxyBasePath.slice(0, -1)
    : proxyBasePath

  const withoutPrefix = requestUrl.startsWith(normalizedBasePath)
    ? requestUrl.slice(normalizedBasePath.length)
    : requestUrl

  if (!withoutPrefix || withoutPrefix === '/') {
    return '/'
  }

  return withoutPrefix.startsWith('/') ? withoutPrefix : `/${withoutPrefix}`
}
