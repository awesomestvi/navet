import {
  APP_BUILD_METADATA,
  getAppReleaseBadgeLabel,
} from '@navet/app/constants/app-build-metadata';
import { describe, expect, it } from 'vitest';

describe('APP_BUILD_METADATA', () => {
  it('exposes the injected build metadata constants', () => {
    expect(APP_BUILD_METADATA).toEqual({
      gitSha: 'test-sha',
      gitShaShort: 'test-sh',
      buildDate: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'development',
      dashboardConfigVersion: 3,
    });
  });

  it('does not show a release badge for stable or development builds', () => {
    expect(getAppReleaseBadgeLabel()).toBeNull();
  });
});
