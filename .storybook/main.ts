import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: './vite.config.ts',
      },
    },
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    const filteredPlugins = (config.plugins ?? []).filter((plugin) => {
      const pluginName = typeof plugin === 'object' && plugin && 'name' in plugin ? plugin.name : '';

      return (
        !pluginName.startsWith('vite-plugin-pwa') &&
        pluginName !== 'navet-rss-proxy' &&
        pluginName !== 'navet-ha-preview-proxy'
      );
    });

    return {
      ...config,
      plugins: [...filteredPlugins, tailwindcss()],
      resolve: {
        ...(config.resolve ?? {}),
        alias: {
          ...(typeof config.resolve === 'object' && config.resolve?.alias
            ? config.resolve.alias
            : {}),
          '@': path.resolve(storybookDir, '../src'),
        },
      },
    };
  },
};

export default config;
