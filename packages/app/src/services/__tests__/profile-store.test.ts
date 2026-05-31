import profileStore from '@docker/njs/profile-store.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

function createRequest(
  overrides: Partial<{
    method: string;
    headersIn: Record<string, string>;
    requestText: string;
  }> = {}
) {
  return {
    method: 'GET',
    headersIn: {},
    headersOut: {} as Record<string, string>,
    requestText: '',
    return: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  profileStore.resetProfileStoreFsForTests();
  vi.restoreAllMocks();
});

describe('profile-store', () => {
  it('builds stable ETag and Last-Modified metadata for a saved profile', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const stat = {
      mtimeMs: 1704067200000,
      mtime: new Date('2024-01-01T00:00:00.000Z'),
    };
    const metadata = profileStore.buildProfileMetadata(body, stat);

    expect(metadata).toEqual({
      etag: `"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`,
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
    });
  });

  it('returns 304 for unchanged conditional reads', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const stat = {
      size: body.length,
      mtimeMs: 1704067200000,
      mtime: new Date('2024-01-01T00:00:00.000Z'),
    };
    profileStore.setProfileStoreFsForTests({
      statSync: vi.fn(() => stat),
      readFileSync: vi.fn(() => body),
      writeFileSync: vi.fn(),
    });

    const request = createRequest({
      headersIn: {
        'If-None-Match': `"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`,
      },
    });

    profileStore.readProfile(request);

    expect(request.headersOut.ETag).toBe(`"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`);
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
    expect(request.return).toHaveBeenCalledWith(304);
  });

  it('returns profile JSON with validators when the conditional request is stale', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const stat = {
      size: body.length,
      mtimeMs: 1704067200000,
      mtime: new Date('2024-01-01T00:00:00.000Z'),
    };
    profileStore.setProfileStoreFsForTests({
      statSync: vi.fn(() => stat),
      readFileSync: vi.fn(() => body),
      writeFileSync: vi.fn(),
    });

    const request = createRequest({
      headersIn: {
        'If-None-Match': '"older"',
      },
    });

    profileStore.readProfile(request);

    expect(request.return).toHaveBeenCalledWith(200, body);
    expect(request.headersOut.ETag).toBe(`"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`);
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
  });

  it('returns validators after successful writes', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const stat = {
      size: body.length,
      mtimeMs: 1704067200000,
      mtime: new Date('2024-01-01T00:00:00.000Z'),
    };
    const mockFs = {
      statSync: vi.fn(() => stat),
      readFileSync: vi.fn(() => body),
      writeFileSync: vi.fn(),
    };
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest({
      method: 'PUT',
      requestText: body,
    });

    profileStore.writeProfile(request);

    expect(mockFs.writeFileSync).toHaveBeenCalled();
    expect(request.headersOut.ETag).toBe(`"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`);
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
    expect(request.return).toHaveBeenCalledWith(
      200,
      JSON.stringify({ ok: true, updatedAt: '2024-01-01T00:00:00.000Z' })
    );
  });

  it('routes unsupported methods through the handler', () => {
    const request = createRequest({ method: 'PATCH' });

    profileStore.handle(request);

    expect(request.headersOut.Allow).toBe('GET, PUT');
    expect(request.return).toHaveBeenCalledWith(
      405,
      JSON.stringify({ error: 'Method not allowed' })
    );
  });

  it('checks freshness from Last-Modified when ETag is unavailable', () => {
    expect(
      profileStore.isProfileFresh(
        createRequest({
          headersIn: {
            'If-Modified-Since': 'Mon, 01 Jan 2024 00:00:00 GMT',
          },
        }),
        {
          etag: '"etag"',
          lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
        }
      )
    ).toBe(true);
  });
});
