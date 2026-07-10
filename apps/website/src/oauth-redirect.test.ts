import { describe, expect, it } from 'vitest';
import {
  buildNavetCallbackUrl,
  isValidNavetCallbackUrl,
  isValidSpotifyAuthorizeUrl,
  NAVET_SPOTIFY_OAUTH_RELAY_URI,
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
      isValidNavetCallbackUrl(
        'https://user:password@example.com/__navet_music__/spotify/callback'
      )
    ).toBe(false);
  });

  it('only forwards Spotify authorization requests using the Navet relay URI', () => {
    const authorize = new URL('https://accounts.spotify.com/authorize');
    authorize.searchParams.set('redirect_uri', NAVET_SPOTIFY_OAUTH_RELAY_URI);
    expect(isValidSpotifyAuthorizeUrl(authorize.toString())).toBe(true);

    authorize.searchParams.set('redirect_uri', 'https://attacker.example/callback');
    expect(isValidSpotifyAuthorizeUrl(authorize.toString())).toBe(false);
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
});
