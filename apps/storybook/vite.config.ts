import path from 'node:path';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@assets': path.resolve(repoRoot, 'assets'),
      '@docs': path.resolve(repoRoot, 'docs'),
      '@website': path.resolve(repoRoot, 'apps/website/src'),
      '@navet/core': path.resolve(repoRoot, 'packages/core/src'),
      '@navet/ui': path.resolve(repoRoot, 'packages/ui/src'),
      '@navet/app': path.resolve(repoRoot, 'packages/app/src'),
      '@navet/provider-homeassistant': path.resolve(repoRoot, 'packages/provider-homeassistant/src'),
      '@navet/provider-homey': path.resolve(repoRoot, 'packages/provider-homey/src'),
      '@navet/provider-hubitat': path.resolve(repoRoot, 'packages/provider-hubitat/src'),
      '@navet/provider-openhab': path.resolve(repoRoot, 'packages/provider-openhab/src'),
      '@navet/provider-smartthings': path.resolve(repoRoot, 'packages/provider-smartthings/src'),
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
