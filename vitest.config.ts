import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const storybookConfigDir = path.join(dirname, '.storybook');

export default defineConfig({
  test: {
    projects: [
      './vitest.unit.config.ts',
      {
        extends: './vitest.unit.config.ts',
        plugins: [
          storybookTest({
            configDir: storybookConfigDir,
            storybookScript: 'pnpm storybook',
          }),
        ],
        test: {
          name: `storybook:${storybookConfigDir}`,
          coverage: {
            exclude: ['**/*.json', '**/package.json'],
          },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
