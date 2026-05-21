import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { getAppChunkName, getVendorChunkName } from './scripts/vite-chunking';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string;
};

export default defineConfig({
  base: '/api/navet/static/',
  cacheDir: '.cache/vite-panel',
  envPrefix: ['VITE_'],
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'virtual:pwa-register': path.resolve(
        __dirname,
        './src/test/mocks/virtual-pwa-register.ts'
      ),
    },
  },
  assetsInclude: ['**/*.svg'],
  build: {
    outDir: 'custom_components/navet/frontend',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/panel/main.tsx'),
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
