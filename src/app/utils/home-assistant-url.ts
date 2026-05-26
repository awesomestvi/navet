import { homeAssistantResourceResolver } from '@/app/infrastructure/home-assistant/home-assistant-infrastructure';

const HOME_ASSISTANT_PROXY_PATH = '/__navet_ha_proxy__';

interface ResolveHomeAssistantProxyUrlOptions {
  proxyAvailable?: boolean;
}

export function resolveHomeAssistantAbsoluteUrl(resourceUrl: string, _hassUrl?: string) {
  const resource = homeAssistantResourceResolver.resolveSync({
    kind: 'absolute_url',
    url: resourceUrl,
  });

  return resource.url ?? null;
}

export function resolveHomeAssistantProxyUrl(
  resourceUrl: string,
  hassUrl?: string,
  options: ResolveHomeAssistantProxyUrlOptions = {}
) {
  if (options.proxyAvailable === false) {
    if (resourceUrl.startsWith(HOME_ASSISTANT_PROXY_PATH)) {
      return null;
    }

    if (
      resourceUrl.startsWith('/api/') ||
      resourceUrl.startsWith('/image/') ||
      resourceUrl.startsWith('/local/') ||
      resourceUrl.startsWith('/media/') ||
      resourceUrl.startsWith('/hls/')
    ) {
      return hassUrl ? `${hassUrl}${resourceUrl}` : null;
    }

    if (resourceUrl.startsWith('http://') || resourceUrl.startsWith('https://')) {
      return resourceUrl;
    }
  }

  const resource = homeAssistantResourceResolver.resolveSync(
    {
      kind:
        resourceUrl.includes('/api/camera_proxy/') ||
        resourceUrl.includes('/api/camera_proxy_stream/')
          ? 'camera_snapshot'
          : 'absolute_url',
      ...(resourceUrl.includes('/api/camera_proxy/') ||
      resourceUrl.includes('/api/camera_proxy_stream/')
        ? { entityId: resourceUrl, rawPath: resourceUrl }
        : { url: resourceUrl }),
    } as
      | { kind: 'camera_snapshot'; entityId: string; rawPath: string }
      | { kind: 'absolute_url'; url: string },
    {
      allowDirect: options.proxyAvailable === false,
    }
  );

  return resource.url ?? null;
}

export function isMediaPlayerProxyUrl(resourceUrl: string) {
  return (
    resourceUrl.includes('/api/media_player_proxy/') ||
    resourceUrl.includes(`${HOME_ASSISTANT_PROXY_PATH}/api/media_player_proxy/`)
  );
}
