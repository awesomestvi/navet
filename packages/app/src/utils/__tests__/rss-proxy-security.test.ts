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

describe('RSS literal address normalization', () => {
  it.each([
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '0:0:0:0:0:ffff:7f00:1',
    '[::ffff:192.168.1.1]',
    'fe90::1',
    'febf::1',
    'fd00::1',
    '::1',
    '::',
    '127.1',
    '2130706433',
    '0x7f000001',
    '0177.0.0.1',
    '100.64.0.1',
  ])('rejects local or private target %s', (address) => {
    expect(isPrivateIpAddress(address)).toBe(true);
  });

  it.each([
    'fcnews.example',
    'fd.example',
    '8.8.8.8',
    '2606:4700:4700::1111',
    '[2606:4700:4700::1111]',
    '::ffff:808:808',
  ])('does not misclassify public target %s', (address) => {
    expect(isPrivateIpAddress(address)).toBe(false);
    expect(isBlockedRSSHostname(address)).toBe(false);
  });

  it.each(['homeassistant.local.', 'LOCALHOST.', 'internal.localhost'])(
    'rejects local DNS name %s',
    (hostname) => expect(isBlockedRSSHostname(hostname)).toBe(true)
  );
});
