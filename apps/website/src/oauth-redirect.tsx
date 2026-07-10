import { ArrowRight, CheckCircle2, Music2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export const NAVET_SPOTIFY_OAUTH_RELAY_URI = 'https://navet.app/redirect/oauth';
const INSTANCE_STORAGE_KEY = 'navet-oauth-relay-instance';
const NAVET_SPOTIFY_CALLBACK_PATH = '/__navet_music__/spotify/callback';

export function isValidNavetCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password &&
      url.pathname.endsWith(NAVET_SPOTIFY_CALLBACK_PATH)
    );
  } catch {
    return false;
  }
}

export function isValidSpotifyAuthorizeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://accounts.spotify.com' &&
      url.pathname === '/authorize' &&
      url.searchParams.get('redirect_uri') === NAVET_SPOTIFY_OAUTH_RELAY_URI
    );
  } catch {
    return false;
  }
}

export function buildNavetCallbackUrl(instanceUrl: string, search: string): string | null {
  if (!isValidNavetCallbackUrl(instanceUrl)) return null;
  const callback = new URL(instanceUrl);
  const oauthParams = new URLSearchParams(search);
  for (const key of ['code', 'state', 'error', 'error_description']) {
    const value = oauthParams.get(key);
    if (value) callback.searchParams.set(key, value);
  }
  return callback.toString();
}

export function NavetOAuthRedirectPage() {
  const startParams = useMemo(
    () => new URLSearchParams(window.location.hash.replace(/^#/, '')),
    []
  );
  const instance = startParams.get('instance');
  const authorize = startParams.get('authorize');
  const isStartRequest = instance !== null || authorize !== null;

  useEffect(() => {
    if (!instance || !authorize) return;
    if (!isValidNavetCallbackUrl(instance) || !isValidSpotifyAuthorizeUrl(authorize)) return;
    window.sessionStorage.setItem(INSTANCE_STORAGE_KEY, instance);
    window.location.replace(authorize);
  }, [authorize, instance]);

  const storedInstance = window.sessionStorage.getItem(INSTANCE_STORAGE_KEY);
  const callbackUrl = storedInstance
    ? buildNavetCallbackUrl(storedInstance, window.location.search)
    : null;
  const invalidStart = isStartRequest &&
    (!instance || !authorize || !isValidNavetCallbackUrl(instance) || !isValidSpotifyAuthorizeUrl(authorize));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c0d10] px-4 py-10 text-white">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#15161a] shadow-2xl shadow-black/40">
        <div className="h-1 bg-gradient-to-r from-[#ff7a1a] via-[#1db954] to-[#fa2d48]" />
        <div className="space-y-6 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1db954] text-white">
              <Music2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Navet OAuth relay
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                {callbackUrl ? 'Return to your Navet' : 'Connecting Spotify'}
              </h1>
            </div>
          </div>

          {invalidStart ? (
            <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
              This authorization link is invalid. Return to Navet and start Spotify setup again.
            </div>
          ) : callbackUrl ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1db954]" />
                <p className="text-sm leading-6 text-white/70">
                  Spotify returned the authorization response. Continue to the local Navet instance
                  that started this connection.
                </p>
              </div>
              <a
                href={callbackUrl}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1db954]"
              >
                Return to Navet
                <ArrowRight className="h-4 w-4" />
              </a>
            </>
          ) : isStartRequest ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/65">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#1db954]" />
              Opening Spotify securely…
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              This relay session has expired. Return to Navet and start Spotify setup again in the
              same browser tab.
            </div>
          )}

          <p className="text-xs leading-5 text-white/40">
            The local Navet address is stored only in this browser tab. Spotify credentials remain
            on your Navet server.
          </p>
        </div>
      </div>
    </main>
  );
}
