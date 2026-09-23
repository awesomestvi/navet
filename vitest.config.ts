import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = import.meta.dirname;
const storybookConfigDir = path.join(dirname, 'apps/storybook/.storybook');

export default defineConfig({
  test: {
    projects: [
      './vitest.unit.config.ts',
      {
        extends: './vitest.shared.config.ts',
        plugins: [
          storybookTest({
            configDir: storybookConfigDir,
            storybookScript: 'pnpm storybook',
          }),
        ],
        test: {
          name: `storybook:${storybookConfigDir}`,
          dir: dirname,
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
