import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { getAppChunkName, getVendorChunkName } from './scripts/vite-chunking';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string;
};
const buildMetadata = {
  gitSha: (process.env.NAVET_GIT_SHA ?? process.env.GITHUB_SHA ?? 'local').trim(),
  buildDate: (process.env.NAVET_BUILD_DATE ?? new Date().toISOString()).trim(),
  releaseChannel: (process.env.NAVET_RELEASE_CHANNEL ?? 'development').trim(),
};
const REACT_COMPILER_INCLUDE = [/[\\/]src[\\/]/, /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/];
const REACT_COMPILER_EXCLUDE = [/[\\/]node_modules[\\/]/, /[\\/]\.cache[\\/]vite[^\\/]*[\\/]deps[\\/]/];

export default defineConfig({
  base: '/api/navet/static/',
  cacheDir: '.cache/vite-panel',
  envPrefix: ['VITE_'],
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify(buildMetadata.gitSha),
    __APP_BUILD_DATE__: JSON.stringify(buildMetadata.buildDate),
    __APP_RELEASE_CHANNEL__: JSON.stringify(buildMetadata.releaseChannel),
  },
  plugins: [
    react(),
    babel({
      include: REACT_COMPILER_INCLUDE,
      exclude: REACT_COMPILER_EXCLUDE,
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@navet/core': path.resolve(__dirname, './packages/core/src'),
      '@navet/ui': path.resolve(__dirname, './packages/ui/src'),
      '@navet/app': path.resolve(__dirname, './packages/app/src'),
      '@navet/provider-homeassistant': path.resolve(
        __dirname,
        './packages/provider-homeassistant/src'
      ),
      '@navet/provider-homey': path.resolve(__dirname, './packages/provider-homey/src'),
      '@navet/provider-hubitat': path.resolve(__dirname, './packages/provider-hubitat/src'),
      '@navet/provider-openhab': path.resolve(__dirname, './packages/provider-openhab/src'),
      '@navet/provider-smartthings': path.resolve(
        __dirname,
        './packages/provider-smartthings/src'
      ),
      'virtual:pwa-register': path.resolve(
        __dirname,
        './packages/app/src/test/mocks/virtual-pwa-register.ts'
      ),
    },
  },
  assetsInclude: ['**/*.svg'],
  build: {
    outDir: 'custom_components/navet/frontend',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'packages/app/src/panel/main.tsx'),
      output: {
        entryFileNames: 'navet-panel.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          return getAppChunkName(id) ?? getVendorChunkName(id);
        },
      },
    },
  },
});
