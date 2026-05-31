import { beforeEach, describe, expect, it } from 'vitest';
import { getPublicAssetUrl } from '../public-assets';

describe('getPublicAssetUrl', () => {
  beforeEach(() => {
    document.querySelector('base')?.remove();
    document.querySelectorAll('script[src], link[href]').forEach((element) => {
      element.remove();
    });
    window.history.replaceState(null, '', '/');
  });

  it('uses the Home Assistant ingress asset base inferred from loaded chunks', () => {
    const script = document.createElement('script');
    script.src = `${window.location.origin}/api/hassio_ingress/navet_dev/assets/index.js`;
    document.head.append(script);

    expect(getPublicAssetUrl('logo.svg')).toBe('/api/hassio_ingress/navet_dev/logo.svg');
  });
});
