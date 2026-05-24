import { describe, expect, it } from 'vitest';
import { getRuntimeConfig } from '@/app/config/runtime-config';

describe('runtime-config', () => {
  it('normalizes browser runtime connection defaults', () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'https://ha.example.com/',
      dashboardConfigUrl: '  /navet-dashboard.yaml  ',
      proxyBaseUrl: ' /__navet_ha_proxy__/ ',
    };

    expect(getRuntimeConfig()).toEqual({
      hassUrl: 'https://ha.example.com',
      dashboardConfigUrl: '/navet-dashboard.yaml',
      proxyBaseUrl: '/__navet_ha_proxy__',
    });
  });
});
