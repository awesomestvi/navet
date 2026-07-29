// @ts-expect-error Docker njs runtime modules are JavaScript and have no TypeScript declaration.
import njsCookieScope from '@docker/njs/installation-cookie-scope.js';
import { createInstallationCookieNames } from '@scripts/installation-cookie-scope';
import { describe, expect, it } from 'vitest';

describe('installation cookie scope parity', () => {
  it('derives the same stable opaque namespace in njs and Vite', () => {
    const installationKey = '1'.repeat(64);
    const viteNames = createInstallationCookieNames('navet_auth_session', installationKey);
    const njsNames = njsCookieScope.createInstallationCookieNames('navet_auth_session', {
      installationKey,
    });

    expect(viteNames).toEqual(njsNames);
    expect(viteNames).toEqual({
      currentName: expect.stringMatching(/^navet_auth_session_[a-f0-9]{24}$/),
      legacyName: 'navet_auth_session',
      scoped: true,
    });
    expect(
      createInstallationCookieNames('navet_auth_session', '2'.repeat(64)).currentName
    ).not.toBe(viteNames.currentName);
  });

  it('keeps the legacy name when no installation key exists', () => {
    expect(createInstallationCookieNames('navet_profile_client')).toEqual({
      currentName: 'navet_profile_client',
      legacyName: 'navet_profile_client',
      scoped: false,
    });
  });
});
