import {
  isSafeRelativePath,
  sanitizeExternalUrl,
  sanitizeImageUrl,
} from '@navet/app/utils/url-security';
import { describe, expect, it } from 'vitest';

describe('url-security', () => {
  it('allows only http and https external links', () => {
    expect(sanitizeExternalUrl('https://example.com/feed.xml')).toBe(
      'https://example.com/feed.xml'
    );
    expect(sanitizeExternalUrl('http://example.com/feed.xml')).toBe('http://example.com/feed.xml');
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeExternalUrl('data:text/html,hello')).toBeNull();
  });

  it('allows image data URLs only when explicitly requested', () => {
    expect(sanitizeImageUrl('data:image/png;base64,abc', undefined, { allowDataImage: true })).toBe(
      'data:image/png;base64,abc'
    );
    expect(
      sanitizeImageUrl('data:text/html;base64,abc', undefined, { allowDataImage: true })
    ).toBeNull();
    expect(sanitizeImageUrl('data:image/png;base64,abc')).toBeNull();
  });

  it('rejects unsafe relative paths', () => {
    expect(isSafeRelativePath('/api/camera_proxy/camera.front')).toBe(true);
    expect(isSafeRelativePath('//evil.example/path')).toBe(false);
    expect(isSafeRelativePath('/api/../config')).toBe(false);
    expect(isSafeRelativePath('/api/%2e%2e/config')).toBe(false);
  });
});
