import { normalizeViteProxyTargetPath } from '@scripts/vite-proxy-path';
import { describe, expect, it } from 'vitest';

describe('normalizeViteProxyTargetPath', () => {
  it('keeps already-stripped proxy request paths stable', () => {
    expect(
      normalizeViteProxyTargetPath('/__navet_ha_proxy__', '/api/image/serve/person/96x96')
    ).toBe('/api/image/serve/person/96x96');
  });

  it('strips the proxy base path when Vite passes the full mounted URL', () => {
    expect(
      normalizeViteProxyTargetPath(
        '/__navet_ha_proxy__',
        '/__navet_ha_proxy__/api/image/serve/person/96x96'
      )
    ).toBe('/api/image/serve/person/96x96');
  });

  it('normalizes bare post-prefix paths with a leading slash', () => {
    expect(normalizeViteProxyTargetPath('/__navet_homey_proxy__', 'api/manager/devices')).toBe(
      '/api/manager/devices'
    );
  });
});
