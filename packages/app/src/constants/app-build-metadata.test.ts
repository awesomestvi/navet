import {
  APP_BUILD_METADATA,
  getAppBuildChannelLabel,
  getAppReleaseBadgeLabel,
  isAppPreV1,
  isDevOrLocalBuild,
} from '@navet/app/constants/app-build-metadata';
import { APP_VERSION } from '@navet/app/constants/app-version';
import { DASHBOARD_CONFIG_VERSION } from '@navet/app/constants/dashboard-config-version';
import { describe, expect, it } from 'vitest';

describe('APP_BUILD_METADATA', () => {
  it('exposes the injected build metadata constants', () => {
    expect(APP_BUILD_METADATA).toEqual({
      gitSha: 'test-sha',
      gitShaShort: 'test-sh',
      buildDate: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'development',
      buildVersion: APP_VERSION,
      dashboardConfigVersion: DASHBOARD_CONFIG_VERSION,
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

  it('keeps the development build label when the injected release channel is development', () => {
    expect(getAppBuildChannelLabel('1.0.0')).toBe('Dev');
  });

  it('detects development and local build channels', () => {
    expect(isDevOrLocalBuild('development')).toBe(true);
    expect(isDevOrLocalBuild('dev')).toBe(true);
    expect(isDevOrLocalBuild('local')).toBe(true);
    expect(isDevOrLocalBuild('beta')).toBe(false);
    expect(isDevOrLocalBuild('stable')).toBe(false);
  });
});
