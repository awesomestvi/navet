import navetLogo from '@assets/public/logo.svg';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Pencil,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import '../oauth-redirect.css';

export const NAVET_SPOTIFY_OAUTH_RELAY_URI = 'https://navet.app/redirect/oauth';
const INSTANCE_STORAGE_KEY = 'navet-oauth-relay-instance';
const HOME_STORAGE_KEY = 'navet-oauth-relay-home';
const NAVET_SPOTIFY_CALLBACK_PATH = '/__navet_music__/spotify/callback';
const NAVET_ISSUES_URL = 'https://github.com/awesomestvi/navet/issues/new';

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isLocalNavetHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized === '::1' ||
    (normalized.includes(':') &&
      (normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:'))) ||
    isPrivateIpv4(normalized)
  );
}

export function isValidNavetCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password &&
      isLocalNavetHostname(url.hostname) &&
      url.pathname.endsWith(NAVET_SPOTIFY_CALLBACK_PATH)
    );
  } catch {
    return false;
  }
}

export function isValidSpotifyAuthorizeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const state = url.searchParams.get('state');
    return (
      url.origin === 'https://accounts.spotify.com' &&
      url.pathname === '/authorize' &&
      url.searchParams.get('redirect_uri') === NAVET_SPOTIFY_OAUTH_RELAY_URI &&
      Boolean(state && state.length <= 512)
    );
  } catch {
    return false;
  }
}

export function getSpotifyAuthorizeState(value: string): string | null {
  if (!isValidSpotifyAuthorizeUrl(value)) return null;
  const state = new URL(value).searchParams.get('state');
  return state && state.length <= 512 ? state : null;
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

export function buildStoredNavetCallbackUrl(storedRequest: string, search: string): string | null {
  try {
    const request = JSON.parse(storedRequest) as { callback?: unknown; state?: unknown };
    const returnedState = new URLSearchParams(search).get('state');
    if (
      typeof request.callback !== 'string' ||
      typeof request.state !== 'string' ||
      returnedState !== request.state
    ) {
      return null;
    }
    return buildNavetCallbackUrl(request.callback, search);
  } catch {
    return null;
  }
}

export function normalizeNavetHomeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function getNavetHomeUrlFromCallback(callbackUrl: string): string | null {
  if (!isValidNavetCallbackUrl(callbackUrl)) return null;
  const url = new URL(callbackUrl);
  url.pathname = url.pathname.slice(0, -NAVET_SPOTIFY_CALLBACK_PATH.length) || '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function NavetOAuthRedirectPage() {
  const storedHomeUrl = window.localStorage.getItem(HOME_STORAGE_KEY) ?? '';
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [homeUrl, setHomeUrl] = useState(storedHomeUrl);
  const [homeDraft, setHomeDraft] = useState(storedHomeUrl);
  const [homeError, setHomeError] = useState('');
  const [isEditingHome, setIsEditingHome] = useState(!storedHomeUrl);
  const startParams = useMemo(
    () => new URLSearchParams(window.location.hash.replace(/^#/, '')),
    []
  );
  const instance = startParams.get('instance');
  const authorize = startParams.get('authorize');
  const isStartRequest = instance !== null || authorize !== null;

  useEffect(() => {
    document.title = 'Connect Spotify · Navet';

    if (!instance || !authorize) return;
    if (!isValidNavetCallbackUrl(instance) || !isValidSpotifyAuthorizeUrl(authorize)) return;
    const state = getSpotifyAuthorizeState(authorize);
    if (!state) return;
    window.sessionStorage.setItem(INSTANCE_STORAGE_KEY, JSON.stringify({ callback: instance, state }));
    const navetHomeUrl = getNavetHomeUrlFromCallback(instance);
    if (navetHomeUrl) window.localStorage.setItem(HOME_STORAGE_KEY, navetHomeUrl);
    window.location.replace(authorize);
  }, [authorize, instance]);

  const storedRequest = window.sessionStorage.getItem(INSTANCE_STORAGE_KEY);
  const callbackUrl = storedRequest
    ? buildStoredNavetCallbackUrl(storedRequest, window.location.search)
    : null;
  const invalidStart =
    isStartRequest &&
    (!instance ||
      !authorize ||
      !isValidNavetCallbackUrl(instance) ||
      !isValidSpotifyAuthorizeUrl(authorize));
  const heading = invalidStart
    ? 'Spotify connection couldn’t start'
    : callbackUrl
      ? 'Return to Navet'
      : isStartRequest
        ? 'Connecting to Spotify'
        : 'Spotify connection expired';
  const intro = invalidStart
    ? 'The authorization link is incomplete or no longer valid.'
    : callbackUrl
      ? 'Spotify approved the connection. Finish setup in the Navet dashboard that sent you here.'
      : isStartRequest
        ? 'Navet is handing you over to Spotify to approve the connection.'
        : 'Open Music in your Navet dashboard and choose Connect to start again.';

  return (
    <main className="navet-oauth-page">
      <section className="navet-oauth-shell" aria-labelledby="navet-oauth-title">
        <div className="navet-oauth-logo-wrap">
          <span className="navet-oauth-logo-glow" aria-hidden="true" />
          <img className="navet-oauth-logo" src={navetLogo} alt="" />
        </div>
        <div className="navet-oauth-divider" aria-hidden="true" />

        <h1 id="navet-oauth-title">{heading}</h1>
        <p className="navet-oauth-intro">{intro}</p>

        {invalidStart || callbackUrl || isStartRequest ? (
          <div className="navet-oauth-panel" aria-live="polite">
            {invalidStart ? (
              <StatusRow
                icon={<AlertCircle aria-hidden="true" />}
                title="Invalid authorization link"
                detail="Return to Navet, open Music, and choose Connect again."
                tone="danger"
              />
            ) : callbackUrl ? (
              <>
                <StatusRow
                  icon={<CheckCircle2 aria-hidden="true" />}
                  title="Spotify approved"
                  detail="Your Navet dashboard is ready to finish the connection."
                  tone="success"
                />
                <div className="navet-oauth-panel-divider" aria-hidden="true" />
                <a className="navet-oauth-action" href={callbackUrl}>
                  Return to Navet
                  <ArrowRight aria-hidden="true" />
                </a>
              </>
            ) : (
              <StatusRow
                icon={<LoaderCircle className="navet-oauth-spinner" aria-hidden="true" />}
                title="Opening Spotify"
                detail="You’ll return here automatically after approving the connection."
                tone="progress"
              />
            )}
          </div>
        ) : null}

        {!invalidStart && !callbackUrl && !isStartRequest ? (
          <div className="navet-oauth-instance-panel">
            {isEditingHome ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const normalizedHomeUrl = normalizeNavetHomeUrl(homeDraft);
                  if (!normalizedHomeUrl) {
                    setHomeError('Enter a valid http or https address.');
                    return;
                  }

                  window.localStorage.setItem(HOME_STORAGE_KEY, normalizedHomeUrl);
                  setHomeUrl(normalizedHomeUrl);
                  setHomeDraft(normalizedHomeUrl);
                  setHomeError('');
                  setIsEditingHome(false);
                }}
              >
                <label className="navet-oauth-instance-label" htmlFor="navet-instance-url">
                  Navet instance
                </label>
                <div className="navet-oauth-instance-input-row">
                  <input
                    id="navet-instance-url"
                    type="url"
                    value={homeDraft}
                    onChange={(event) => {
                      setHomeDraft(event.currentTarget.value);
                      setHomeError('');
                    }}
                    placeholder="http://navet.local:5200"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-describedby={homeError ? 'navet-instance-error' : undefined}
                  />
                  <button type="submit" className="navet-oauth-instance-save">
                    Save
                  </button>
                </div>
                {homeError ? (
                  <p id="navet-instance-error" className="navet-oauth-instance-error">
                    {homeError}
                  </p>
                ) : null}
                {homeUrl ? (
                  <button
                    type="button"
                    className="navet-oauth-instance-cancel"
                    onClick={() => {
                      setHomeDraft(homeUrl);
                      setHomeError('');
                      setIsEditingHome(false);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </form>
            ) : (
              <>
                <div className="navet-oauth-instance-summary">
                  <div>
                    <span className="navet-oauth-instance-label">Navet instance</span>
                    <a href={homeUrl}>{homeUrl}</a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingHome(true)}
                    aria-label="Edit Navet instance"
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                </div>
                <div className="navet-oauth-panel-divider" aria-hidden="true" />
                <a className="navet-oauth-action" href={homeUrl}>
                  Return to Navet
                  <ArrowRight aria-hidden="true" />
                </a>
              </>
            )}

            <button
              type="button"
              className="navet-oauth-secondary-action"
              onClick={() => {
                setCloseBlocked(false);
                window.close();
                window.setTimeout(() => setCloseBlocked(true), 200);
              }}
            >
              <X aria-hidden="true" />
              Close this tab
            </button>
            {closeBlocked ? (
              <p className="navet-oauth-close-message" role="status">
                Your browser couldn’t close this tab automatically. You can close it manually.
              </p>
            ) : null}
          </div>
        ) : null}

        <footer className="navet-oauth-footer">
          <p>
            <ShieldCheck aria-hidden="true" />
            <span>Your Navet address is saved in this browser. Credentials stay on your server.</span>
          </p>
          <nav aria-label="OAuth relay links">
            <a href="/">navet.app</a>
            <span aria-hidden="true">·</span>
            <a href={NAVET_ISSUES_URL}>Report a bug</a>
          </nav>
        </footer>
      </section>
    </main>
  );
}

function StatusRow({
  detail,
  icon,
  title,
  tone,
}: {
  detail: string;
  icon: React.ReactNode;
  title: string;
  tone: 'danger' | 'progress' | 'success';
}) {
  return (
    <div className="navet-oauth-state-row">
      <span className={`navet-oauth-state-icon navet-oauth-state-icon--${tone}`}>{icon}</span>
      <span className="navet-oauth-state-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
    </div>
  );
}
