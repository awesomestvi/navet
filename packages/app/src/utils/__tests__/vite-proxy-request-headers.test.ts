import type { IncomingMessage } from 'node:http';
import {
  buildHomeAssistantProxyRequestHeaders,
  copyProxyRequestHeaders,
  isHomeAssistantOAuthProxyBodyRequest,
} from '@scripts/vite-proxy-request-headers';
import { describe, expect, it } from 'vitest';

describe('copyProxyRequestHeaders', () => {
  it('forwards media-relevant conditional and range headers', () => {
    const headers = copyProxyRequestHeaders({
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'if-modified-since': 'Wed, 03 Jun 2026 13:00:00 GMT',
      'if-none-match': '"etag-value"',
      'if-range': '"segment-etag"',
      range: 'bytes=0-',
      host: 'navet.local:5200',
      connection: 'keep-alive',
    });

    expect(headers.get('accept')).toBe('*/*');
    expect(headers.get('accept-language')).toBe('en-US,en;q=0.9');
    expect(headers.get('cache-control')).toBe('no-cache');
    expect(headers.get('if-modified-since')).toBe('Wed, 03 Jun 2026 13:00:00 GMT');
    expect(headers.get('if-none-match')).toBe('"etag-value"');
    expect(headers.get('if-range')).toBe('"segment-etag"');
    expect(headers.get('range')).toBe('bytes=0-');
    expect(headers.get('host')).toBeNull();
    expect(headers.get('connection')).toBeNull();
  });

  it('joins repeated header values into a single forwarded header', () => {
    const repeatedHeaders = {
      accept: ['application/json', 'text/plain'],
      range: ['bytes=0-99', 'bytes=100-199'],
    } as unknown as IncomingMessage['headers'];

    const headers = copyProxyRequestHeaders(repeatedHeaders);

    expect(headers.get('accept')).toBe('application/json, text/plain');
    expect(headers.get('range')).toBe('bytes=0-99, bytes=100-199');
  });

  it('replaces attacker authorization with the cookie-bound Home Assistant token', () => {
    const headers = buildHomeAssistantProxyRequestHeaders(
      {
        authorization: 'Bearer attacker-token',
        cookie: 'navet_auth_session=private-cookie-id',
        accept: 'application/json',
      },
      'session-access-token'
    );

    expect(headers.get('authorization')).toBe('Bearer session-access-token');
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('accept')).toBe('application/json');
  });

  it('forwards the browser-generated multipart boundary only for OAuth body requests', () => {
    const headers = buildHomeAssistantProxyRequestHeaders(
      {
        'content-type': 'multipart/form-data; boundary=navet-refresh-boundary',
      },
      'session-access-token',
      { forwardContentType: true, includeAuthorization: false }
    );

    expect(headers.get('content-type')).toBe(
      'multipart/form-data; boundary=navet-refresh-boundary'
    );
    expect(headers.get('authorization')).toBeNull();
    expect(isHomeAssistantOAuthProxyBodyRequest('POST', '/auth/token')).toBe(true);
    expect(isHomeAssistantOAuthProxyBodyRequest('POST', '/auth/revoke')).toBe(true);
    expect(isHomeAssistantOAuthProxyBodyRequest('GET', '/auth/token')).toBe(false);
    expect(isHomeAssistantOAuthProxyBodyRequest('POST', '/api/services/light/turn_on')).toBe(false);
  });
});
