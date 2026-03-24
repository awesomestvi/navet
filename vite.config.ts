import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function getPackageName(id: string) {
  const parts = id.split('node_modules/')
  const packagePath = parts.at(-1)
  if (!packagePath) {
    return null
  }

  const segments = packagePath.split('/')

  if (segments[0]?.startsWith('@') && segments[1]) {
    return `${segments[0]}/${segments[1]}`
  }

  return segments[0] ?? null
}

function rssProxyPlugin() {
  return {
    name: 'navet-rss-proxy',
    configureServer(server) {
      server.middlewares.use('/__navet_rss_proxy__', async (req, res) => {
        const requestUrl = req.url ? new URL(req.url, 'http://localhost') : null
        const targetUrl = requestUrl?.searchParams.get('url')?.trim()

        if (!targetUrl) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing url query parameter' }))
          return
        }

        try {
          const parsedUrl = new URL(targetUrl)

          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('Invalid protocol')
          }

          const upstreamResponse = await fetch(parsedUrl, {
            headers: {
              Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
              'User-Agent': 'Navet RSS Reader/1.0',
            },
          })

          if (!upstreamResponse.ok) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: `Upstream feed request failed with status ${upstreamResponse.status}`,
              })
            )
            return
          }

          const contentType =
            upstreamResponse.headers.get('content-type') ?? 'application/xml; charset=utf-8'
          const body = await upstreamResponse.text()

          res.statusCode = 200
          res.setHeader('Content-Type', contentType)
          res.end(body)
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unable to load feed' }))
        }
      })
    },
  }
}

function homeAssistantPreviewProxyPlugin(hassUrl?: string, hassToken?: string) {
  return {
    name: 'navet-ha-preview-proxy',
    configurePreviewServer(server) {
      if (!hassUrl) {
        return
      }

      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        if (!req.url) {
          res.statusCode = 400
          res.end('Missing proxy path')
          return
        }

        try {
          const targetUrl = new URL(req.url, `${hassUrl}/`)
          const upstreamResponse = await fetch(targetUrl, {
            headers: hassToken
              ? {
                  Authorization: `Bearer ${hassToken}`,
                }
              : undefined,
          })

          res.statusCode = upstreamResponse.status

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hassUrl = env.NAVET_HASS_URL?.trim().replace(/\/$/, '')
  const hassToken = env.NAVET_HASS_TOKEN?.trim()

  return {
  base: './',
  envPrefix: ['VITE_', 'NAVET_'],
  plugins: [
    react(),
    tailwindcss(),
    rssProxyPlugin(),
    homeAssistantPreviewProxyPlugin(hassUrl, hassToken),
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
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        categories: ['productivity', 'utilities', 'lifestyle'],
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg'],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          const packageName = getPackageName(id)
          if (!packageName) {
            return undefined
          }

          if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') {
            return 'react-vendor'
          }

          if (packageName.startsWith('@radix-ui/')) {
            return 'radix-vendor'
          }

          if (
            packageName === '@dnd-kit/core' ||
            packageName === '@dnd-kit/sortable' ||
            packageName === '@dnd-kit/utilities'
          ) {
            return 'dnd-vendor'
          }

          if (packageName === 'home-assistant-js-websocket') {
            return 'ha-vendor'
          }

          if (packageName === 'lucide-react') {
            return 'icons-vendor'
          }

          return 'vendor'
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
            headers: hassToken
              ? {
                  Authorization: `Bearer ${hassToken}`,
                }
              : undefined,
          },
          '/__navet_ha_proxy__': {
            target: hassUrl,
            changeOrigin: true,
            secure: false,
            headers: hassToken
              ? {
                  Authorization: `Bearer ${hassToken}`,
                }
              : undefined,
            rewrite: (path) => path.replace(/^\/__navet_ha_proxy__/, ''),
          },
        }
      : undefined,
  },
}
})
