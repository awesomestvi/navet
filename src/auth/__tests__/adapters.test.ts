import { describe, expect, it } from 'vitest';
import { haIngressAuth } from '../adapters/haIngressAuth';
import { haPanelAuth } from '../adapters/haPanelAuth';
import { legacyTokenAuth } from '../adapters/legacyTokenAuth';

describe('auth adapters', () => {
  it('creates panel session', async () => {
    const session = await haPanelAuth.init();
    expect(session?.accessToken).toContain('__ha_panel_session__');
  });

  it('creates ingress session', async () => {
    const session = await haIngressAuth.init();
    expect(session?.accessToken).toContain('__ha_ingress_session__');
  });

  it('supports legacy token login fallback', async () => {
    const session = await legacyTokenAuth.login?.({
      hassUrl: 'https://ha.example.com',
      token: 'abc',
    });
    expect(session?.accessToken).toBe('abc');
  });
});
