import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildDashboardProfileMetadata,
  createViteDashboardProfileStore,
} from '@scripts/vite-dashboard-profile-store';
import { afterEach, describe, expect, it } from 'vitest';

const PROFILE = {
  app: 'navet' as const,
  version: 3 as const,
  exportedAt: '2024-01-01T00:00:00.000Z',
};

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    createViteDashboardProfileStore(join(dir, 'profile.json')).clearProfile();
  }
});

describe('createViteDashboardProfileStore', () => {
  it('persists and restores a valid dashboard profile', () => {
    const dir = mkdtempSync(join(tmpdir(), 'navet-dashboard-profile-'));
    tempDirs.push(dir);
    const profileFilePath = join(dir, 'profile.json');

    createViteDashboardProfileStore(profileFilePath).saveProfile(PROFILE);

    const restored = createViteDashboardProfileStore(profileFilePath);

    expect(restored.getProfile()).toEqual(PROFILE);
    expect(restored.getSerializedProfile()).toBe(JSON.stringify(PROFILE));
    expect(restored.getProfileMetadata()).toEqual(
      expect.objectContaining({
        etag: expect.stringContaining(PROFILE.exportedAt),
        lastModified: expect.any(String),
      })
    );
  });

  it('ignores invalid persisted dashboard profile data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'navet-dashboard-profile-'));
    tempDirs.push(dir);
    const profileFilePath = join(dir, 'profile.json');

    writeFileSync(profileFilePath, JSON.stringify({ app: 'navet', version: 2 }), 'utf8');

    const restored = createViteDashboardProfileStore(profileFilePath);

    expect(restored.getProfile()).toBeNull();
    expect(restored.getSerializedProfile()).toBeNull();
    expect(restored.getProfileMetadata()).toBeNull();
  });

  it('builds stable metadata from file timestamps and exportedAt', () => {
    const serialized = JSON.stringify(PROFILE);

    expect(
      buildDashboardProfileMetadata(serialized, {
        mtimeMs: 1704067200000,
        mtime: new Date('2024-01-01T00:00:00.000Z'),
      })
    ).toEqual({
      etag: `"1704067200000-${serialized.length}-${PROFILE.exportedAt}"`,
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
    });
  });
});
