import { createServer } from 'node:http'

const ACCEPT_HEADER =
  'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
const USER_AGENT = 'Navet RSS Reader/1.0'
const DEFAULT_PORT = 8081
const DEFAULT_HOST = '127.0.0.1'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const requestUrl = req.url
    ? new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
    : null
  const targetUrl = requestUrl?.searchParams.get('url')?.trim()

  if (!targetUrl) {
    sendJson(res, 400, { error: 'Missing url query parameter' })
    return
  }

  try {
    const parsedUrl = new URL(targetUrl)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol')
    }

    const upstreamResponse = await fetch(parsedUrl, {
      headers: {
        Accept: ACCEPT_HEADER,
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!upstreamResponse.ok) {
      sendJson(res, 502, {
        error: `Upstream feed request failed with status ${upstreamResponse.status}`,
      })
      return
    }

    const contentType =
      upstreamResponse.headers.get('content-type') ?? 'application/xml; charset=utf-8'
    const body = Buffer.from(await upstreamResponse.arrayBuffer())

    res.statusCode = 200
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', contentType)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(body)
  } catch {
    sendJson(res, 502, { error: 'Unable to load feed' })
  }
})

server.on('error', (error) => {
  console.error('[navet-rss-proxy] failed to start', error)
  process.exit(1)
})

const port = Number.parseInt(process.env.NAVET_RSS_PROXY_PORT ?? `${DEFAULT_PORT}`, 10)
const host = process.env.NAVET_RSS_PROXY_HOST ?? DEFAULT_HOST

server.listen(port, host, () => {
  console.log(`[navet-rss-proxy] listening on http://${host}:${port}`)
})
