import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(storybookDir, '..', '..', '..');
const storybookBasePath = process.env.STORYBOOK_BASE_PATH?.trim() || '/';

const config: StorybookConfig = {
  stories: ['../../../packages/**/*.stories.{ts,tsx}'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: './vite.config.ts',
      },
    },
  },
  features: {
    sidebarOnboardingChecklist: false,
  },
  staticDirs: [path.join(repoRoot, 'assets/public')],
  viteFinal: async (config) => {
    const filteredPlugins = (config.plugins ?? []).filter((plugin) => {
      const pluginName = typeof plugin === 'object' && plugin && 'name' in plugin ? plugin.name : '';

      return (
        !pluginName.startsWith('vite-plugin-pwa') &&
        pluginName !== 'navet-ha-preview-proxy'
      );
    });

    return {
      ...config,
      base: storybookBasePath,
      plugins: [...filteredPlugins, tailwindcss()],
      resolve: {
        ...(config.resolve ?? {}),
        alias: {
          ...(typeof config.resolve === 'object' && config.resolve?.alias
            ? config.resolve.alias
            : {}),
          '@assets': path.resolve(repoRoot, 'assets'),
          '@docs': path.resolve(repoRoot, 'docs'),
        },
      },
    };
  },
};

export default config;
