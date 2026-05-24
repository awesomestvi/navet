import { describe, expect, it } from 'vitest';
import { getMediaPlayerCapabilities } from '../media-player-features';

describe('getMediaPlayerCapabilities', () => {
  it.each([
    [
      'youtube cast player',
      119695,
      { canPlayMedia: true, canSeek: true, canSelectSoundMode: true },
    ],
    ['speaker group', 643983, { canGroup: true, canPlayMedia: true, canSeek: true }],
    [
      'spotify speaker',
      4127295,
      { canAnnounce: true, canBrowseMedia: true, canEnqueue: true, canSearchMedia: false },
    ],
    ['browse helper', 131072, { canBrowseMedia: true, canPlayMedia: false }],
    ['search helper', 4194304, { canSearchMedia: true, canPlayMedia: false }],
  ])('decodes live Home Assistant feature flags for %s', (_label, flags, expected) => {
    expect(getMediaPlayerCapabilities(flags)).toMatchObject(expected);
  });
});
