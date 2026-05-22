import { resolveIngressAwarePath } from './home-assistant-connection-target';

export function getPublicAssetUrl(path: string) {
  const assetPath = path.replace(/^\/+/, '');
  const ingressAwarePath = resolveIngressAwarePath(assetPath);
  if (ingressAwarePath.includes('/api/hassio_ingress/')) {
    return ingressAwarePath;
  }

  return `${import.meta.env.BASE_URL}${assetPath}`;
}
