import { getRuntimeConfig } from '@navet/app/config/runtime-config';
import { describe, expect, it } from 'vitest';

describe('runtime-config', () => {
  it('normalizes browser runtime connection defaults', () => {
    window.__NAVET_CONFIG__ = {
      runtime: 'ha-ingress',
      hassUrl: 'https://ha.example.com/',
      dashboardConfigUrl: '  /navet-dashboard.yaml  ',
      proxyBaseUrl: ' /__navet_ha_proxy__/ ',
    };

    expect(getRuntimeConfig()).toEqual({
      runtime: 'ha-ingress',
      hassUrl: 'https://ha.example.com',
      dashboardConfigUrl: '/navet-dashboard.yaml',
      proxyBaseUrl: '/__navet_ha_proxy__',
    });
  });
});
