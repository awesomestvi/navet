import { getRuntimeContext } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import { getRuntimeConfig } from '../config/runtime-config';

const DEFAULT_HOME_ASSISTANT_PROXY_PATH = '/__navet_ha_proxy__';
const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

export interface HomeAssistantConnectionTarget {
  runtime?: string;
  hassUrl: string;
}

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function isRuntimeHostedHomeAssistantSession(
  config: HomeAssistantConnectionTarget
): boolean {
  const runtimeConfig = getRuntimeConfig();
  const runtimeContext = getRuntimeContext();

  if (config.runtime === 'ha-ingress' || runtimeContext.kind === 'ha_ingress') {
    return true;
  }

  if (!runtimeConfig.hassUrl) {
    return false;
  }

  return normalizeUrl(config.hassUrl) === normalizeUrl(runtimeConfig.hassUrl);
}

function getIngressBasePathFromPathname(pathname: string): string | null {
  const ingressStart = pathname.indexOf(HOME_ASSISTANT_INGRESS_PREFIX);
  if (ingressStart === -1) {
    return null;
  }

  const pathAfterIngressPrefix = pathname.slice(
    ingressStart + HOME_ASSISTANT_INGRESS_PREFIX.length
  );
  const [addonSlug] = pathAfterIngressPrefix.split('/');

  return addonSlug ? `${HOME_ASSISTANT_INGRESS_PREFIX}${addonSlug}` : null;
}

function getDocumentBasePath(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const baseHref = document.querySelector('base')?.href;
  if (!baseHref) {
    return null;
  }

  return getIngressBasePathFromPathname(new URL(baseHref).pathname);
}

function getDocumentAssetBasePath(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const assetElements = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(
      (element) => element.src
    ),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]')).map(
      (element) => element.href
    ),
  ];

  for (const assetUrl of assetElements) {
    try {
      const pathname = new URL(assetUrl).pathname;
      const assetsStart = pathname.indexOf('/assets/');
      if (assetsStart === -1) {
        continue;
      }

      const ingressBasePath = getIngressBasePathFromPathname(pathname.slice(0, assetsStart + 1));
      if (ingressBasePath) {
        return ingressBasePath;
      }
    } catch {
      // Ignore malformed asset URLs and keep looking for a usable runtime asset path.
    }
  }

  return null;
}

function getCurrentIngressBasePath(): string | null {
  if (typeof window === 'undefined') {
    return getDocumentBasePath() ?? getDocumentAssetBasePath();
  }

  return (
    getDocumentBasePath() ??
    getIngressBasePathFromPathname(window.location.pathname) ??
    getDocumentAssetBasePath()
  );
}

export function resolveIngressAwarePath(path: string): string {
  const normalizedPath = path.replace(/^\//, '');
  const ingressBasePath = getCurrentIngressBasePath();
  if (ingressBasePath) {
    return `${ingressBasePath}/${normalizedPath}`;
  }

  if (typeof document === 'undefined') {
    return path;
  }

  const resolved = new URL(normalizedPath, document.baseURI);
  return `${resolved.pathname.replace(/\/$/, '')}${resolved.search}`;
}

export function resolveAddonLocalEndpointUrl(path: string): string {
  const resolvedPath = resolveIngressAwarePath(path);

  if (typeof window === 'undefined' || !window.location.origin) {
    return resolvedPath;
  }

  return `${window.location.origin}${resolvedPath}`;
}

export function resolveHomeAssistantConnectionUrl(config: HomeAssistantConnectionTarget): string {
  const runtimeContext = getRuntimeContext();

  if (!isRuntimeHostedHomeAssistantSession(config)) {
    return config.hassUrl;
  }

  const proxyBasePath = runtimeContext.haProxyBasePath ?? DEFAULT_HOME_ASSISTANT_PROXY_PATH;
  return resolveAddonLocalEndpointUrl(proxyBasePath);
}
