import { describe, expect, it } from 'vitest';
import { parseButtonServiceCall, sanitizeButtonEntityId } from '../button-widget-security';

describe('button-widget-security', () => {
  it('parses explicit Home Assistant service calls', () => {
    expect(parseButtonServiceCall('light.turn_on')).toEqual({
      domain: 'light',
      service: 'turn_on',
    });
    expect(parseButtonServiceCall('media_player.select_source')).toEqual({
      domain: 'media_player',
      service: 'select_source',
    });
  });

  it('rejects malformed service calls and entity ids', () => {
    expect(parseButtonServiceCall('javascript:alert(1)')).toBeNull();
    expect(parseButtonServiceCall('light')).toBeNull();
    expect(sanitizeButtonEntityId('light.kitchen')).toBe('light.kitchen');
    expect(sanitizeButtonEntityId('../light.kitchen')).toBeUndefined();
  });
});
