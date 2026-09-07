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

const repoRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8')) as {
  version?: string;
};
const buildMetadata = createBuildMetadata(repoRoot, packageJson.version, 'environment');
const REACT_COMPILER_INCLUDE = [/[\\/]src[\\/]/, /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/];

export default defineConfig({
  root: __dirname,
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  publicDir: path.resolve(repoRoot, 'assets/public'),
  cacheDir: path.resolve(repoRoot, '.cache/vite-demo'),
  // The public demo is deployed at the root of demo.navet.app.
  base: '/',
  envPrefix: ['VITE_'],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify(buildMetadata.gitSha),
    __APP_BUILD_DATE__: JSON.stringify(buildMetadata.buildDate),
    __APP_RELEASE_CHANNEL__: JSON.stringify(buildMetadata.releaseChannel),
    __APP_BUILD_VERSION__: JSON.stringify(buildMetadata.buildVersion),
    __NAVET_ENABLE_DEMO__: JSON.stringify(true),
  },
  resolve: {
    alias: {
      ...createNavetPackageAliases(repoRoot),
      '@assets': path.resolve(repoRoot, 'assets'),
      '@docs': path.resolve(repoRoot, 'docs'),
      '@website': path.resolve(repoRoot, 'apps/website/src'),
      '@docker': path.resolve(repoRoot, 'docker'),
      '@scripts': path.resolve(repoRoot, 'scripts'),
      'virtual:pwa-register': path.resolve(
        repoRoot,
        'packages/app/src/test/mocks/virtual-pwa-register.ts'
      ),
    },
  },
  assetsInclude: ['**/*.svg'],
  plugins: [
    react(),
    babel({
      include: REACT_COMPILER_INCLUDE,
      exclude: REACT_COMPILER_EXCLUDE,
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
  },
});
