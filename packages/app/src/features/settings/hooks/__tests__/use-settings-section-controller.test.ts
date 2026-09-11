import { describe, expect, it } from 'vitest';
import { resolveProviderDisplayBaseUrl } from '../use-settings-section-controller';

describe('resolveProviderDisplayBaseUrl', () => {
  it('shows the Home Assistant instance URL instead of the internal connection proxy', () => {
    expect(
      resolveProviderDisplayBaseUrl({
        haBaseUrl: 'https://home.example.com',
        hassUrl: 'http://navet.local:5200/__navet_ha_proxy__',
      })
    ).toBe('https://home.example.com');
  });

  it('falls back to the connection URL for sessions without a separate instance URL', () => {
    expect(resolveProviderDisplayBaseUrl({ hassUrl: 'https://homey.example.com' })).toBe(
      'https://homey.example.com'
    );
  });
});
