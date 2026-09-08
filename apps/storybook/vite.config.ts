import { createNavetPackageAliases } from '../../scripts/vite-host-conventions.ts';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8')) as {
  version?: string;
};

export default defineConfig({
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify('storybook'),
    __APP_BUILD_DATE__: JSON.stringify(new Date(0).toISOString()),
    __APP_RELEASE_CHANNEL__: JSON.stringify('development'),
    __APP_BUILD_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
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
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
