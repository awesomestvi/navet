import { describe, expect, it } from 'vitest';
import { isCredentialBearingUrl, isCredentialFieldName } from './credential-policy';

describe('credential export policy', () => {
  it.each([
    'https://user:password@example.com/image',
    '//user@example.com/image',
    'https:\n//user:password@example.com/image',
    '/image?access_token=secret',
    '/image?%61pi_key=secret',
    '/image?view=full;password=secret',
    '/image#access_token=secret',
    '/image#/camera?apiKey=secret',
  ])('rejects credential-bearing URLs: %s', (url) => {
    expect(isCredentialBearingUrl(url)).toBe(true);
  });

  it.each(['https://example.com/image', '/image?width=400', '/image#preview'])(
    'keeps public resource URLs: %s',
    (url) => {
      expect(isCredentialBearingUrl(url)).toBe(false);
    }
  );

  it.each(['access_token', 'api-key', 'Authorization', 'password', 'privateKey'])(
    'recognizes secret fields regardless of separators: %s',
    (key) => {
      expect(isCredentialFieldName(key)).toBe(true);
    }
  );
});
