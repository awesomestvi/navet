import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(
  readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8')
) as { version?: string };
const buildMetadata = {
  gitSha: (process.env.NAVET_GIT_SHA ?? process.env.GITHUB_SHA ?? 'local').trim(),
  buildDate: (process.env.NAVET_BUILD_DATE ?? new Date().toISOString()).trim(),
  releaseChannel: (process.env.NAVET_RELEASE_CHANNEL ?? 'development').trim(),
};
const REACT_COMPILER_INCLUDE = [
  /[\\/]src[\\/]/,
  /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/,
  /[\\/]apps[\\/]website[\\/]src[\\/]/,
];
const REACT_COMPILER_EXCLUDE = [/[\\/]node_modules[\\/]/, /[\\/]\.cache[\\/]vite[^\\/]*[\\/]deps[\\/]/];

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(repoRoot, 'assets/public'),
  cacheDir: path.resolve(repoRoot, '.cache/vite-website'),
  // The marketing site is deployed from the domain root, and we clone index.html
  // into nested route entrypoints like /install/. Root-relative assets keep those
  // entrypoints loading the shared /assets bundle instead of resolving /install/assets.
  base: '/',
  envPrefix: ['VITE_'],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify(buildMetadata.gitSha),
    __APP_BUILD_DATE__: JSON.stringify(buildMetadata.buildDate),
    __APP_RELEASE_CHANNEL__: JSON.stringify(buildMetadata.releaseChannel),
    __NAVET_ENABLE_DEMO__: JSON.stringify(false),
  },
  resolve: {
    alias: {
      '@assets': path.resolve(repoRoot, 'assets'),
      '@': path.resolve(repoRoot, 'src'),
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
    },
  },
  assetsInclude: ['**/*.svg'],
  plugins: [
    react(),
    babel({
      include: REACT_COMPILER_INCLUDE,
      exclude: REACT_COMPILER_EXCLUDE,
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
  },
});
