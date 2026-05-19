declare global {
  interface Window {
    __NAVET_PANEL__?: boolean;
  }
}

const HOME_ASSISTANT_INGRESS_PREFIX = '/api/hassio_ingress/';

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
  if (typeof document === 'undefined') {
    return null;
  }

  const baseHref = document.querySelector('base')?.href;
  if (!baseHref) {
    return null;
  }

  return getIngressBasePathFromPathname(new URL(baseHref).pathname);
}

export function isHomeAssistantPanelMode(): boolean {
  return typeof window !== 'undefined' && window.__NAVET_PANEL__ === true;
}

export function isHomeAssistantAddonMode(): boolean {
  if (isHomeAssistantPanelMode()) {
    return false;
  }

  if (typeof window === 'undefined') {
    return getDocumentIngressBasePath() !== null;
  }

  return (
    getDocumentIngressBasePath() !== null ||
    getIngressBasePathFromPathname(window.location.pathname) !== null
  );
}
