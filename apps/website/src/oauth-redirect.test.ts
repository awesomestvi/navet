import { describe, expect, it } from 'vitest';
import {
  buildNavetCallbackUrl,
  buildStoredNavetCallbackUrl,
  getSpotifyAuthorizeState,
  getNavetHomeUrlFromCallback,
  isValidNavetCallbackUrl,
  isValidSpotifyAuthorizeUrl,
  NAVET_SPOTIFY_OAUTH_RELAY_URI,
  normalizeNavetHomeUrl,
} from './oauth-redirect';

describe('Navet OAuth redirect relay', () => {
  it('accepts local Navet callbacks and rejects unrelated redirect targets', () => {
    expect(
      isValidNavetCallbackUrl(
        'http://192.168.1.20:5200/__navet_music__/spotify/callback'
      )
    ).toBe(true);
    expect(isValidNavetCallbackUrl('https://example.com/phishing')).toBe(false);
    expect(
      isValidNavetCallbackUrl('https://example.com/__navet_music__/spotify/callback')
    ).toBe(false);
    expect(
      isValidNavetCallbackUrl('http://172.20.0.2/__navet_music__/spotify/callback')
    ).toBe(true);
    expect(
      isValidNavetCallbackUrl('http://[fd00::20]/__navet_music__/spotify/callback')
    ).toBe(true);
    expect(
      isValidNavetCallbackUrl(
        'https://user:password@example.com/__navet_music__/spotify/callback'
      )
    ).toBe(false);
  });

  it('only forwards Spotify authorization requests using the Navet relay URI', () => {
    const authorize = new URL('https://accounts.spotify.com/authorize');
    authorize.searchParams.set('redirect_uri', NAVET_SPOTIFY_OAUTH_RELAY_URI);
    authorize.searchParams.set('state', 'expected-state');
    expect(isValidSpotifyAuthorizeUrl(authorize.toString())).toBe(true);
    expect(getSpotifyAuthorizeState(authorize.toString())).toBe('expected-state');

    authorize.searchParams.set('redirect_uri', 'https://attacker.example/callback');
    expect(isValidSpotifyAuthorizeUrl(authorize.toString())).toBe(false);
    expect(getSpotifyAuthorizeState(authorize.toString())).toBeNull();
  });

  it('forwards only OAuth response parameters to the stored local callback', () => {
    expect(
      buildNavetCallbackUrl(
        'http://navet.local:5200/__navet_music__/spotify/callback',
        '?code=spotify-code&state=expected-state&instance=https://attacker.example'
      )
    ).toBe(
      'http://navet.local:5200/__navet_music__/spotify/callback?code=spotify-code&state=expected-state'
    );
  });

  it('forwards an OAuth response only when its state matches the initiating tab', () => {
    const storedRequest = JSON.stringify({
      callback: 'http://navet.local:5200/__navet_music__/spotify/callback',
      state: 'expected-state',
    });

    expect(
      buildStoredNavetCallbackUrl(storedRequest, '?code=spotify-code&state=expected-state')
    ).toBe(
      'http://navet.local:5200/__navet_music__/spotify/callback?code=spotify-code&state=expected-state'
    );
    expect(
      buildStoredNavetCallbackUrl(storedRequest, '?code=spotify-code&state=attacker-state')
    ).toBeNull();
    expect(buildStoredNavetCallbackUrl('not-json', '?state=expected-state')).toBeNull();
  });

  it('derives and validates an editable Navet home address without weakening callback validation', () => {
    expect(
      getNavetHomeUrlFromCallback(
        'http://navet.local:5200/__navet_music__/spotify/callback'
      )
    ).toBe('http://navet.local:5200/');
    expect(normalizeNavetHomeUrl(' http://192.168.1.20:5200/dashboard?edit=true#music ')).toBe(
      'http://192.168.1.20:5200/dashboard'
    );
    expect(normalizeNavetHomeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeNavetHomeUrl('https://user:password@example.com')).toBeNull();
  });
});
