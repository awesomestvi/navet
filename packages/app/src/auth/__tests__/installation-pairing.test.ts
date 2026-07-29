import { beforeEach, describe, expect, it } from 'vitest';
import {
  captureInstallationPairingKeyFromFragment,
  clearInstallationPairingKey,
  getInstallationPairingHeaders,
  INSTALLATION_PAIRING_HEADER,
} from '../installation-pairing';

const INSTALLATION_KEY = 'a'.repeat(64);

describe('installation pairing fragment', () => {
  beforeEach(() => {
    clearInstallationPairingKey();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('captures a valid key into ephemeral module memory and removes it from the URL', () => {
    window.history.replaceState(
      { preserved: true },
      '',
      `/settings?provider=homey#navet_pairing=${INSTALLATION_KEY}&panel=kitchen`
    );

    expect(captureInstallationPairingKeyFromFragment()).toBe(true);
    expect(window.location.href).not.toContain('navet_pairing');
    expect(window.location.pathname).toBe('/settings');
    expect(window.location.search).toBe('?provider=homey');
    expect(window.location.hash).toBe('#panel=kitchen');
    expect(window.history.state).toEqual({ preserved: true });
    expect(getInstallationPairingHeaders()).toEqual({
      [INSTALLATION_PAIRING_HEADER]: INSTALLATION_KEY,
    });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('removes an invalid key without retaining or exposing it', () => {
    window.history.replaceState({}, '', '/#navet_pairing=not-a-valid-key');

    expect(captureInstallationPairingKeyFromFragment()).toBe(false);
    expect(window.location.hash).toBe('');
    expect(getInstallationPairingHeaders()).toEqual({});
  });

  it('zeroes the in-memory key after an accepted enrollment', () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();

    clearInstallationPairingKey();

    expect(getInstallationPairingHeaders()).toEqual({});
  });
});
