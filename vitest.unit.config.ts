import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from './vitest.shared.config.ts';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'unit',
      environment: 'jsdom',
      include: [
        'packages/**/*.{test,spec}.{ts,tsx}',
        'apps/**/*.{test,spec}.{ts,tsx}',
        'assets/**/*.{test,spec}.{ts,tsx}',
        'scripts/**/*.{test,spec}.{js,mjs,ts}',
      ],
    },
  })
);
