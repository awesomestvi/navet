import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { getAppChunkName, getVendorChunkName } from '../../scripts/vite-chunking';

const repoRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(
  readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8')
) as {
  version?: string;
};
function resolveFallbackGitSha() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'local';
  }
}

function resolveFallbackBuildDate() {
  const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH?.trim();

  if (sourceDateEpoch) {
    const epochMs = Number.parseInt(sourceDateEpoch, 10) * 1000;
    if (Number.isFinite(epochMs)) {
      return new Date(epochMs).toISOString();
    }
  }

  try {
    return execSync('git log -1 --format=%cI', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return new Date(0).toISOString();
  }
}

const buildMetadata = {
  gitSha: (process.env.NAVET_GIT_SHA ?? resolveFallbackGitSha()).trim(),
  buildDate: (process.env.NAVET_BUILD_DATE ?? resolveFallbackBuildDate()).trim(),
  releaseChannel: (process.env.NAVET_RELEASE_CHANNEL ?? 'development').trim(),
  buildVersion: (process.env.NAVET_BUILD_VERSION ?? packageJson.version ?? '0.0.0').trim(),
};
const REACT_COMPILER_INCLUDE = [/[\\/]src[\\/]/, /[\\/]packages[\\/][^\\/]+[\\/]src[\\/]/];
const REACT_COMPILER_EXCLUDE = [/[\\/]node_modules[\\/]/, /[\\/]\.cache[\\/]vite[^\\/]*[\\/]deps[\\/]/];

export default defineConfig({
  root: __dirname,
  base: '/api/navet/static/',
  cacheDir: path.resolve(repoRoot, '.cache/vite-panel'),
  envPrefix: ['VITE_'],
  publicDir: false,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    __APP_GIT_SHA__: JSON.stringify(buildMetadata.gitSha),
    __APP_BUILD_DATE__: JSON.stringify(buildMetadata.buildDate),
    __APP_RELEASE_CHANNEL__: JSON.stringify(buildMetadata.releaseChannel),
    __APP_BUILD_VERSION__: JSON.stringify(buildMetadata.buildVersion),
  },
  plugins: [
    react(),
    babel({
      include: REACT_COMPILER_INCLUDE,
      exclude: REACT_COMPILER_EXCLUDE,
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@navet/core': path.resolve(repoRoot, 'packages/core/src'),
      '@navet/ui': path.resolve(repoRoot, 'packages/ui/src'),
      '@navet/app': path.resolve(repoRoot, 'packages/app/src'),
      '@navet/provider-homeassistant': path.resolve(
        repoRoot,
        'packages/provider-homeassistant/src'
      ),
      '@navet/provider-homey': path.resolve(repoRoot, 'packages/provider-homey/src'),
      '@navet/provider-hubitat': path.resolve(repoRoot, 'packages/provider-hubitat/src'),
      '@navet/provider-openhab': path.resolve(repoRoot, 'packages/provider-openhab/src'),
      '@navet/provider-smartthings': path.resolve(
        repoRoot,
        'packages/provider-smartthings/src'
      ),
      'virtual:pwa-register': path.resolve(
        repoRoot,
        'packages/app/src/test/mocks/virtual-pwa-register.ts'
      ),
    },
  },
  assetsInclude: ['**/*.svg'],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        panel: path.resolve(repoRoot, 'packages/app/src/panel/main.tsx'),
        haShell: path.resolve(repoRoot, 'packages/app/src/panel/ha-shell.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'haShell' ? 'navet-ha-shell.js' : 'navet-panel.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          return getAppChunkName(id) ?? getVendorChunkName(id);
        },
      },
    },
  },
});
