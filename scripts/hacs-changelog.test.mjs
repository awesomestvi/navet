import { describe, expect, it } from 'vitest';
import { renderHacsChangelog } from './hacs-changelog.mjs';

describe('HACS changelog', () => {
  it('prepends the current release while preserving normalized history', () => {
    expect(
      renderHacsChangelog({
        releaseVersion: '0.18.0-beta.1',
        releaseDate: '2026-09-20',
        releaseNotes: '## Improvements and bug fixes\n\n- Fixed release metadata.',
        existingChangelog: '# Changelog\r\n\r\n## 0.17.1\r\n\r\n- Previous release.\r\n',
      })
    ).toBe(
      '# Changelog\n\n## 0.18.0-beta.1 (2026-09-20)\n\n## Improvements and bug fixes\n\n- Fixed release metadata.\n\n## 0.17.1\n\n- Previous release.\n'
    );
  });

  it('renders only the current release when no history exists', () => {
    expect(
      renderHacsChangelog({
        releaseVersion: '0.18.0',
        releaseDate: '2026-09-20',
        releaseNotes: '- Added release automation.',
      })
    ).toBe(
      '# Changelog\n\n## 0.18.0 (2026-09-20)\n\n- Added release automation.\n'
    );
  });
});
