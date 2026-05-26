import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createViteAuthSessionStore } from '@scripts/vite-auth-session-store';
import { describe, expect, it } from 'vitest';

const AUTH_DATA = {
  hassUrl: 'https://ha.example.com',
  clientId: 'http://localhost:5173/',
  expires: Date.now() + 60_000,
  refresh_token: 'refresh-token',
  access_token: 'access-token',
  expires_in: 3600,
};

describe('vite auth session store', () => {
  it('restores a persisted auth session from disk', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'navet-auth-store-'));
    const sessionFilePath = join(tempDir, 'navet-auth-session.json');

    createViteAuthSessionStore(sessionFilePath).saveAuthSession(AUTH_DATA);

    const restored = createViteAuthSessionStore(sessionFilePath);
    expect(restored.getAuthSession()).toEqual(AUTH_DATA);
    expect(JSON.parse(readFileSync(sessionFilePath, 'utf8'))).toEqual(AUTH_DATA);
  });

  it('ignores malformed persisted session files', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'navet-auth-store-'));
    const sessionFilePath = join(tempDir, 'navet-auth-session.json');

    createViteAuthSessionStore(sessionFilePath);
    writeFileSync(sessionFilePath, JSON.stringify({ hassUrl: 'notaurl' }), 'utf8');

    const restored = createViteAuthSessionStore(sessionFilePath);
    expect(restored.getAuthSession()).toBeNull();
  });

  it('clears the persisted auth session', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'navet-auth-store-'));
    const sessionFilePath = join(tempDir, 'navet-auth-session.json');

    const store = createViteAuthSessionStore(sessionFilePath);
    store.saveAuthSession(AUTH_DATA);
    store.clearAuthSession();

    expect(store.getAuthSession()).toBeNull();
    expect(createViteAuthSessionStore(sessionFilePath).getAuthSession()).toBeNull();
  });
});
