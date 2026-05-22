import { getRuntimeConfig } from '../config/runtime-config';
import type { SessionConfig } from '../session/session';

const DEFAULT_HOME_ASSISTANT_PROXY_PATH = '/__navet_ha_proxy__';
const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isRuntimeHostedSession(config: SessionConfig): boolean {
  const runtimeConfig = getRuntimeConfig();

  if (!runtimeConfig.hassUrl) {
    return false;
  }

  return normalizeUrl(config.url) === normalizeUrl(runtimeConfig.hassUrl);
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

function getCurrentIngressBasePath(): string | null {
  if (typeof window === 'undefined') {
    return getDocumentBasePath();
  }

  return getDocumentBasePath() ?? getIngressBasePathFromPathname(window.location.pathname);
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

  return new URL(normalizedPath, document.baseURI).pathname.replace(/\/$/, '');
}

export function resolveAddonLocalEndpointUrl(path: string): string {
  const resolvedPath = resolveIngressAwarePath(path);

  if (typeof window === 'undefined' || !window.location.origin) {
    return resolvedPath;
  }

  return `${window.location.origin}${resolvedPath}`;
}

export function resolveHomeAssistantConnectionUrl(config: SessionConfig): string {
  const runtimeConfig = getRuntimeConfig();

  if (!isRuntimeHostedSession(config)) {
    return config.url;
  }

  const proxyBasePath = runtimeConfig.proxyBaseUrl ?? DEFAULT_HOME_ASSISTANT_PROXY_PATH;
  return resolveAddonLocalEndpointUrl(proxyBasePath);
}
