import providerSessionModule from './provider-session-store.js';
import installationAuthorityModule from './installation-authority.js';

const createProviderSessionStore = providerSessionModule.createProviderSessionStore;
const getHeader = providerSessionModule.getHeader;
const getRequestOrigin = providerSessionModule.getRequestOrigin;
const isStrictSameOriginMutation = providerSessionModule.isStrictSameOriginMutation;
const isSessionRecordTooLargeError =
  providerSessionModule.isSessionRecordTooLargeError;
const isSessionCapacityError = providerSessionModule.isSessionCapacityError;
const secureRandomHex = providerSessionModule.secureRandomHex;
const SESSION_CAPACITY_ERROR_CODE =
  providerSessionModule.SESSION_CAPACITY_ERROR_CODE;
const SESSION_CAPACITY_STATUS =
  providerSessionModule.SESSION_CAPACITY_STATUS;
const SESSION_RECORD_TOO_LARGE_ERROR_CODE =
  providerSessionModule.SESSION_RECORD_TOO_LARGE_ERROR_CODE;
const SESSION_RECORD_TOO_LARGE_STATUS =
  providerSessionModule.SESSION_RECORD_TOO_LARGE_STATUS;

const MAX_HOMEY_RECORD_BYTES = 32 * 1024;
const PROVIDER_SESSION_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const HOMEY_COOKIE_NAME = 'navet_homey_session';
const HOMEY_SESSIONS_DIRECTORY = '/data/navet-provider-sessions/homey';
const LEGACY_HOMEY_PATH = '/data/navet-homey-session.json';
const ATHOM_API_BASE_URL = 'https://api.athom.com';
const DEFAULT_HOMEY_CALLBACK_PATH = '/__navet_homey__/callback';
const HOMEY_OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;
const HOMEY_OAUTH_CALLBACK_PARAM = 'homey_oauth_callback';
const HOMEY_OAUTH_ERROR_PARAM = 'homey_oauth_error';
const HOMEY_OAUTH_ERROR_CODES = {
  access_denied: true,
  callback_incomplete: true,
  invalid_response: true,
  not_authorized: true,
  session_changed: true,
  temporarily_unavailable: true,
};

function normalizeIngressPath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  const normalized = trimmed.replace(/\/+$/, '');
  return normalized.startsWith('/') ? normalized : '';
}

function joinPath(basePath, suffix) {
  const normalizedBase = normalizeIngressPath(basePath);
  const normalizedSuffix = String(suffix || '').startsWith('/')
    ? String(suffix || '')
    : '/' + String(suffix || '');

  return normalizedBase ? normalizedBase + normalizedSuffix : normalizedSuffix;
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendSessionStoreError(r, error) {
  let code;
  let status;
  if (isSessionRecordTooLargeError(error)) {
    code = SESSION_RECORD_TOO_LARGE_ERROR_CODE;
    status = SESSION_RECORD_TOO_LARGE_STATUS;
  } else if (isSessionCapacityError(error)) {
    code = SESSION_CAPACITY_ERROR_CODE;
    status = SESSION_CAPACITY_STATUS;
  } else {
    return false;
  }
  sendJson(r, status, {
    error: error.message,
    code: code,
  });
  return true;
}

function sendRedirect(r, location) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(302, location);
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(204);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function isValidHomey(homey) {
  return (
    homey &&
    typeof homey.id === 'string' &&
    homey.id.length > 0 &&
    typeof homey.name === 'string' &&
    homey.name.length > 0
  );
}

function isValidHomeyUser(user) {
  return (
    user &&
    typeof user.name === 'string' &&
    user.name.length > 0 &&
    (user.id == null || typeof user.id === 'string') &&
    (user.avatarUrl == null || typeof user.avatarUrl === 'string') &&
    (user.email == null || typeof user.email === 'string') &&
    (user.is_owner == null || typeof user.is_owner === 'boolean') &&
    (user.is_admin == null || typeof user.is_admin === 'boolean')
  );
}

function isValidHomeySession(value) {
  return (
    value &&
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.length > 0 &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    (value.user == null || isValidHomeyUser(value.user)) &&
    Array.isArray(value.homeys) &&
    value.homeys.every(isValidHomey) &&
    (value.selectedHomeyId == null || typeof value.selectedHomeyId === 'string') &&
    (value.homeyBaseUrl == null || /^https?:\/\//.test(value.homeyBaseUrl)) &&
    (value.homeySessionToken == null || typeof value.homeySessionToken === 'string') &&
    (value.userId == null || typeof value.userId === 'string')
  );
}

function isValidPendingOAuth(value) {
  return (
    value &&
    typeof value.state === 'string' &&
    /^[a-f0-9]{64}$/.test(value.state) &&
    typeof value.returnTo === 'string' &&
    value.returnTo.startsWith('/') &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt)
  );
}

function isValidStoredHomeySession(value) {
  return (
    value &&
    value.version === 1 &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    (value.auth === null || isValidHomeySession(value.auth)) &&
    (value.pending === null || isValidPendingOAuth(value.pending))
  );
}

function createEmptyHomeySession() {
  const now = Date.now();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    auth: null,
    pending: null,
  };
}

function cloneRecord(record, overrides) {
  return {
    version: record.version,
    createdAt: record.createdAt,
    updatedAt:
      Object.prototype.hasOwnProperty.call(overrides, 'updatedAt')
        ? overrides.updatedAt
        : record.updatedAt,
    auth: Object.prototype.hasOwnProperty.call(overrides, 'auth')
      ? overrides.auth
      : record.auth,
    pending: Object.prototype.hasOwnProperty.call(overrides, 'pending')
      ? overrides.pending
      : record.pending,
  };
}

function sanitizeSession(session) {
  return {
    userId: session.userId || null,
    user: session.user || null,
    homeys: session.homeys,
    selectedHomeyId: session.selectedHomeyId || null,
    homeyBaseUrl: session.homeyBaseUrl || null,
    hasActiveHomeySession: Boolean(session.homeySessionToken),
  };
}

function getHomeyUserName(user) {
  const first = typeof user.firstname === 'string' ? user.firstname.trim() : '';
  const last = typeof user.lastname === 'string' ? user.lastname.trim() : '';
  const fullName = (first + ' ' + last).trim();
  return (
    fullName ||
    (typeof user.name === 'string' && user.name.trim()) ||
    user.email ||
    'Homey User'
  );
}

function getHomeyUserAvatarUrl(user) {
  const candidates = [user.avatarUrl, user.imageUrl, user.avatar, user.image, user.gravatar];
  let index;

  for (index = 0; index < candidates.length; index += 1) {
    if (typeof candidates[index] === 'string' && candidates[index].trim()) {
      return candidates[index].trim();
    }
  }

  return null;
}

function getOAuthConfig(r) {
  const ingressPath = normalizeIngressPath(r.headersIn['X-Ingress-Path']);
  const clientId = process.env.NAVET_HOMEY_CLIENT_ID || '';
  const clientSecret = process.env.NAVET_HOMEY_CLIENT_SECRET || '';
  const configuredRedirectUri = process.env.NAVET_HOMEY_REDIRECT_URI || '';
  const redirectUri =
    configuredRedirectUri ||
    getRequestOrigin(r) + joinPath(ingressPath, DEFAULT_HOMEY_CALLBACK_PATH);
  const callbackPath = getCallbackPath(redirectUri, ingressPath);

  return {
    clientId,
    clientSecret,
    redirectUri,
    callbackPath,
    ingressPath,
  };
}

function getCallbackPath(redirectUri, ingressPath) {
  // The njs 0.8.10 engine does not expose the browser URL constructor. Parse
  // only the absolute HTTP(S) shape accepted for OAuth redirect URIs and keep
  // the path encoded exactly as configured.
  const match = /^https?:\/\/[^/?#\s]+(\/[^?#\s]*)?(?:[?#].*)?$/i.exec(
    String(redirectUri || '').trim()
  );
  const pathname = match && match[1] ? match[1].trim() : '/';
  if (
    !match ||
    !pathname ||
    pathname.indexOf('//') === 0 ||
    pathname.indexOf('\\') !== -1 ||
    /[\u0000-\u001f\u007f]/.test(pathname)
  ) {
    return DEFAULT_HOMEY_CALLBACK_PATH;
  }

  if (
    ingressPath &&
    (pathname === ingressPath || pathname.indexOf(ingressPath + '/') === 0)
  ) {
    const localPath = pathname.slice(ingressPath.length);
    return localPath || DEFAULT_HOMEY_CALLBACK_PATH;
  }

  return pathname === '/' ? DEFAULT_HOMEY_CALLBACK_PATH : pathname;
}

function getNavetReturnPath(oauth) {
  return joinPath(oauth.ingressPath, '/');
}

function getDecodedQueryKey(value) {
  const separator = value.indexOf('=');
  const key = separator === -1 ? value : value.slice(0, separator);
  try {
    return decodeURIComponent(key.replace(/\+/g, ' '));
  } catch (_error) {
    return key;
  }
}

function removeOAuthQueryParams(query) {
  const retained = [];
  const entries = String(query || '').split('&');
  let index;
  for (index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const key = getDecodedQueryKey(entry);
    if (
      entry &&
      key !== HOMEY_OAUTH_CALLBACK_PARAM &&
      key !== HOMEY_OAUTH_ERROR_PARAM &&
      key !== 'code' &&
      key !== 'state'
    ) {
      retained.push(entry);
    }
  }
  return retained.join('&');
}

function normalizeReturnTo(value, oauth) {
  const fallback = getNavetReturnPath(oauth);
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    /[\u0000-\u001f\u007f\\]/.test(candidate)
  ) {
    return fallback;
  }

  const pathEnd = candidate.search(/[?#]/);
  const rawPath = pathEnd === -1 ? candidate : candidate.slice(0, pathEnd);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch (_error) {
    return fallback;
  }
  if (
    decodedPath.startsWith('//') ||
    decodedPath.includes('\\') ||
    (oauth.ingressPath &&
      decodedPath !== oauth.ingressPath &&
      decodedPath.indexOf(oauth.ingressPath + '/') !== 0)
  ) {
    return fallback;
  }

  const hashIndex = candidate.indexOf('#');
  const hash = hashIndex === -1 ? '' : candidate.slice(hashIndex);
  const pathAndQuery = hashIndex === -1 ? candidate : candidate.slice(0, hashIndex);
  const queryIndex = pathAndQuery.indexOf('?');
  const pathname = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : pathAndQuery.slice(queryIndex + 1);
  const retainedQuery = removeOAuthQueryParams(query);
  return pathname + (retainedQuery ? '?' + retainedQuery : '') + hash;
}

function appendOAuthMarker(returnTo, oauth, name, value) {
  const normalized = normalizeReturnTo(returnTo, oauth);
  const hashIndex = normalized.indexOf('#');
  const hash = hashIndex === -1 ? '' : normalized.slice(hashIndex);
  const pathAndQuery = hashIndex === -1 ? normalized : normalized.slice(0, hashIndex);
  const separator = pathAndQuery.includes('?') ? '&' : '?';
  return pathAndQuery + separator + name + '=' + value + hash;
}

function appendOAuthCallbackMarker(returnTo, oauth) {
  return appendOAuthMarker(returnTo, oauth, HOMEY_OAUTH_CALLBACK_PARAM, '1');
}

function appendOAuthErrorMarker(returnTo, oauth, errorCode) {
  const safeErrorCode = Object.prototype.hasOwnProperty.call(
    HOMEY_OAUTH_ERROR_CODES,
    errorCode
  )
    ? errorCode
    : 'temporarily_unavailable';
  return appendOAuthMarker(returnTo, oauth, HOMEY_OAUTH_ERROR_PARAM, safeErrorCode);
}

function encodeClientCredentials(clientId, clientSecret) {
  return Buffer.from(clientId + ':' + clientSecret).toString('base64');
}

function getHomeyBaseUrlCandidates(homey) {
  const source = [homey.localUrlSecure, homey.localUrl, homey.remoteUrl];
  const candidates = [];
  let index;

  for (index = 0; index < source.length; index += 1) {
    const value = source[index];
    if (!value) {
      continue;
    }

    if (candidates.indexOf(value) === -1) {
      candidates.push(value);
    }
  }

  return candidates;
}

function cloneWithOverrides(source, overrides) {
  const next = {};
  let key;

  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      next[key] = source[key];
    }
  }

  for (key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      next[key] = overrides[key];
    }
  }

  return next;
}

function isValidOAuthToken(token) {
  const expiresIn = Number(token && token.expires_in);
  return Boolean(
    token &&
      typeof token.access_token === 'string' &&
      token.access_token.length > 0 &&
      typeof token.refresh_token === 'string' &&
      token.refresh_token.length > 0 &&
      Number.isFinite(expiresIn) &&
      expiresIn > 0
  );
}

function normalizeHomeyRefreshToken(token, currentRefreshToken) {
  const rawExpiresIn = token && token.expires_in;
  const expiresIn =
    typeof rawExpiresIn === 'number' ||
    (typeof rawExpiresIn === 'string' && rawExpiresIn.trim())
      ? Number(rawExpiresIn)
      : NaN;
  const accessToken =
    token && typeof token.access_token === 'string'
      ? token.access_token.trim()
      : '';
  const refreshToken =
    token && typeof token.refresh_token === 'string' && token.refresh_token.trim()
      ? token.refresh_token.trim()
      : typeof currentRefreshToken === 'string'
        ? currentRefreshToken.trim()
        : '';
  if (
    !accessToken ||
    !refreshToken ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0 ||
    !Number.isFinite(Date.now() + expiresIn * 1000)
  ) {
    return null;
  }
  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresIn: expiresIn,
  };
}

function getOAuthCallbackSession(bindingStore, r, state) {
  const contexts = bindingStore.getRequestSessions(r);
  let index;
  for (index = 0; index < contexts.length; index += 1) {
    if (
      contexts[index].session.pending &&
      contexts[index].session.pending.state === state
    ) {
      return contexts[index];
    }
  }
  return null;
}

async function refreshAccessToken(r, session, fetchImpl, persistSession) {
  if (session.expiresAt > Date.now() + 30000) {
    return session;
  }

  const oauth = getOAuthConfig(r);
  if (!oauth.clientId || !oauth.clientSecret) {
    throw new Error('Homey OAuth credentials are not configured');
  }

  const response = await fetchImpl(ATHOM_API_BASE_URL + '/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + encodeClientCredentials(oauth.clientId, oauth.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:
      'grant_type=refresh_token&refresh_token=' + encodeURIComponent(session.refreshToken),
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error('Unable to refresh Homey OAuth token');
    error.confirmedInvalid = Boolean(payload && payload.error === 'invalid_grant');
    throw error;
  }

  const tokenPayload = await response.json();
  const token = normalizeHomeyRefreshToken(tokenPayload, session.refreshToken);
  if (!token) {
    throw new Error('Homey OAuth refresh returned an invalid token');
  }
  const nextSession = cloneWithOverrides(session, {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: Date.now() + token.expiresIn * 1000,
  });
  persistSession(nextSession);
  return nextSession;
}

async function loadAuthenticatedUser(accessToken, fetchImpl) {
  const response = await fetchImpl(ATHOM_API_BASE_URL + '/user/me', {
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load Homey account');
  }

  return await response.json();
}

async function createHomeySession(accessToken, homey, fetchImpl) {
  const homeyBaseUrls = getHomeyBaseUrlCandidates(homey);
  if (homeyBaseUrls.length === 0) {
    throw new Error('The selected Homey has no usable URL');
  }

  const delegationResponse = await fetchImpl(
    ATHOM_API_BASE_URL + '/delegation/token?audience=homey',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    }
  );

  if (!delegationResponse.ok) {
    throw new Error('Unable to create Homey delegation token');
  }

  const delegationResponseText = await delegationResponse.text();
  const delegationToken = parseJson(delegationResponseText);
  let index;
  let lastError = null;

  for (index = 0; index < homeyBaseUrls.length; index += 1) {
    const homeyBaseUrl = homeyBaseUrls[index];

    try {
      const sessionResponse = await fetchImpl(homeyBaseUrl + '/api/manager/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: delegationToken }),
      });

      if (!sessionResponse.ok) {
        lastError = new Error('Unable to create Homey session');
        continue;
      }

      const sessionResponseText = await sessionResponse.text();
      const homeySessionToken = parseJson(sessionResponseText);
      return {
        homeyBaseUrl: homeyBaseUrl,
        homeySessionToken: homeySessionToken,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to create Homey session');
}

function createHomeySessionStore(options) {
  const settings = options || {};
  const fetchImpl =
    settings.fetch ||
    (typeof ngx !== 'undefined' && ngx && typeof ngx.fetch === 'function'
      ? ngx.fetch.bind(ngx)
      : null);
  const bindingStore = createProviderSessionStore({
    cookieName: HOMEY_COOKIE_NAME,
    cookieNames: settings.cookieNames,
    installationKey: settings.installationKey,
    keyPath: settings.keyPath,
    sessionsDirectory: settings.sessionsDirectory || HOMEY_SESSIONS_DIRECTORY,
    legacySessionPath: settings.legacySessionPath || LEGACY_HOMEY_PATH,
    maxRecordBytes: MAX_HOMEY_RECORD_BYTES,
    createRecord: createEmptyHomeySession,
    isValidRecord: isValidStoredHomeySession,
  });
  const installationAuthority =
    settings.installationAuthority || installationAuthorityModule;

  async function handleAuthorize(r) {
    if (r.method !== 'POST') {
      r.headersOut.Allow = 'POST';
      sendJson(r, 405, { error: 'Method not allowed' });
      return;
    }
    if (!isStrictSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin OAuth start is not allowed' });
      return;
    }
    const installationAccess = installationAuthority.authorizeHomeyStart(r);
    if (!installationAccess.allowed) {
      sendJson(r, 403, {
        error: 'Operator pairing is required for the first Homey enrollment',
      });
      return;
    }

    const oauth = getOAuthConfig(r);
    if (!oauth.clientId) {
      sendJson(r, 500, { error: 'Homey OAuth client ID is not configured' });
      return;
    }

    const context = bindingStore.getRequestSession(r);
    const baseRecord = context ? context.session : createEmptyHomeySession();
    const body = parseJson(r.requestText || '') || {};
    const state = secureRandomHex(32);
    const next = cloneRecord(baseRecord, {
      updatedAt: Date.now(),
      pending: {
        state: state,
        returnTo: normalizeReturnTo(body.returnTo, oauth),
        expiresAt: Date.now() + HOMEY_OAUTH_PENDING_TTL_MS,
        installationPairingVerified:
          installationAccess.pairingVerified === true,
      },
    });
    try {
      if (context) {
        bindingStore.writeSession(context.cookieId, next);
        bindingStore.setSessionCookie(r, context.cookieId);
      } else {
        bindingStore.rotateRequestSession(r, '', next);
      }
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        return;
      }
      throw error;
    }

    const authorizeUrl =
      ATHOM_API_BASE_URL +
      '/oauth2/authorise?response_type=code&client_id=' +
      encodeURIComponent(oauth.clientId) +
      '&redirect_uri=' +
      encodeURIComponent(oauth.redirectUri) +
      '&state=' +
      encodeURIComponent(state);
    sendJson(r, 200, { authorizeUrl: authorizeUrl });
  }

  async function handleCallback(r) {
    if (r.method !== 'GET') {
      r.headersOut.Allow = 'GET';
      sendJson(r, 405, { error: 'Method not allowed' });
      return;
    }

    const oauth = getOAuthConfig(r);
    const code = r.args && typeof r.args.code === 'string' ? r.args.code.trim() : '';
    const state = r.args && typeof r.args.state === 'string' ? r.args.state.trim() : '';
    const providerError =
      r.args && typeof r.args.error === 'string' ? r.args.error.trim() : '';
    const context = state ? getOAuthCallbackSession(bindingStore, r, state) : null;
    const pending = context && context.session.pending;
    if (
      !context ||
      !pending ||
      !state ||
      state !== pending.state ||
      pending.expiresAt < Date.now()
    ) {
      sendJson(r, 400, { error: 'Homey OAuth callback does not match this browser session' });
      return;
    }

    // Consume state before exchanging the authorization code so parallel or
    // replayed callbacks cannot reuse it, including provider-declared failures.
    const consumed = cloneRecord(context.session, {
      updatedAt: Date.now(),
      pending: cloneWithOverrides(pending, {
        state: secureRandomHex(32),
      }),
    });
    try {
      bindingStore.writeSession(context.cookieId, consumed);
    } catch (_error) {
      // The original state may still be valid when the atomic write fails.
      // Do not redirect as though one-shot consumption succeeded.
      sendJson(r, 503, { error: 'Unable to persist Homey OAuth callback state' });
      return;
    }

    const redirectFailure = function (errorCode) {
      sendRedirect(
        r,
        getRequestOrigin(r) + appendOAuthErrorMarker(pending.returnTo, oauth, errorCode)
      );
    };
    if (providerError) {
      redirectFailure(providerError === 'access_denied' ? 'access_denied' : 'invalid_response');
      return;
    }
    if (!code || !oauth.clientId || !oauth.clientSecret) {
      redirectFailure('callback_incomplete');
      return;
    }
    if (!fetchImpl) {
      redirectFailure('temporarily_unavailable');
      return;
    }

    let tokenResponse;
    try {
      tokenResponse = await fetchImpl(ATHOM_API_BASE_URL + '/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + encodeClientCredentials(oauth.clientId, oauth.clientSecret),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'grant_type=authorization_code&code=' +
          encodeURIComponent(code) +
          '&redirect_uri=' +
          encodeURIComponent(oauth.redirectUri),
      });
    } catch (_error) {
      redirectFailure('temporarily_unavailable');
      return;
    }
    if (!tokenResponse.ok) {
      redirectFailure('temporarily_unavailable');
      return;
    }

    let token;
    try {
      token = await tokenResponse.json();
    } catch (_error) {
      redirectFailure('invalid_response');
      return;
    }
    if (!isValidOAuthToken(token)) {
      redirectFailure('invalid_response');
      return;
    }

    let user;
    try {
      user = await loadAuthenticatedUser(token.access_token, fetchImpl);
    } catch (_error) {
      redirectFailure('temporarily_unavailable');
      return;
    }
    if (!user || typeof user !== 'object') {
      redirectFailure('invalid_response');
      return;
    }
    const homeys = Array.isArray(user.homeys)
      ? user.homeys
          .map(function (homey) {
            if (!homey || typeof homey._id !== 'string' || typeof homey.name !== 'string') {
              return null;
            }

            return {
              id: homey._id,
              name: homey.name,
              platform: homey.platform || null,
              localUrl: homey.localUrl || null,
              localUrlSecure: homey.localUrlSecure || null,
              remoteUrl: homey.remoteUrl || null,
            };
          })
          .filter(Boolean)
      : [];
    const authorityCurrent = bindingStore.readSession(context.cookieId);
    if (
      !authorityCurrent ||
      JSON.stringify(authorityCurrent) !== JSON.stringify(consumed)
    ) {
      redirectFailure('session_changed');
      return;
    }

    let installationAuthorized = false;
    try {
      installationAuthorized = installationAuthority.commitHomey(
          homeys.map(function (homey) {
            return homey.id;
          }),
          pending.installationPairingVerified === true
        );
    } catch (_error) {
      installationAuthorized = false;
    }
    if (!installationAuthorized) {
      redirectFailure('not_authorized');
      return;
    }

    try {
      let session = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: Date.now() + Number(token.expires_in || 0) * 1000,
        userId: user._id || null,
        user: {
          id: user._id || null,
          name: getHomeyUserName(user),
          avatarUrl: getHomeyUserAvatarUrl(user),
          email: user.email || null,
        },
        homeys: homeys,
        selectedHomeyId: null,
        homeyBaseUrl: null,
        homeySessionToken: null,
      };

      if (homeys.length === 1) {
        try {
          const selection = await createHomeySession(
            session.accessToken,
            homeys[0],
            fetchImpl
          );
          session = cloneWithOverrides(session, {
            selectedHomeyId: homeys[0].id,
            homeyBaseUrl: selection.homeyBaseUrl,
            homeySessionToken: selection.homeySessionToken,
          });
        } catch (_error) {
          session = cloneWithOverrides(session, {
            selectedHomeyId: homeys[0].id,
            homeyBaseUrl:
              homeys[0].localUrlSecure || homeys[0].localUrl || homeys[0].remoteUrl || null,
            homeySessionToken: null,
          });
        }
      }

      const current = bindingStore.readSession(context.cookieId);
      if (!current || JSON.stringify(current) !== JSON.stringify(consumed)) {
        sendJson(r, 409, { error: 'Homey OAuth session changed before callback completed' });
        return;
      }
      bindingStore.rotateRequestSession(
        r,
        context.cookieId,
        cloneRecord(createEmptyHomeySession(), {
          updatedAt: Date.now(),
          auth: session,
        })
      );
      sendRedirect(
        r,
        getRequestOrigin(r) +
          appendOAuthCallbackMarker(pending.returnTo, oauth)
      );
    } catch (_error) {
      redirectFailure('temporarily_unavailable');
    }
  }

  async function handleSessionGet(r) {
    const context = bindingStore.getRequestSession(r);
    if (!context || !context.session.auth) {
      sendNoContent(r);
      return;
    }

    let record = context.session;
    const sendLatestSessionOrNoContent = function () {
      const latest = bindingStore.readSession(context.cookieId);
      if (!latest || !latest.auth) {
        sendNoContent(r);
        return;
      }
      bindingStore.setSessionCookie(r, context.cookieId);
      sendJson(r, 200, sanitizeSession(latest.auth));
    };
    const persistSession = function (session) {
      const current = bindingStore.readSession(context.cookieId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        const error = new Error('Homey session is no longer active');
        error.sessionSuperseded = true;
        throw error;
      }
      const next = cloneRecord(record, {
        updatedAt: Date.now(),
        auth: session,
      });
      bindingStore.writeSession(context.cookieId, next);
      record = next;
    };

    try {
      const refreshed = await refreshAccessToken(
        r,
        context.session.auth,
        fetchImpl,
        persistSession
      );
      const current = bindingStore.readSession(context.cookieId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        sendLatestSessionOrNoContent();
        return;
      }
      bindingStore.renewRequestSession(r, {
        cookieId: context.cookieId,
        session: record,
      });
      sendJson(r, 200, sanitizeSession(refreshed));
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        return;
      }
      if (error && error.sessionSuperseded) {
        sendLatestSessionOrNoContent();
        return;
      }
      if (error && error.confirmedInvalid) {
        const current = bindingStore.readSession(context.cookieId);
        if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
          sendLatestSessionOrNoContent();
          return;
        }
        if (bindingStore.cookieNames.scoped) {
          bindingStore.deleteRequestSessions(r);
        } else {
          bindingStore.deleteSession(context.cookieId);
        }
        bindingStore.clearSessionCookie(r);
        sendNoContent(r);
        return;
      }
      const current = bindingStore.readSession(context.cookieId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        sendLatestSessionOrNoContent();
        return;
      }
      bindingStore.renewRequestSession(r, {
        cookieId: context.cookieId,
        session: current,
      });
      sendJson(r, 200, sanitizeSession(context.session.auth));
    }
  }

  function handleSessionDelete(r) {
    const context = bindingStore.getRequestSession(r);
    if (!context) {
      sendJson(r, 401, { error: 'Bound browser session is required' });
      return;
    }
    if (!isStrictSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin session mutation is not allowed' });
      return;
    }

    bindingStore.deleteRequestSessions(r);
    bindingStore.clearSessionCookie(r);
    sendJson(r, 200, { ok: true });
  }

  async function handleSelection(r) {
    if (r.method !== 'PUT') {
      r.headersOut.Allow = 'PUT';
      sendJson(r, 405, { error: 'Method not allowed' });
      return;
    }
    if (!isStrictSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin session mutation is not allowed' });
      return;
    }

    const context = bindingStore.getRequestSession(r);
    if (!context || !context.session.auth) {
      sendJson(r, 401, { error: 'Bound Homey OAuth session is required' });
      return;
    }

    let record = context.session;
    const persistSession = function (session) {
      const current = bindingStore.readSession(context.cookieId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        const error = new Error('Homey session is no longer active');
        error.sessionSuperseded = true;
        throw error;
      }
      const next = cloneRecord(record, {
        updatedAt: Date.now(),
        auth: session,
      });
      bindingStore.writeSession(context.cookieId, next);
      record = next;
    };

    try {
      const refreshed = await refreshAccessToken(
        r,
        context.session.auth,
        fetchImpl,
        persistSession
      );
      const body = parseJson(r.requestText || '') || {};
      const homeyId = typeof body.homeyId === 'string' ? body.homeyId.trim() : '';
      if (!homeyId) {
        sendJson(r, 400, { error: 'homeyId is required' });
        return;
      }

      const homey = refreshed.homeys.find(function (entry) {
        return entry.id === homeyId;
      });
      if (!homey) {
        sendJson(r, 404, { error: 'Homey not found in OAuth session' });
        return;
      }

      const selection = await createHomeySession(refreshed.accessToken, homey, fetchImpl);
      const nextSession = cloneWithOverrides(refreshed, {
        selectedHomeyId: homey.id,
        homeyBaseUrl: selection.homeyBaseUrl,
        homeySessionToken: selection.homeySessionToken,
      });
      persistSession(nextSession);
      sendJson(r, 200, sanitizeSession(nextSession));
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        return;
      }
      if (error && error.sessionSuperseded) {
        sendJson(r, 409, { error: 'Homey session changed before selection completed' });
        return;
      }
      if (error && error.confirmedInvalid) {
        const current = bindingStore.readSession(context.cookieId);
        if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
          sendJson(r, 409, { error: 'Homey session changed before selection completed' });
          return;
        }
        if (bindingStore.cookieNames.scoped) {
          bindingStore.deleteRequestSessions(r);
        } else {
          bindingStore.deleteSession(context.cookieId);
        }
        bindingStore.clearSessionCookie(r);
        sendJson(r, 401, { error: 'Homey login has expired' });
        return;
      }
      const detail =
        error && typeof error.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'Unknown error';
      sendJson(r, 502, { error: 'Unable to select Homey', details: detail });
    }
  }

  async function handle(r) {
    const oauth = getOAuthConfig(r);

    if (r.uri === '/__navet_homey__/authorize') {
      await handleAuthorize(r);
      return;
    }
    if (r.uri === oauth.callbackPath) {
      await handleCallback(r);
      return;
    }
    if (r.uri === '/__navet_homey__/session/select') {
      await handleSelection(r);
      return;
    }
    if (r.uri !== '/__navet_homey__/session') {
      sendJson(r, 404, { error: 'Unknown Homey auth endpoint' });
      return;
    }
    if (r.method === 'GET') {
      await handleSessionGet(r);
      return;
    }
    if (r.method === 'DELETE') {
      handleSessionDelete(r);
      return;
    }

    r.headersOut.Allow = 'GET, DELETE';
    sendJson(r, 405, { error: 'Method not allowed' });
  }

  function resolveHomeySession(r) {
    const context = bindingStore.getRequestSession(r);
    return context && context.session.auth
      ? { cookieId: context.cookieId, session: context.session.auth }
      : null;
  }

  function touchSessionCookie(r) {
    return bindingStore.touchRequestSession(
      r,
      PROVIDER_SESSION_TOUCH_INTERVAL_MS
    );
  }

  return {
    bindingStore: bindingStore,
    handle: handle,
    resolveHomeySession: resolveHomeySession,
    touchSessionCookie: touchSessionCookie,
  };
}

const homeySessionStore = createHomeySessionStore();

export default {
  createHomeySessionStore,
  handle: homeySessionStore.handle,
  normalizeHomeyRefreshToken,
  resolveHomeySession: homeySessionStore.resolveHomeySession,
  touchSessionCookie: homeySessionStore.touchSessionCookie,
};
