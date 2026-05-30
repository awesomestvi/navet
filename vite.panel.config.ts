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
const REACT_COMPILER_INCLUDE = [/[\\/]src[\\/]/, /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/];
const REACT_COMPILER_EXCLUDE = [/[\\/]node_modules[\\/]/, /[\\/]\.cache[\\/]vite[^\\/]*[\\/]deps[\\/]/];

export default defineConfig({
  base: '/api/navet/static/',
  cacheDir: '.cache/vite-panel',
  envPrefix: ['VITE_'],
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
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
