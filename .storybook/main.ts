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
  managerHead: async (head) => `
    ${head}
    <style>
      :root {
        --navet-storybook-accent: #f97316;
        --navet-storybook-accent-soft: rgba(249, 115, 22, 0.22);
        --navet-storybook-accent-glow: rgba(249, 115, 22, 0.3);
        --navet-storybook-border: rgba(255, 255, 255, 0.08);
        --navet-storybook-panel: rgba(9, 9, 11, 0.72);
        --navet-storybook-panel-strong: rgba(9, 9, 11, 0.9);
        --navet-storybook-text: #f4f4f5;
        --navet-storybook-muted: #a1a1aa;
      }

      body {
        background:
          radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 24%),
          radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.08), transparent 20%),
          linear-gradient(180deg, #050816 0%, #09090b 100%);
      }

      #storybook-explorer-tree,
      .sidebar-container,
      .sidebar-subheading,
      .search-field input,
      .docblock-argstable,
      .docblock-code-toggle,
      .docblock-source {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      .sidebar-container,
      .css-1wpdhyu,
      .css-1m6d9k5,
      .top-bar,
      [data-testid="storybook-main-menu"] {
        backdrop-filter: blur(20px);
      }

      .sidebar-container {
        background: linear-gradient(180deg, var(--navet-storybook-panel) 0%, var(--navet-storybook-panel-strong) 100%) !important;
        border-right: 1px solid var(--navet-storybook-border);
      }

      .search-field input {
        background: transparent !important;
        border-radius: 9999px !important;
        color: var(--navet-storybook-text) !important;
        box-shadow: none !important;
      }

      .search-field,
      .search-field:focus-within {
        background: rgba(255, 255, 255, 0.04) !important;
        border-radius: 9999px !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.04),
          0 0 0 1px rgba(255, 255, 255, 0.04) !important;
      }

      .search-field input::placeholder {
        color: var(--navet-storybook-muted) !important;
      }

      .search-field svg,
      .search-field path {
        color: var(--navet-storybook-muted) !important;
        fill: var(--navet-storybook-muted) !important;
      }

      .sidebar-item[data-selected="true"],
      .sidebar-item:hover {
        background: linear-gradient(135deg, var(--navet-storybook-accent-soft) 0%, rgba(255, 255, 255, 0.04) 100%) !important;
        border-radius: 20px;
      }

      #storybook-explorer-tree [role="treeitem"],
      #storybook-explorer-tree a,
      #storybook-explorer-tree button {
        color: var(--navet-storybook-text) !important;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          box-shadow 160ms ease,
          color 160ms ease;
      }

      #storybook-explorer-tree [role="treeitem"] {
        margin: 2px 6px !important;
        border: 1px solid transparent;
      }

      #storybook-explorer-tree [role="treeitem"]:hover,
      #storybook-explorer-tree a:hover,
      #storybook-explorer-tree button:hover {
        background: linear-gradient(135deg, rgba(249, 115, 22, 0.18) 0%, rgba(255, 255, 255, 0.04) 100%) !important;
        border-color: rgba(249, 115, 22, 0.12) !important;
      }

      #storybook-explorer-tree [aria-current="page"],
      #storybook-explorer-tree [data-selected="true"],
      #storybook-explorer-tree [aria-selected="true"] {
        background: linear-gradient(135deg, rgba(249, 115, 22, 0.26) 0%, rgba(255, 255, 255, 0.05) 100%) !important;
        border-color: rgba(249, 115, 22, 0.22) !important;
        box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.12), 0 10px 30px -18px var(--navet-storybook-accent-glow);
        border-radius: 20px;
      }

      #storybook-explorer-tree [aria-current="page"]:hover,
      #storybook-explorer-tree [data-selected="true"]:hover,
      #storybook-explorer-tree [aria-selected="true"]:hover {
        background: linear-gradient(135deg, rgba(249, 115, 22, 0.26) 0%, rgba(255, 255, 255, 0.05) 100%) !important;
        border-color: rgba(249, 115, 22, 0.22) !important;
        box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.12), 0 10px 30px -18px var(--navet-storybook-accent-glow) !important;
        border-radius: 20px;
      }

      #storybook-explorer-tree [role="group"] {
        gap: 2px;
      }

      .sidebar-subheading,
      #storybook-explorer-tree [role="heading"] {
        color: var(--navet-storybook-muted) !important;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 10px !important;
        font-weight: 700 !important;
      }

      .top-bar,
      .os-host,
      .css-1wpdhyu {
        background: rgba(9, 9, 11, 0.78) !important;
        border-bottom: 1px solid var(--navet-storybook-border);
      }

      .top-bar {
        box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.04);
      }

      button[title*="Theme"],
      button[title*="Accent"] {
        border-radius: 9999px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        background: rgba(255, 255, 255, 0.04) !important;
      }
    </style>
  `,
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
