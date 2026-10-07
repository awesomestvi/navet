import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
      plugins: [...filteredPlugins, tailwindcss(), {
        name: 'navet-composition-registry',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const match = /^\/r\/([a-z][a-z0-9-]*)\.json$/.exec((request.url ?? '').split('?')[0]);
            if (!match) return next();
            if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.statusCode = 405; response.end(); return; }
            const errorFile = path.join(repoRoot, '.cache/ui-registry/error.json');
            if (existsSync(errorFile)) { response.statusCode = 503; response.setHeader('Content-Type', 'application/json'); response.end(readFileSync(errorFile)); return; }
            const file = path.join(repoRoot, '.cache/ui-registry/r', `${match[1]}.json`);
            if (!existsSync(file)) { response.statusCode = 404; response.end('Run pnpm registry:dev'); return; }
            response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
            response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
          });
        },
      }],
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
