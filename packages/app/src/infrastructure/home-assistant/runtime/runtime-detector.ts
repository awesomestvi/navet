import { getRuntimeConfig } from '@navet/app/config/runtime-config';
import type { RuntimeContext } from './runtime-context';

const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

function getWindowLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location;
}

function getBaseHref() {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector('base')?.href ?? null;
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

function getDocumentIngressBasePath(): string | null {
  const baseHref = getBaseHref();
  if (!baseHref) {
    return null;
  }

  try {
    return getIngressBasePathFromPathname(new URL(baseHref).pathname);
  } catch {
    return null;
  }
}

function getAssetIngressBasePath(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const assetUrls = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(
      (element) => element.src
    ),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]')).map(
      (element) => element.href
    ),
  ];

  for (const assetUrl of assetUrls) {
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
      // Ignore malformed asset URLs while probing runtime paths.
    }
  }

  return null;
}

function resolveIngressBasePath(): string | null {
  const location = getWindowLocation();

  return (
    getDocumentIngressBasePath() ??
    (location ? getIngressBasePathFromPathname(location.pathname) : null) ??
    getAssetIngressBasePath()
  );
}

function resolveAppBasePath(ingressBasePath: string | null): string {
  if (ingressBasePath) {
    return ingressBasePath;
  }

  const baseHref = getBaseHref();
  if (!baseHref) {
    return '/';
  }

  try {
    const pathname = new URL(baseHref).pathname;
    return pathname.endsWith('/') ? pathname.slice(0, -1) || '/' : pathname;
  } catch {
    return '/';
  }
}

let cachedRuntimeContext: RuntimeContext | null = null;

export function detectRuntimeContext(): RuntimeContext {
  if (cachedRuntimeContext) {
    return cachedRuntimeContext;
  }

  const location = getWindowLocation();
  const runtimeConfig = typeof window !== 'undefined' ? getRuntimeConfig() : {};
  const appOrigin = location?.origin ?? '';
  const ingressBasePath = resolveIngressBasePath();
  const appBasePath = resolveAppBasePath(ingressBasePath);
  const isPanel = typeof window !== 'undefined' && window.__NAVET_PANEL__ === true;
  const hasConfiguredHaBaseUrl = Boolean(runtimeConfig.hassUrl);

  const kind: RuntimeContext['kind'] = isPanel
    ? 'ha_panel'
    : ingressBasePath
      ? 'ha_ingress'
      : import.meta.env.DEV
        ? 'dev'
        : 'standalone';

  const authMode: RuntimeContext['authMode'] =
    kind === 'ha_panel'
      ? 'ha_frontend_session'
      : kind === 'ha_ingress'
        ? 'ingress_session'
        : 'oauth';

  cachedRuntimeContext = {
    kind,
    appOrigin,
    appBasePath,
    haBaseUrl: runtimeConfig.hassUrl ?? null,
    haProxyBasePath: runtimeConfig.proxyBaseUrl ?? '/__navet_ha_proxy__',
    authMode,
    supportsDirectHaHttp: kind === 'ha_panel' || kind === 'dev',
    supportsSameOriginHaProxy: kind !== 'ha_panel' || hasConfiguredHaBaseUrl,
    supportsPanelHassBridge: kind === 'ha_panel',
  };

  return cachedRuntimeContext;
}

export function getRuntimeContext(): RuntimeContext {
  return detectRuntimeContext();
}

export function resetRuntimeContextForTests() {
  cachedRuntimeContext = null;
}
