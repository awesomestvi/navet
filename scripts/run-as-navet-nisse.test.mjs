import { generateKeyPairSync, verify } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  createAppJwt,
  createInstallationToken,
  parseOperation,
  performOperation,
} from './run-as-navet-nisse.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

describe('Navet Nisse GitHub App authentication', () => {
  it('creates a verifiable short-lived RS256 app JWT', () => {
    const token = createAppJwt({ appId: 123, privateKey, now: 1_800_000_000_000 });
    const [header, payload, signature] = token.split('.');
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toEqual({
      iat: 1_799_999_940,
      exp: 1_800_000_540,
      iss: '123',
    });
    expect(
      verify(
        'RSA-SHA256',
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, 'base64url')
      )
    ).toBe(true);
  });

  it('requests an installation token with a signed app JWT', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'installation-token' }),
    });
    await expect(
      createInstallationToken({ appId: 123, installationId: 456, privateKey, fetchImpl })
    ).resolves.toBe('installation-token');
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.github.com/app/installations/456/access_tokens');
    expect(request).toMatchObject({ method: 'POST', signal: expect.any(AbortSignal) });
    const [header, payload, signature] = request.headers.Authorization.slice('Bearer '.length).split('.');
    expect(
      verify(
        'RSA-SHA256',
        Buffer.from(`${header}.${payload}`),
        publicKey,
        Buffer.from(signature, 'base64url')
      )
    ).toBe(true);
  });

  it('limits the bot identity to comments and reactions', () => {
    expect(parseOperation(['comment', '181', '--body-file', '/tmp/reply.md'])).toEqual({
      method: 'POST',
      path: '/repos/awesomestvi/navet/issues/181/comments',
      bodyFile: '/tmp/reply.md',
    });
    expect(parseOperation(['react', '1234', 'rocket'])).toEqual({
      method: 'POST',
      path: '/repos/awesomestvi/navet/issues/comments/1234/reactions',
      body: { content: 'rocket' },
    });
    expect(parseOperation(['unreact', '1234', '5678'])).toEqual({
      method: 'DELETE',
      path: '/repos/awesomestvi/navet/issues/comments/1234/reactions/5678',
    });
    expect(() => parseOperation(['git', 'push'])).toThrow('Usage:');
    expect(() => parseOperation(['pr', 'create'])).toThrow('Usage:');
    expect(() => parseOperation(['react', '1234', 'invalid'])).toThrow('Unsupported');
  });

  it('writes comments through the issues API without exposing the token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 99 }),
    });
    const operation = {
      method: 'POST',
      path: '/repos/awesomestvi/navet/issues/181/comments',
      body: { body: 'Useful result.' },
    };
    await expect(
      performOperation({ token: 'installation-token', operation, fetchImpl })
    ).resolves.toEqual({ id: 99 });
    const [, request] = fetchImpl.mock.calls[0];
    expect(request.body).toBe(JSON.stringify({ body: 'Useful result.' }));
    expect(request.headers.Authorization).toBe('Bearer installation-token');
  });
});
