import path from 'node:path';
import type { Plugin } from 'vite';

export const NAVET_PWA_INCLUDE_ASSETS = [
  'favicon.svg',
  'favicon-32x32.svg',
  'apple-touch-icon.png',
  'logo.svg',
  'logo-horizontal.svg',
  'logo-horizontal-light.svg',
  'pwa-192.png',
  'pwa-512.png',
  'pwa-maskable-192.png',
  'pwa-maskable-512.png',
] as const;

// The service worker installs on the browser's main process and contends with startup on
// wall panels. Bound both the number of cache writes and their aggregate payload so a future
// route or locale import cannot quietly restore the multi-megabyte install regression.
export const NAVET_PWA_APP_SHELL_MAX_ENTRIES = 40;
export const NAVET_PWA_APP_SHELL_MAX_BYTES = Math.floor(1.75 * 1024 * 1024);

const NAVET_APP_SHELL_FILES = new Set([
  'boot-i18n.js',
  'index.html',
  'offline.html',
  'site.webmanifest',
  ...NAVET_PWA_INCLUDE_ASSETS,
]);

export type VitePwaManifestEntry = {
  revision?: string | null;
  size: number;
  url: string;
};

type ViteOutputChunk = {
  dynamicImports: string[];
  fileName: string;
  imports: string[];
  isEntry: boolean;
  referencedFiles?: string[];
  type: 'chunk';
  viteMetadata?: {
    importedAssets?: Set<string>;
    importedCss?: Set<string>;
  };
};

type ViteOutputAsset = {
  fileName: string;
  type: 'asset';
};

export type ViteOutputBundle = Record<string, ViteOutputAsset | ViteOutputChunk>;

type ViteRuntimeRouteMatchInput = {
  request: Pick<Request, 'method'>;
  sameOrigin: boolean;
  url: Pick<URL, 'pathname'>;
};

export function isNavetRuntimeAssetRequest({
  request,
  sameOrigin,
  url,
}: ViteRuntimeRouteMatchInput) {
  return (
    sameOrigin &&
    request.method === 'GET' &&
    /\/assets\/[^/?]+-[A-Za-z0-9_-]{6,}\.(?:css|js|svg)$/.test(url.pathname)
  );
}

function normalizeBundleReference(
  importerFileName: string,
  reference: string,
  bundle: ViteOutputBundle
) {
  const normalizedReference = reference.replace(/^\.\//, '');
  if (bundle[normalizedReference]) {
    return normalizedReference;
  }

  const importerRelativeReference = path.posix.normalize(
    path.posix.join(path.posix.dirname(importerFileName), reference)
  );
  return bundle[importerRelativeReference] ? importerRelativeReference : normalizedReference;
}

/**
 * Returns the version-atomic startup graph: entry chunks, their recursive static imports,
 * entry-referenced assets, and CSS. Dynamic imports intentionally remain runtime-cached.
 */
export function collectViteAppShellBundleFiles(bundle: ViteOutputBundle) {
  const shellFiles = new Set<string>();

  const visitChunk = (fileName: string) => {
    if (shellFiles.has(fileName)) {
      return;
    }

    const output = bundle[fileName];
    if (!output || output.type !== 'chunk') {
      return;
    }

    const chunk = output as ViteOutputChunk;
    shellFiles.add(chunk.fileName);
    for (const cssFileName of chunk.viteMetadata?.importedCss ?? []) {
      shellFiles.add(cssFileName);
    }
    for (const assetFileName of chunk.viteMetadata?.importedAssets ?? []) {
      shellFiles.add(assetFileName);
    }
    for (const referencedFileName of chunk.referencedFiles ?? []) {
      shellFiles.add(
        normalizeBundleReference(chunk.fileName, referencedFileName, bundle)
      );
    }
    for (const importedFileName of chunk.imports ?? []) {
      visitChunk(normalizeBundleReference(chunk.fileName, importedFileName, bundle));
    }
  };

  for (const output of Object.values(bundle)) {
    if (output.type === 'chunk' && output.isEntry) {
      visitChunk(output.fileName);
    }
    if (output.type === 'asset' && output.fileName.endsWith('.css')) {
      shellFiles.add(output.fileName);
    }
  }

  return shellFiles;
}

export function selectViteAppShellManifestEntries(
  manifestEntries: VitePwaManifestEntry[],
  appShellBundleFiles: ReadonlySet<string>
) {
  const selectedUrls = new Set<string>();
  const selectedEntries = manifestEntries.filter((entry) => {
    const normalizedUrl = entry.url.replace(/^\.\//, '').split(/[?#]/, 1)[0] ?? '';
    const selected =
      NAVET_APP_SHELL_FILES.has(normalizedUrl) || appShellBundleFiles.has(normalizedUrl);
    if (!selected || selectedUrls.has(normalizedUrl)) {
      return false;
    }
    selectedUrls.add(normalizedUrl);
    return true;
  });

  if (
    !selectedUrls.has('index.html') ||
    !selectedEntries.some((entry) => /\.js(?:[?#]|$)/.test(entry.url))
  ) {
    throw new Error('Navet PWA app-shell selection did not include index.html and its entry graph');
  }

  const selectedBytes = selectedEntries.reduce((total, entry) => total + entry.size, 0);
  if (
    selectedEntries.length > NAVET_PWA_APP_SHELL_MAX_ENTRIES ||
    selectedBytes > NAVET_PWA_APP_SHELL_MAX_BYTES
  ) {
    throw new Error(
      `Navet PWA app shell exceeds the low-power install budget: ` +
        `${selectedEntries.length}/${NAVET_PWA_APP_SHELL_MAX_ENTRIES} entries, ` +
        `${selectedBytes}/${NAVET_PWA_APP_SHELL_MAX_BYTES} bytes`
    );
  }

  return selectedEntries;
}

export function createVitePwaCachePolicy(): {
  capturePlugin: Plugin;
  manifestTransform: (manifestEntries: VitePwaManifestEntry[]) => {
    manifest: VitePwaManifestEntry[];
    warnings: string[];
  };
} {
  let appShellBundleFiles = new Set<string>();
  const renderedBundle: ViteOutputBundle = {};

  return {
    capturePlugin: {
      name: 'navet:pwa-app-shell-graph',
      apply: 'build',
      renderChunk(_code, chunk) {
        const chunkMetadata = chunk as typeof chunk & {
          referencedFiles?: string[];
          viteMetadata?: ViteOutputChunk['viteMetadata'];
        };
        renderedBundle[chunk.fileName] = {
          dynamicImports: [...(chunk.dynamicImports ?? [])],
          fileName: chunk.fileName,
          imports: [...(chunk.imports ?? [])],
          isEntry: chunk.isEntry ?? false,
          referencedFiles: [...(chunkMetadata.referencedFiles ?? [])],
          type: 'chunk',
          viteMetadata: chunkMetadata.viteMetadata,
        };
        return null;
      },
      generateBundle(_outputOptions, bundle) {
        appShellBundleFiles = collectViteAppShellBundleFiles(
          bundle as unknown as ViteOutputBundle
        );
      },
    },
    manifestTransform(manifestEntries) {
      if (appShellBundleFiles.size === 0) {
        appShellBundleFiles = collectViteAppShellBundleFiles(renderedBundle);
      }
      if (appShellBundleFiles.size === 0) {
        throw new Error('Navet PWA app-shell graph was not captured before Workbox generation');
      }

      return {
        manifest: selectViteAppShellManifestEntries(
          manifestEntries,
          appShellBundleFiles
        ),
        warnings: [],
      };
    },
  };
}

type DeferredCloseBundleHandler = (
  this: unknown,
  error?: Error
) => void | Promise<void>;

/**
 * vite-plugin-pwa 1.3's closeBundle hook can run before Rolldown has written the client bundle
 * under Vite 8. Move only its service-worker generation hook to writeBundle so Workbox always
 * scans the complete, current output rather than a partial or previous directory.
 */
export function deferVitePwaGenerationUntilWriteBundle(pwaPlugins: Plugin[]): Plugin {
  const buildPlugin = pwaPlugins.find((plugin) => plugin.name === 'vite-plugin-pwa:build');
  if (!buildPlugin?.closeBundle) {
    throw new Error('Unable to locate the vite-plugin-pwa build generator');
  }

  const closeBundleHook = buildPlugin.closeBundle;
  const handler = (
    typeof closeBundleHook === 'function' ? closeBundleHook : closeBundleHook.handler
  ) as unknown as DeferredCloseBundleHandler;
  buildPlugin.closeBundle = undefined;
  let generated = false;

  return {
    name: 'navet:pwa-generate-after-write',
    apply: 'build',
    enforce: 'post',
    async writeBundle() {
      if (generated) {
        return;
      }
      generated = true;
      await handler.call(this);
    },
  };
}
