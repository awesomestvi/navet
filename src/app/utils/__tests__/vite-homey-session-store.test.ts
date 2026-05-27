import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createViteHomeySessionStore } from '@scripts/vite-homey-session-store';
import { describe, expect, it } from 'vitest';

const HOMEY_SESSION = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 60_000,
  userId: 'user-1',
  user: {
    id: 'user-1',
    name: 'Vishal',
    avatarUrl: 'https://images.example.com/vishal.png',
    email: 'vishal@example.com',
  },
  homeys: [
    {
      id: 'homey-1',
      name: 'Living Room Homey',
      localUrlSecure: 'https://homey.example.com',
    },
  ],
  selectedHomeyId: 'homey-1',
  homeyBaseUrl: 'https://homey.example.com',
  homeySessionToken: 'homey-session-token',
};

describe('vite Homey session store', () => {
  it('restores a persisted Homey session from disk', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'navet-homey-store-'));
    const sessionFilePath = join(tempDir, 'navet-homey-session.json');

    createViteHomeySessionStore(sessionFilePath).saveSession(HOMEY_SESSION);

    const restored = createViteHomeySessionStore(sessionFilePath);
    expect(restored.getSession()).toEqual(HOMEY_SESSION);
    expect(JSON.parse(readFileSync(sessionFilePath, 'utf8'))).toEqual(HOMEY_SESSION);
  });

  it('ignores malformed persisted Homey session files', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'navet-homey-store-'));
    const sessionFilePath = join(tempDir, 'navet-homey-session.json');

    createViteHomeySessionStore(sessionFilePath);
    writeFileSync(sessionFilePath, JSON.stringify({ homeys: [] }), 'utf8');

    const restored = createViteHomeySessionStore(sessionFilePath);
    expect(restored.getSession()).toBeNull();
  });
});
