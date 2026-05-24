export type AuthRuntime = 'ha-panel' | 'ha-ingress' | 'standalone-oauth';

const INGRESS_PATH = '/api/hassio_ingress/';

function hasIngressPath(pathname: string): boolean {
  return pathname.includes(INGRESS_PATH);
}

function hasIngressBase(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const baseHref = document.querySelector('base')?.href;
  if (!baseHref) {
    return false;
  }

  try {
    return hasIngressPath(new URL(baseHref).pathname);
  } catch {
    return false;
  }
}

function hasIngressAssets(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const assetUrls = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(
      (element) => element.src
    ),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]')).map(
      (element) => element.href
    ),
  ];

  return assetUrls.some((assetUrl) => {
    try {
      return hasIngressPath(new URL(assetUrl).pathname);
    } catch {
      return false;
    }
  });
}

export function detectAuthRuntime(): AuthRuntime {
  if (typeof window !== 'undefined' && (window as { __NAVET_PANEL__?: boolean }).__NAVET_PANEL__) {
    return 'ha-panel';
  }

  if (
    (typeof window !== 'undefined' && hasIngressPath(window.location.pathname)) ||
    hasIngressBase() ||
    hasIngressAssets()
  ) {
    return 'ha-ingress';
  }

  return 'standalone-oauth';
}
