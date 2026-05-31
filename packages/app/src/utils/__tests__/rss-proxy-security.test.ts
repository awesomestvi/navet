import {
  isAllowedRSSContentType,
  isBlockedRSSHostname,
  isPrivateIpAddress,
} from '@navet/app/utils/rss-proxy-security';
import { describe, expect, it } from 'vitest';

describe('rss-proxy-security', () => {
  it('identifies private IP addresses for RSS proxy rejection', () => {
    expect(isPrivateIpAddress('127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('10.0.0.5')).toBe(true);
    expect(isPrivateIpAddress('172.16.0.1')).toBe(true);
    expect(isPrivateIpAddress('192.168.1.10')).toBe(true);
    expect(isPrivateIpAddress('8.8.8.8')).toBe(false);
  });

  it('blocks local RSS hostnames', () => {
    expect(isBlockedRSSHostname('localhost')).toBe(true);
    expect(isBlockedRSSHostname('homeassistant.local')).toBe(true);
    expect(isBlockedRSSHostname('example.com')).toBe(false);
  });

  it('allows only XML-like RSS content types', () => {
    expect(isAllowedRSSContentType('application/rss+xml')).toBe(true);
    expect(isAllowedRSSContentType('application/atom+xml; charset=utf-8')).toBe(true);
    expect(isAllowedRSSContentType('text/html')).toBe(false);
    expect(isAllowedRSSContentType(null)).toBe(false);
  });
});
