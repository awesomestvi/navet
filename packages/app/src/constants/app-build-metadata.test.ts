import {
  APP_BUILD_METADATA,
  getAppBuildChannelLabel,
  getAppReleaseBadgeLabel,
  isAppPreV1,
} from '@navet/app/constants/app-build-metadata';
import { describe, expect, it } from 'vitest';

describe('APP_BUILD_METADATA', () => {
  it('exposes the injected build metadata constants', () => {
    expect(APP_BUILD_METADATA).toEqual({
      gitSha: 'test-sha',
      gitShaShort: 'test-sh',
      buildDate: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'development',
      buildVersion: '0.7.0',
      dashboardConfigVersion: 3,
    });
  });

  it('treats pre-v1 builds as beta even on the development channel', () => {
    expect(getAppReleaseBadgeLabel()).toBe('Beta');
  });

  it('detects versions before 1.0.0 as beta lifecycle builds', () => {
    expect(isAppPreV1('0.6.1')).toBe(true);
    expect(isAppPreV1('0.9.0-rc.1')).toBe(true);
    expect(isAppPreV1('1.0.0')).toBe(false);
    expect(isAppPreV1('1.2.3-beta.1')).toBe(false);
  });

  it('maps development-style channels to the dev build label', () => {
    expect(getAppBuildChannelLabel()).toBe('Dev');
  });

  it('uses stable as the fallback build label for stable versions', () => {
    expect(getAppBuildChannelLabel('1.0.0')).toBe('Stable');
  });
});
