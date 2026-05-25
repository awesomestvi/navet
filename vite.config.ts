import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { lookup } from 'node:dns/promises'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { Readable } from 'node:stream'
import path from 'path'
import {
  defineConfig,
  loadEnv,
  type PluginOption,
  type PreviewServer,
  type ViteDevServer,
} from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  createViteAuthSessionStore,
  type HomeAssistantAuthData,
  isValidAuthData,
} from './scripts/vite-auth-session-store'
import { getAppChunkName, getVendorChunkName, isLazyHtmlPreload } from './scripts/vite-chunking'
import {
  isAllowedRSSContentType,
  isBlockedRSSHostname,
  isPrivateIpAddress,
} from './src/app/utils/rss-proxy-security'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string
}

const RSS_PROXY_MAX_BYTES = 1024 * 1024
const RSS_PROXY_TIMEOUT_MS = 10000
const AUTH_SESSION_MAX_BYTES = 16 * 1024

async function assertPublicHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase()
  if (isBlockedRSSHostname(normalizedHostname)) {
    throw new Error('Private hostnames are not allowed')
  }

  if (isIP(normalizedHostname)) {
    if (isPrivateIpAddress(normalizedHostname)) {
      throw new Error('Private IP addresses are not allowed')
    }
    return
  }

  const addresses = await lookup(normalizedHostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error('Private DNS targets are not allowed')
  }
}

async function validateRSSProxyTargetUrl(targetUrl: string) {
  const parsedUrl = new URL(targetUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS feeds are allowed')
  }

  await assertPublicHostname(parsedUrl.hostname)
  return parsedUrl
}

function setSecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

function rssProxyPlugin() {
  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    setSecurityHeaders(res)
  }

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, string>) => {
    res.statusCode = statusCode
    setNoStoreHeaders(res)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  const handleRequest = async (requestUrlValue: string | null | undefined, res: ServerResponse) => {
    const requestUrl = requestUrlValue ? new URL(requestUrlValue, 'http://localhost') : null
    const targetUrl = requestUrl?.searchParams.get('url')?.trim()

    if (!targetUrl) {
      sendJson(res, 400, { error: 'Missing url query parameter' })
      return
    }

    try {
      const parsedUrl = await validateRSSProxyTargetUrl(targetUrl)
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), RSS_PROXY_TIMEOUT_MS)

      try {
        const upstreamResponse = await fetch(parsedUrl, {
          redirect: 'error',
          signal: abortController.signal,
          headers: {
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
            'User-Agent': 'Navet RSS Reader/1.0',
          },
        })

        if (!upstreamResponse.ok) {
          sendJson(res, 502, {
            error: `Upstream feed request failed with status ${upstreamResponse.status}`,
          })
          return
        }

        const contentType = upstreamResponse.headers.get('content-type')
        if (!isAllowedRSSContentType(contentType)) {
          sendJson(res, 502, { error: 'Upstream feed returned an unsupported content type' })
          return
        }

        const contentLength = Number(upstreamResponse.headers.get('content-length') ?? '0')
        if (contentLength > RSS_PROXY_MAX_BYTES) {
          sendJson(res, 502, { error: 'Upstream feed is too large' })
          return
        }

        const body = await upstreamResponse.text()
        if (new TextEncoder().encode(body).byteLength > RSS_PROXY_MAX_BYTES) {
          sendJson(res, 502, { error: 'Upstream feed is too large' })
          return
        }

        res.statusCode = 200
        setNoStoreHeaders(res)
        res.setHeader('Content-Type', contentType ?? 'application/xml; charset=utf-8')
        res.end(body)
      } finally {
        clearTimeout(timeoutId)
      }
    } catch {
      sendJson(res, 502, { error: 'Unable to load feed' })
    }
  }

  return {
    name: 'navet-rss-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        await handleRequest(req.url, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        await handleRequest(req.url, res)
      })
    },
  }
}

function homeAssistantProxyPlugin(
  hassUrl: string | undefined,
  getAuthSession: () => HomeAssistantAuthData | null
) {
  const normalizedHassUrl = (() => {
    if (!hassUrl) {
      return null
    }

    try {
      return new URL(hassUrl)
    } catch {
      return null
    }
  })()

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400
      res.end('Missing proxy path')
      return
    }

    try {
      let decodedUrl = ''
      try {
        decodedUrl = decodeURIComponent(req.url)
      } catch {
        res.statusCode = 400
        res.end('Invalid proxy path')
        return
      }

      if (req.url.includes('..') || decodedUrl.includes('..')) {
        res.statusCode = 400
        res.end('Invalid proxy path')
        return
      }

      const authSession = getAuthSession()
      const upstreamBaseUrl = authSession?.hassUrl ?? normalizedHassUrl?.toString() ?? null
      if (!upstreamBaseUrl) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Home Assistant proxy is not configured' }))
        return
      }

      const upstreamOrigin = new URL(upstreamBaseUrl)
      const targetUrl = new URL(req.url, upstreamOrigin)
      if (targetUrl.origin !== upstreamOrigin.origin) {
        res.statusCode = 400
        res.end('Invalid proxy target')
        return
      }

      const headers = new Headers()
      const accept = typeof req.headers.accept === 'string' ? req.headers.accept : null
      if (accept) {
        headers.set('Accept', accept)
      }

      if (authSession?.access_token) {
        headers.set('Authorization', `Bearer ${authSession.access_token}`)
      }

      const upstreamResponse = await fetch(targetUrl, {
        redirect: 'manual',
        headers,
      })

      res.statusCode = upstreamResponse.status
      setSecurityHeaders(res)

      const contentType = upstreamResponse.headers.get('content-type')
      if (contentType) {
        res.setHeader('Content-Type', contentType)
      }

      const cacheControl = upstreamResponse.headers.get('cache-control')
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl)
      }

      const contentLength = upstreamResponse.headers.get('content-length')
      if (contentLength) {
        res.setHeader('Content-Length', contentLength)
      }

      if (!upstreamResponse.body) {
        res.end()
        return
      }

      Readable.fromWeb(upstreamResponse.body as globalThis.ReadableStream<Uint8Array>).pipe(res)
    } catch {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Unable to load Home Assistant resource' }))
    }
  }

  return {
    name: 'navet-ha-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res)
      })
    },
  }
}

function authSessionStorePlugin() {
  const authSessionStore = createViteAuthSessionStore()

  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store')
  }

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
    res.statusCode = statusCode
    setNoStoreHeaders(res)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  const sendNoContent = (res: ServerResponse) => {
    res.statusCode = 204
    setNoStoreHeaders(res)
    res.end()
  }

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.byteLength
      if (size > AUTH_SESSION_MAX_BYTES) {
        throw new Error('Auth session is too large')
      }
      chunks.push(buffer)
    }

    return Buffer.concat(chunks).toString('utf8')
  }

  const handleRequest = async (
    req: IncomingMessage,
    res: ServerResponse
  ) => {
    if (req.method === 'GET') {
      const authSession = authSessionStore.getSerializedSession()
      if (!authSession) {
        sendNoContent(res)
        return
      }

      res.statusCode = 200
      setNoStoreHeaders(res)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(authSession)
      return
    }

    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req)
        const parsed = JSON.parse(body)
        if (!isValidAuthData(parsed)) {
          sendJson(res, 400, { error: 'Unsupported auth session' })
          return
        }

        authSessionStore.saveAuthSession(parsed)
        sendJson(res, 200, { ok: true })
      } catch {
        sendJson(res, 400, { error: 'Unable to save auth session' })
      }
      return
    }

    if (req.method === 'DELETE') {
      authSessionStore.clearAuthSession()
      sendJson(res, 200, { ok: true })
      return
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    sendJson(res, 405, { error: 'Method not allowed' })
  }

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_auth__/session', async (req, res) => {
      await handleRequest(req, res)
    })
  }

  return {
    name: 'navet-auth-session-store',
    api: {
      getAuthSession(): HomeAssistantAuthData | null {
        return authSessionStore.getAuthSession()
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hassUrl = env.NAVET_HASS_URL?.trim().replace(/\/$/, '')
  const lifecycleEvent = process.env.npm_lifecycle_event ?? ''
  const commandLine = process.argv.join(' ')
  const isStorybook =
    env.STORYBOOK === '1' ||
    process.env.STORYBOOK === '1' ||
    lifecycleEvent.includes('storybook') ||
    commandLine.includes('storybook') ||
    commandLine.includes('chromatic')

  const authSessionPlugin = authSessionStorePlugin()
  const plugins: PluginOption[] = [
    react(),
    tailwindcss(),
    rssProxyPlugin(),
    authSessionPlugin,
    homeAssistantProxyPlugin(
      hassUrl,
      () =>
        (
          authSessionPlugin as PluginOption & {
            api?: { getAuthSession?: () => HomeAssistantAuthData | null }
          }
        ).api?.getAuthSession?.() ?? null
    ),
  ]

  if (!isStorybook) {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifestFilename: 'site.webmanifest',
        includeAssets: [
          'favicon.svg',
          'favicon-32x32.svg',
          'apple-touch-icon.png',
          'logo.svg',
          'logo-horizontal.svg',
          'logo-horizontal-light.svg',
          'pwa-192.png',
          'pwa-512.png',
        ],
        manifest: {
          name: 'Navet',
          short_name: 'Navet',
          description: 'A smart home dashboard built for calm, app-like control surfaces.',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#0a0a0a',
          theme_color: '#0a0a0a',
          categories: ['productivity', 'utilities', 'lifestyle'],
          icons: [
            {
              src: './pwa-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: './pwa-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: './favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          navigateFallback: './index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          globIgnores: ['config.js'],
        },
      })
    )
  }

  return {
    base: './',
    cacheDir: '.cache/vite',
    envPrefix: ['VITE_'],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    },
    plugins,
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
        ...(isStorybook
          ? {
            'virtual:pwa-register': path.resolve(
              __dirname,
              './src/test/mocks/virtual-pwa-register.ts'
            ),
          }
          : {}),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg'],

    build: {
      modulePreload: {
        resolveDependencies(_filename, deps, context) {
          if (context.hostType !== 'html') {
            return deps
          }

          return deps.filter((dependency) => !isLazyHtmlPreload(dependency))
        },
      },
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const appChunkName = getAppChunkName(id)
            if (appChunkName) {
              return appChunkName
            }

            return getVendorChunkName(id)
          },
        },
      },
    },
    server: {
      host: 'navet.local',
      port: 5200,
      strictPort: true,
      proxy: hassUrl
        ? {
          '/api': {
            target: hassUrl,
            changeOrigin: true,
            secure: false,
          },
        }
        : undefined,
    },
  }
})
