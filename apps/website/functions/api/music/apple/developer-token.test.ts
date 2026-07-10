import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createAppleMusicDeveloperToken, onRequestGet } from './developer-token';

function base64UrlBytes(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(normalized, 'base64');
  const buffer = new ArrayBuffer(decoded.byteLength);
  new Uint8Array(buffer).set(decoded);
  return buffer;
}

describe('Apple Music developer token endpoint', () => {
  it('signs a short-lived ES256 developer token without exposing the private key', async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );
    const privateKey = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(privateKey).toString('base64')}\n-----END PRIVATE KEY-----`;
    const issuedAt = 1_750_000_000;

    const result = await createAppleMusicDeveloperToken(
      {
        APPLE_MUSIC_TEAM_ID: 'TEAMID1234',
        APPLE_MUSIC_KEY_ID: 'KEYID12345',
        APPLE_MUSIC_PRIVATE_KEY: pem,
      },
      issuedAt
    );
    const [header, payload, signature] = result.developerToken.split('.');

    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toEqual({
      alg: 'ES256',
      kid: 'KEYID12345',
      typ: 'JWT',
    });
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).toMatchObject({
      iss: 'TEAMID1234',
      iat: issuedAt,
      exp: issuedAt + 30 * 24 * 60 * 60,
    });
    await expect(
      webcrypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        keyPair.publicKey,
        base64UrlBytes(signature),
        new TextEncoder().encode(`${header}.${payload}`)
      )
    ).resolves.toBe(true);
    expect(result.developerToken).not.toContain(pem);
  });

  it('returns an unavailable response when deployment credentials are missing', async () => {
    const response = await onRequestGet({ env: {} });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Navet Apple Music authorization is unavailable',
    });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
