import { describe, expect, it } from 'vitest';
import { parseReleaseFragment, renderReleaseNotes } from './release-fragments.mjs';

describe('release fragments', () => {
  it('validates and renders user-facing fragments by category', () => {
    const fragments = [
      parseReleaseFragment(
        'type: new\naudiences: [standalone, home-assistant]\nsummary: Added room-scoped dashboard recovery.\n',
        '.changes/rooms.yaml'
      ),
      parseReleaseFragment(
        'type: fixed\naudiences: [standalone]\nsummary: Fixed blank media artwork fallbacks.\n',
        '.changes/media.yaml'
      ),
    ];

    expect(renderReleaseNotes(fragments)).toBe(
      '## New features\n\n- Added room-scoped dashboard recovery.\n\n## Improvements and bug fixes\n\n- Fixed blank media artwork fallbacks.\n'
    );
    expect(renderReleaseNotes(fragments, { audience: 'home-assistant' })).toBe(
      '## New features\n\n- Added room-scoped dashboard recovery.\n'
    );
  });

  it('requires explicit internal fragments for changes without release notes', () => {
    expect(
      parseReleaseFragment(
        'type: internal\naudiences: []\nsummary: Reworked release automation tests.\n',
        '.changes/release-tooling.yaml'
      )
    ).toMatchObject({ type: 'internal', audiences: [] });
  });

  it('rejects verbose or invalid fragments', () => {
    expect(() =>
      parseReleaseFragment(
        'type: fixed\naudiences: []\nsummary: Fixed something.\n',
        '.changes/invalid.yaml'
      )
    ).toThrow('must name at least one audience');
  });
});
