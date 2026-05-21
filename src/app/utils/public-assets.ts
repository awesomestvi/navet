export function getPublicAssetUrl(path: string) {
  const assetPath = path.replace(/^\/+/, '');
  const baseHref = typeof document !== 'undefined' ? document.querySelector('base')?.href : null;

  if (baseHref) {
    try {
      const resolved = new URL(assetPath, baseHref);
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch {
      // Fall through to the Vite base path if the runtime base tag is malformed.
    }
  }

  return `${import.meta.env.BASE_URL}${assetPath}`;
}
