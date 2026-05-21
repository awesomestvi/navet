import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { lookup } from 'node:dns/promises'
import { readFileSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import path from 'path'
import {
  defineConfig,
  loadEnv,
  type PluginOption,
  type PreviewServer,
  type ProxyOptions,
  type ViteDevServer,
} from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
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

function homeAssistantPreviewProxyPlugin(hassUrl?: string, hassToken?: string) {
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

  return {
    name: 'navet-ha-preview-proxy',
    configurePreviewServer(server: PreviewServer) {
      if (!normalizedHassUrl) {
        return
      }

      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
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

          const targetUrl = new URL(req.url, normalizedHassUrl)
          if (targetUrl.origin !== normalizedHassUrl.origin) {
            res.statusCode = 400
            res.end('Invalid proxy target')
            return
          }

          const upstreamResponse = await fetch(targetUrl, {
            redirect: 'manual',
            headers: hassToken
              ? {
                Authorization: `Bearer ${hassToken}`,
              }
              : undefined,
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

          const body = Buffer.from(await upstreamResponse.arrayBuffer())
          res.end(body)
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unable to load Home Assistant resource' }))
        }
      })
    },
  }
}

function configureHomeAssistantDevProxyAuth(hassToken?: string) {
  const configure: ProxyOptions['configure'] = (proxy) => {
    proxy.on('proxyReq', (proxyReq, req) => {
      const requestAuthorization = Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization
      const authorization = requestAuthorization ?? (hassToken ? `Bearer ${hassToken}` : undefined)

      if (authorization) {
        proxyReq.setHeader('Authorization', authorization)
      }
    })
  }

  return configure
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hassUrl = env.NAVET_HASS_URL?.trim().replace(/\/$/, '')
  const hassToken = env.NAVET_HASS_TOKEN?.trim()
  const lifecycleEvent = process.env.npm_lifecycle_event ?? ''
  const commandLine = process.argv.join(' ')
  const isStorybook =
    env.STORYBOOK === '1' ||
    process.env.STORYBOOK === '1' ||
    lifecycleEvent.includes('storybook') ||
    commandLine.includes('storybook') ||
    commandLine.includes('chromatic')

  const plugins: PluginOption[] = [
    react(),
    tailwindcss(),
    rssProxyPlugin(),
    homeAssistantPreviewProxyPlugin(hassUrl, hassToken),
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
            configure: configureHomeAssistantDevProxyAuth(hassToken),
          },
          '/__navet_ha_proxy__': {
            target: hassUrl,
            changeOrigin: true,
            secure: false,
            configure: configureHomeAssistantDevProxyAuth(hassToken),
            rewrite: (path) => path.replace(/^\/__navet_ha_proxy__/, ''),
          },
        }
        : undefined,
    },
  }
})
