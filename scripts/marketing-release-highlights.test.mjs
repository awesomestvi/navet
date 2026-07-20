import { describe, expect, it } from 'vitest';
import { getMarketingReleaseHighlights } from './marketing-release-highlights.mjs';

const changelog = `# Changelog

## 1.2.0 - 2026-07-20

## New features

- Added a new dashboard.

## Improvements and bug fixes

- Improved room controls.
- Fixed stale release content.
- A fourth item that should not be shown.

## Security

- Closed a security issue.

## 1.1.0 - 2026-07-01

## Improvements and bug fixes

- Older release content.
`;

describe('getMarketingReleaseHighlights', () => {
  it('uses the requested release section and limits the marketing card to three highlights', () => {
    expect(getMarketingReleaseHighlights(changelog, '1.2.0')).toEqual([
      {
        type: 'New',
        description: 'Added a new dashboard.',
      },
      {
        type: 'Improved',
        description: 'Improved room controls.',
      },
      {
        type: 'Fixed',
        description: 'Fixed stale release content.',
      },
    ]);
  });

  it('fails instead of silently showing stale content when the release is missing', () => {
    expect(() => getMarketingReleaseHighlights(changelog, '1.3.0')).toThrow(
      'CHANGELOG.md does not contain release highlights for 1.3.0.'
    );
  });
});
