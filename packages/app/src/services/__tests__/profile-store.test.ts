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

function createMockFs(
  files: Record<string, string>,
  profileMtime = new Date('2024-01-01T00:00:00.000Z')
) {
  const fileMap = new Map(Object.entries(files));

  return {
    statSync: vi.fn((path: string) => {
      const content = fileMap.get(path);
      if (content === undefined) {
        const error = new Error(`ENOENT: ${path}`);
        // @ts-expect-error test-only shape
        error.code = 'ENOENT';
        throw error;
      }

      return {
        size: content.length,
        mtimeMs: profileMtime.getTime(),
        mtime: profileMtime,
      };
    }),
    readFileSync: vi.fn((path: string) => {
      const content = fileMap.get(path);
      if (content === undefined) {
        const error = new Error(`ENOENT: ${path}`);
        // @ts-expect-error test-only shape
        error.code = 'ENOENT';
        throw error;
      }
      return content;
    }),
    writeFileSync: vi.fn((path: string, content: string) => {
      fileMap.set(path, content);
    }),
    unlinkSync: vi.fn((path: string) => {
      if (!fileMap.delete(path)) {
        const error = new Error(`ENOENT: ${path}`);
        // @ts-expect-error test-only shape
        error.code = 'ENOENT';
        throw error;
      }
    }),
    getFile: (path: string) => fileMap.get(path),
  };
}

afterEach(() => {
  profileStore.resetProfileStoreFsForTests();
  vi.restoreAllMocks();
});

describe('profile-store', () => {
  it('returns 204 with a persisted generation header when no profile exists', () => {
    const mockFs = createMockFs({});
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest();

    profileStore.readProfile(request);

    expect(request.headersOut['X-Navet-Profile-Generation']).toMatch(/^\d+-[a-z0-9]+$/);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/data/navet-dashboard-profile-generation.txt',
      expect.any(String),
      'utf8'
    );
    expect(request.return).toHaveBeenCalledWith(204);
  });

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
    const mockFs = createMockFs({
      '/data/navet-dashboard-profile.json': body,
      '/data/navet-dashboard-profile-generation.txt': 'generation-1',
    });
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest({
      headersIn: {
        'If-None-Match': `"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`,
      },
    });

    profileStore.readProfile(request);

    expect(request.headersOut.ETag).toBe(`"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`);
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
    expect(request.headersOut['X-Navet-Profile-Generation']).toBe('generation-1');
    expect(request.return).toHaveBeenCalledWith(304);
  });

  it('returns profile JSON with validators when the conditional request is stale', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const mockFs = createMockFs({
      '/data/navet-dashboard-profile.json': body,
      '/data/navet-dashboard-profile-generation.txt': 'generation-1',
    });
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest({
      headersIn: {
        'If-None-Match': '"older"',
      },
    });

    profileStore.readProfile(request);

    expect(request.return).toHaveBeenCalledWith(200, body);
    expect(request.headersOut.ETag).toBe(`"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`);
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
    expect(request.headersOut['X-Navet-Profile-Generation']).toBe('generation-1');
  });

  it('returns validators after successful writes', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const mockFs = createMockFs({
      '/data/navet-dashboard-profile-generation.txt': 'generation-1',
    });
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest({
      method: 'PUT',
      requestText: body,
    });

    profileStore.writeProfile(request);

    expect(mockFs.writeFileSync).toHaveBeenCalled();
    expect(request.headersOut.ETag).toBe(`"1704067200000-${body.length}-2024-01-01T00:00:00.000Z"`);
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
    expect(request.headersOut['X-Navet-Profile-Generation']).toBe('generation-1');
    expect(request.return).toHaveBeenCalledWith(
      200,
      JSON.stringify({ ok: true, updatedAt: '2024-01-01T00:00:00.000Z' })
    );
  });

  it('rejects stale conditional writes without replacing the profile', () => {
    const existingBody = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const nextBody = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:05:00.000Z',
    });
    const mockFs = createMockFs({
      '/data/navet-dashboard-profile.json': existingBody,
      '/data/navet-dashboard-profile-generation.txt': 'generation-1',
    });
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest({
      method: 'PUT',
      headersIn: {
        'If-Match': '"older"',
      },
      requestText: nextBody,
    });

    profileStore.writeProfile(request);

    expect(mockFs.getFile('/data/navet-dashboard-profile.json')).toBe(existingBody);
    expect(request.headersOut.ETag).toBe(
      `"1704067200000-${existingBody.length}-2024-01-01T00:00:00.000Z"`
    );
    expect(request.headersOut['Last-Modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
    expect(request.return).toHaveBeenCalledWith(
      412,
      JSON.stringify({ error: 'Dashboard profile changed before save' })
    );
  });

  it('rotates the generation and clears the profile on delete', () => {
    const body = JSON.stringify({
      version: 3,
      app: 'navet',
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
    const mockFs = createMockFs({
      '/data/navet-dashboard-profile.json': body,
      '/data/navet-dashboard-profile-generation.txt': 'generation-1',
    });
    profileStore.setProfileStoreFsForTests(mockFs);

    const request = createRequest({ method: 'DELETE' });

    profileStore.deleteProfile(request);

    expect(mockFs.unlinkSync).toHaveBeenCalledWith('/data/navet-dashboard-profile.json');
    expect(request.headersOut['X-Navet-Profile-Generation']).not.toBe('generation-1');
    expect(mockFs.getFile('/data/navet-dashboard-profile-generation.txt')).toBe(
      request.headersOut['X-Navet-Profile-Generation']
    );
    expect(request.return).toHaveBeenCalledWith(204);
  });

  it('routes unsupported methods through the handler', () => {
    const request = createRequest({ method: 'PATCH' });

    profileStore.handle(request);

    expect(request.headersOut.Allow).toBe('GET, PUT, DELETE');
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
