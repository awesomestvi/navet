import {
  collectViteAppShellBundleFiles,
  deferVitePwaGenerationUntilWriteBundle,
  isNavetRuntimeAssetRequest,
  NAVET_PWA_APP_SHELL_MAX_BYTES,
  NAVET_PWA_APP_SHELL_MAX_ENTRIES,
  selectViteAppShellManifestEntries,
  type ViteOutputBundle,
} from '@scripts/vite-pwa-cache';
import { NAVET_INTERNAL_NAVIGATION_PATH_PATTERN } from '@scripts/vite-pwa-routing';
import type { Plugin } from 'vite';
import { describe, expect, it, vi } from 'vitest';

describe('Vite PWA navigation routing', () => {
  it.each([
    '/__navet_auth__/session',
    '/__navet_profile__/profile',
    '/__navet_homey__/authorize',
    '/__navet_openhab__/session',
    '/__navet_ha_proxy__/api/states',
    '/__navet_homey_proxy__/api/manager/devices/device',
    '/__navet_openhab_proxy__/rest/items',
    '/__navet_spotify_metadata__/track',
    '/wall-panel/__navet_auth__/callback',
    '/navet/subpath/__navet_openhab_proxy__/rest/items',
  ])('excludes internal navigation %s at any deployment base', (pathname) => {
    expect(NAVET_INTERNAL_NAVIGATION_PATH_PATTERN.test(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/wall-panel/',
    '/dashboard',
    '/navet/settings/providers',
    '/rooms/__navet_auth__-in-name',
  ])('keeps product navigation %s eligible for the app shell', (pathname) => {
    expect(NAVET_INTERNAL_NAVIGATION_PATH_PATTERN.test(pathname)).toBe(false);
  });
});

describe('Vite PWA cache policy', () => {
  it('collects recursive static imports but not lazy chunks', () => {
    const bundle = {
      'assets/index-entry.js': {
        type: 'chunk',
        fileName: 'assets/index-entry.js',
        imports: ['./react-vendor.js'],
        dynamicImports: ['assets/authenticated-app.js'],
        isEntry: true,
        referencedFiles: ['assets/homey.svg'],
        viteMetadata: {
          importedCss: new Set(['assets/index.css']),
        },
      },
      'assets/react-vendor.js': {
        type: 'chunk',
        fileName: 'assets/react-vendor.js',
        imports: ['assets/runtime.js'],
        dynamicImports: [],
        isEntry: false,
        referencedFiles: [],
      },
      'assets/runtime.js': {
        type: 'chunk',
        fileName: 'assets/runtime.js',
        imports: [],
        dynamicImports: [],
        isEntry: false,
        referencedFiles: [],
      },
      'assets/authenticated-app.js': {
        type: 'chunk',
        fileName: 'assets/authenticated-app.js',
        imports: [],
        dynamicImports: [],
        isEntry: false,
        referencedFiles: [],
      },
      'assets/index.css': {
        type: 'asset',
        fileName: 'assets/index.css',
      },
      'assets/homey.svg': {
        type: 'asset',
        fileName: 'assets/homey.svg',
      },
    } as unknown as ViteOutputBundle;

    expect([...collectViteAppShellBundleFiles(bundle)]).toEqual([
      'assets/index-entry.js',
      'assets/index.css',
      'assets/homey.svg',
      'assets/react-vendor.js',
      'assets/runtime.js',
    ]);
  });

  it('precache-selects the HTML shell without downloading lazy chunks', () => {
    const appShellBundleFiles = new Set([
      'assets/index-entry.js',
      'assets/react-vendor.js',
      'assets/index.css',
    ]);
    const manifest = [
      { revision: 'a', size: 100, url: 'index.html' },
      { revision: 'b', size: 100, url: 'offline.html' },
      { revision: 'c', size: 100, url: 'boot-i18n.js' },
      { revision: null, size: 100, url: 'assets/index-entry.js' },
      { revision: null, size: 100, url: 'assets/react-vendor.js' },
      { revision: null, size: 100, url: 'assets/index.css' },
      { revision: null, size: 100, url: 'assets/authenticated-app.js' },
      { revision: null, size: 100, url: 'assets/media-stream-vendor.js' },
      { revision: null, size: 100, url: 'assets/fr.js' },
    ];

    expect(
      selectViteAppShellManifestEntries(manifest, appShellBundleFiles).map(({ url }) => url)
    ).toEqual([
      'index.html',
      'offline.html',
      'boot-i18n.js',
      'assets/index-entry.js',
      'assets/react-vendor.js',
      'assets/index.css',
    ]);
  });

  it('runtime-caches only same-origin generated immutable asset paths', () => {
    const matches = (pathname: string, sameOrigin = true, method = 'GET') =>
      isNavetRuntimeAssetRequest({
        request: { method },
        sameOrigin,
        url: { pathname },
      });

    expect(matches('/assets/authenticated-app-a1b2c3.js')).toBe(true);
    expect(matches('/wall/assets/dashboard-a1b2c3.css')).toBe(true);
    expect(matches('/assets/homey-a1b2c3.svg')).toBe(true);
    expect(matches('/assets/authenticated-app-a1b2c3.js', false)).toBe(false);
    expect(matches('/assets/authenticated-app-a1b2c3.js', true, 'POST')).toBe(false);
    expect(matches('/assets/unhashed.js')).toBe(false);
    expect(matches('/api/states')).toBe(false);
    expect(matches('/config.js')).toBe(false);
  });

  it('retains and deduplicates offline metadata and install assets', () => {
    const manifest = [
      { revision: 'a', size: 100, url: 'index.html' },
      { revision: null, size: 100, url: 'assets/index-entry.js' },
      { revision: 'b', size: 100, url: 'offline.html' },
      { revision: 'c', size: 100, url: 'site.webmanifest' },
      { revision: 'd', size: 100, url: 'logo.svg' },
      { revision: 'd', size: 100, url: './logo.svg' },
      { revision: 'e', size: 100, url: 'pwa-maskable-512.png' },
    ];

    expect(
      selectViteAppShellManifestEntries(manifest, new Set(['assets/index-entry.js'])).map(
        ({ url }) => url.replace(/^\.\//, '')
      )
    ).toEqual([
      'index.html',
      'assets/index-entry.js',
      'offline.html',
      'site.webmanifest',
      'logo.svg',
      'pwa-maskable-512.png',
    ]);
  });

  it('rejects an app shell that exceeds the low-power cache-write budget', () => {
    const requiredEntries = [
      { revision: 'a', size: 100, url: 'index.html' },
      { revision: null, size: 100, url: 'assets/index-entry.js' },
    ];

    expect(() =>
      selectViteAppShellManifestEntries(
        [
          ...requiredEntries,
          {
            revision: null,
            size: NAVET_PWA_APP_SHELL_MAX_BYTES,
            url: 'assets/react-vendor.js',
          },
        ],
        new Set(['assets/index-entry.js', 'assets/react-vendor.js'])
      )
    ).toThrow(/exceeds the low-power install budget/);

    const crowdedShellEntries = Array.from(
      { length: NAVET_PWA_APP_SHELL_MAX_ENTRIES },
      (_, index) => ({
        revision: null,
        size: 1,
        url: `assets/chunk-${index.toString().padStart(6, '0')}.js`,
      })
    );

    expect(() =>
      selectViteAppShellManifestEntries(
        [...requiredEntries, ...crowdedShellEntries],
        new Set(crowdedShellEntries.map((entry) => entry.url).concat('assets/index-entry.js'))
      )
    ).toThrow(/exceeds the low-power install budget/);
  });

  it('runs vite-plugin-pwa generation after bundle writes and only once', async () => {
    const generate = vi.fn();
    const buildPlugin = {
      name: 'vite-plugin-pwa:build',
      closeBundle: {
        handler: generate,
      },
    };
    const deferredPlugin = deferVitePwaGenerationUntilWriteBundle([
      buildPlugin,
    ] as unknown as Plugin[]);
    const writeBundle =
      typeof deferredPlugin.writeBundle === 'function'
        ? deferredPlugin.writeBundle
        : deferredPlugin.writeBundle?.handler;

    expect(buildPlugin.closeBundle).toBeUndefined();
    expect(writeBundle).toBeTypeOf('function');
    await writeBundle?.call({} as never, {} as never, {} as never);
    await writeBundle?.call({} as never, {} as never, {} as never);
    expect(generate).toHaveBeenCalledOnce();
  });
});
