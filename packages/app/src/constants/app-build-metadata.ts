import { DASHBOARD_CONFIG_VERSION } from '@navet/app/constants/dashboard-config-version';

declare const __APP_GIT_SHA__: string;
declare const __APP_BUILD_DATE__: string;
declare const __APP_RELEASE_CHANNEL__: string;

const appGitSha = typeof __APP_GIT_SHA__ === 'string' ? __APP_GIT_SHA__ : 'local';
const appBuildDate =
  typeof __APP_BUILD_DATE__ === 'string' ? __APP_BUILD_DATE__ : new Date(0).toISOString();
const appReleaseChannel =
  typeof __APP_RELEASE_CHANNEL__ === 'string' ? __APP_RELEASE_CHANNEL__ : 'development';

export const APP_BUILD_METADATA = Object.freeze({
  gitSha: appGitSha,
  gitShaShort: appGitSha.slice(0, 7),
  buildDate: appBuildDate,
  releaseChannel: appReleaseChannel,
  dashboardConfigVersion: DASHBOARD_CONFIG_VERSION,
});

export function getAppReleaseBadgeLabel() {
  switch (APP_BUILD_METADATA.releaseChannel) {
    case 'edge':
      return 'Edge';
    case 'beta':
      return 'Beta';
    default:
      return null;
  }
}
