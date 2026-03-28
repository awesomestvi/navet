const HOME_ASSISTANT_PROXY_PATH = '/__navet_ha_proxy__';

function isAbsoluteHttpUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://');
}

export function resolveHomeAssistantAbsoluteUrl(resourceUrl: string, hassUrl?: string) {
  if (!resourceUrl) {
    return null;
  }

  if (resourceUrl.startsWith('blob:') || resourceUrl.startsWith('data:')) {
    return resourceUrl;
  }

  if (resourceUrl.startsWith('/')) {
    return hassUrl ? `${hassUrl}${resourceUrl}` : resourceUrl;
  }

  return resourceUrl;
}

export function resolveHomeAssistantProxyUrl(resourceUrl: string, hassUrl?: string) {
  if (!resourceUrl) {
    return null;
  }

  if (resourceUrl.startsWith('blob:') || resourceUrl.startsWith('data:')) {
    return resourceUrl;
  }

  if (resourceUrl.startsWith(HOME_ASSISTANT_PROXY_PATH)) {
    return resourceUrl;
  }

  if (resourceUrl.startsWith('/')) {
    return `${HOME_ASSISTANT_PROXY_PATH}${resourceUrl}`;
  }

  if (!isAbsoluteHttpUrl(resourceUrl)) {
    return resourceUrl;
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
      if (resolvedResourceUrl.pathname.startsWith(HOME_ASSISTANT_PROXY_PATH)) {
        return `${resolvedResourceUrl.pathname}${resolvedResourceUrl.search}`;
      }

      return `${resolvedResourceUrl.pathname}${resolvedResourceUrl.search}`;
    }

    if (resolvedResourceUrl.origin !== resolvedHassUrl.origin) {
      return resourceUrl;
    }

    return `${HOME_ASSISTANT_PROXY_PATH}${resolvedResourceUrl.pathname}${resolvedResourceUrl.search}`;
  } catch {
    return resourceUrl;
  }
}

export function isMediaPlayerProxyUrl(resourceUrl: string) {
  return resourceUrl.includes('/api/media_player_proxy/');
}
