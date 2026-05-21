import { describe, expect, it } from 'vitest';
import { getAppChunkName, getVendorChunkName, isLazyHtmlPreload } from './vite-chunking';

describe('vite chunking helpers', () => {
  it('splits map widgets and leaflet into dedicated chunks', () => {
    expect(
      getAppChunkName('/repo/src/app/features/dashboard/components/widgets/map-widget.tsx')
    ).toBe('dashboard-widget-map');
    expect(getVendorChunkName('/repo/node_modules/leaflet/dist/leaflet-src.js')).toBe(
      'leaflet-vendor'
    );
    expect(getVendorChunkName('/repo/node_modules/react-leaflet/lib/index.js')).toBe(
      'leaflet-vendor'
    );
  });

  it('keeps lazy chunks out of html modulepreload dependencies', () => {
    expect(isLazyHtmlPreload('assets/dashboard-widget-map-AbCdEf.js')).toBe(true);
    expect(isLazyHtmlPreload('assets/react-vendor-AbCdEf.js')).toBe(false);
  });
});
