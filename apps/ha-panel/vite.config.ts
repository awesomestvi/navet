import {
  createNavetPackageAliases,
  createBuildMetadata,
  REACT_COMPILER_EXCLUDE,
} from '../../scripts/vite-host-conventions.ts';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { getAppChunkName, getVendorChunkName } from '../../scripts/vite-chunking';

const repoRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8')) as {
  version?: string;
};
const buildMetadata = createBuildMetadata(repoRoot, packageJson.version, 'git');
const REACT_COMPILER_INCLUDE = [/[\\/]src[\\/]/, /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/];

export default defineConfig({
  root: __dirname,
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  base: '/api/navet/static/',
  cacheDir: path.resolve(repoRoot, '.cache/vite-panel'),
  envPrefix: ['VITE_'],
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify(buildMetadata.gitSha),
    __APP_BUILD_DATE__: JSON.stringify(buildMetadata.buildDate),
    __APP_RELEASE_CHANNEL__: JSON.stringify(buildMetadata.releaseChannel),
    __APP_BUILD_VERSION__: JSON.stringify(buildMetadata.buildVersion),
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
      ...createNavetPackageAliases(repoRoot),
      'virtual:pwa-register': path.resolve(
        repoRoot,
        'packages/app/src/test/mocks/virtual-pwa-register.ts'
      ),
    },
  },
  assetsInclude: ['**/*.svg'],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        panel: path.resolve(repoRoot, 'packages/app/src/panel/main.tsx'),
        haShell: path.resolve(repoRoot, 'packages/app/src/panel/ha-shell.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'haShell' ? 'navet-ha-shell.js' : 'navet-panel.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          return getAppChunkName(id) ?? getVendorChunkName(id);
        },
      },
    },
  },
});
