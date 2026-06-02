import path from 'path';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string;
};

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify('test-sha'),
    __APP_BUILD_DATE__: JSON.stringify('2026-01-01T00:00:00.000Z'),
    __APP_RELEASE_CHANNEL__: JSON.stringify('development'),
  },
  test: {
    name: 'unit',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./packages/app/src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/app/src/**/*.{ts,tsx}'],
      exclude: [
        'packages/app/src/**/*.d.ts',
        'packages/app/src/**/index.ts',
        '**/*.json',
        '**/package.json',
      ],
    },
  },
  resolve: {
    alias: {
      '@docs': path.resolve(__dirname, './docs'),
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
      '@docker': path.resolve(__dirname, './docker'),
      '@scripts': path.resolve(__dirname, './scripts'),
      'virtual:pwa-register': path.resolve(
        __dirname,
        './packages/app/src/test/mocks/virtual-pwa-register.ts'
      ),
    },
  },
});
