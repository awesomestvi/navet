import { afterEach, describe, expect, it, vi } from 'vitest';
import { invalidateAuthorizedProvider } from '../device-authorization';

describe('provider revocation errors', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the permissions guidance returned by the installation', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: 'Use your primary device to disconnect this provider.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        )
    );

    await expect(invalidateAuthorizedProvider('openhab')).rejects.toThrow(
      'Use your primary device to disconnect this provider.'
    );
  });

  it.each(['Bad Gateway', 'null', '{"error":42}'])(
    'keeps a useful fallback for malformed errors: %s',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 502 })));

      await expect(invalidateAuthorizedProvider('openhab')).rejects.toThrow(
        'Navet could not revoke this provider from other devices.'
      );
    }
  );

  it.each([200, 404, 405])(
    'allows logout when revocation succeeds or is unsupported: %s',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));

      await expect(invalidateAuthorizedProvider('openhab')).resolves.toBeUndefined();
    }
  );
});
