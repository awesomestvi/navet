import { describe, expect, it } from 'vitest';
import { getCompactHomeAssistantImageUrl } from '../map-image-url';

describe('getCompactHomeAssistantImageUrl', () => {
  it('downsizes Home Assistant image proxy URLs used for compact map markers', () => {
    expect(getCompactHomeAssistantImageUrl('/api/image/serve/person-id/512x512')).toBe(
      '/api/image/serve/person-id/96x96'
    );
  });

  it('preserves query strings and unrelated image URLs', () => {
    expect(getCompactHomeAssistantImageUrl('/api/image/serve/person-id/512x512?authSig=abc')).toBe(
      '/api/image/serve/person-id/96x96?authSig=abc'
    );
    expect(getCompactHomeAssistantImageUrl('https://example.com/avatar.jpg')).toBe(
      'https://example.com/avatar.jpg'
    );
  });
});
