import { isHomeAssistantPanelMode } from '../runtime/app-mode';
import { resolveIngressAwarePath } from './home-assistant-connection-target';
import { isSafeRelativePath, sanitizeImageUrl } from './url-security';

const HOME_ASSISTANT_PROXY_PATH = '/__navet_ha_proxy__';
const HOME_ASSISTANT_RELATIVE_PREFIXES = [
  '/api/',
  '/local/',
  '/media/',
  '/auth/',
  '/static/',
  '/hls/',
  '/image/',
];

function isAbsoluteHttpUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isHomeAssistantRelativeUrl(value: string) {
  return HOME_ASSISTANT_RELATIVE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function resolveProxyPath(path: string) {
  return resolveIngressAwarePath(`${HOME_ASSISTANT_PROXY_PATH}${path}`);
}

export function resolveHomeAssistantAbsoluteUrl(resourceUrl: string, hassUrl?: string) {
  if (!resourceUrl) {
    return null;
  }

  const safeImageUrl = sanitizeImageUrl(resourceUrl, undefined, {
    allowBlob: true,
    allowDataImage: true,
  });
  if (safeImageUrl && safeImageUrl !== resourceUrl) {
    return safeImageUrl;
  }

  if (resourceUrl.startsWith('blob:') || resourceUrl.startsWith('data:')) {
    return safeImageUrl;
  }

  if (
    resourceUrl.startsWith('/') &&
    isSafeRelativePath(resourceUrl) &&
    isHomeAssistantRelativeUrl(resourceUrl)
  ) {
    if (isHomeAssistantPanelMode()) {
      return resourceUrl;
    }

    return hassUrl ? `${hassUrl}${resourceUrl}` : resourceUrl;
  }

  if (resourceUrl.startsWith('/') && isSafeRelativePath(resourceUrl)) {
    return resourceUrl;
  }

  return sanitizeImageUrl(resourceUrl) ?? null;
}

export function resolveHomeAssistantProxyUrl(resourceUrl: string, hassUrl?: string) {
  if (!resourceUrl) {
    return null;
  }

  const safeImageUrl = sanitizeImageUrl(resourceUrl, undefined, {
    allowBlob: true,
    allowDataImage: true,
  });
  if (resourceUrl.startsWith('blob:') || resourceUrl.startsWith('data:')) {
    return safeImageUrl;
  }

  if (resourceUrl.startsWith(HOME_ASSISTANT_PROXY_PATH)) {
    const [proxyPath = '', proxyQuery = ''] = resourceUrl.split('?');
    return `${resolveIngressAwarePath(proxyPath)}${proxyQuery ? `?${proxyQuery}` : ''}`;
  }

  if (
    resourceUrl.startsWith('/') &&
    isSafeRelativePath(resourceUrl) &&
    isHomeAssistantRelativeUrl(resourceUrl)
  ) {
    if (isHomeAssistantPanelMode()) {
      return resourceUrl;
    }

    return resolveProxyPath(resourceUrl);
  }

  if (resourceUrl.startsWith('/') && isSafeRelativePath(resourceUrl)) {
    return resourceUrl;
  }

  if (!isAbsoluteHttpUrl(resourceUrl)) {
    return null;
  }

  if (!hassUrl) {
    return resourceUrl;
  }

  try {
    const resolvedResourceUrl = new URL(resourceUrl);
    const resolvedHassUrl = new URL(hassUrl);
    const currentOrigin =
      typeof window !== 'undefined' ? window.location.origin : resolvedHassUrl.origin;

    if (resolvedResourceUrl.origin === currentOrigin) {
      return `${resolvedResourceUrl.pathname}${resolvedResourceUrl.search}`;
    }

    if (resolvedResourceUrl.origin !== resolvedHassUrl.origin) {
      return sanitizeImageUrl(resourceUrl);
    }

    if (isHomeAssistantPanelMode()) {
      return `${resolvedResourceUrl.pathname}${resolvedResourceUrl.search}`;
    }

    return `${resolveProxyPath(resolvedResourceUrl.pathname)}${resolvedResourceUrl.search}`;
  } catch (error) {
    console.error('[HomeAssistantURL] URL resolution failed:', error);
    return resourceUrl;
  }
}

export function isMediaPlayerProxyUrl(resourceUrl: string) {
  return resourceUrl.includes('/api/media_player_proxy/');
}
