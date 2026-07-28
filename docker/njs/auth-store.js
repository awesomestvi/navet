import hashCrypto from 'crypto';
import fs from 'fs';

const AUTH_COOKIE_NAME = 'navet_auth_session';
const AUTH_COOKIE_ID_PATTERN = /^[a-f0-9]{64}$/;
const AUTH_PUBLIC_ID_PATTERN = /^nas_[a-f0-9]{32}$/;
const AUTH_BINDING_HEADER = 'X-Navet-OAuth-Binding';
const AUTH_SESSIONS_DIRECTORY = '/data/navet-auth-sessions';
const LEGACY_AUTH_PATH = '/data/navet-auth-session.json';
const MAX_AUTH_BYTES = 24 * 1024;
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const NAVET_OAUTH_CALLBACK_PARAM = 'navet_oauth_callback';
const LEGACY_OAUTH_CALLBACK_PARAM = 'auth_callback';

function getHeader(headers, name) {
  const source = headers || {};
  const expected = String(name || '').toLowerCase();
  let key;

  for (key in source) {
    if (
      Object.prototype.hasOwnProperty.call(source, key) &&
      String(key).toLowerCase() === expected
    ) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : '';
      }
      return value == null ? '' : String(value);
    }
  }

  return '';
}

function normalizeIngressPath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  const normalized = trimmed.replace(/\/+$/, '');
  let decoded;
  try {
    decoded = decodeURIComponent(normalized);
  } catch (_error) {
    return '';
  }
  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    !/^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(normalized) ||
    decoded.startsWith('//') ||
    !/^\/[A-Za-z0-9._~!$&'()*+,=:@%/-]+$/.test(decoded) ||
    decoded.includes('..') ||
    decoded.includes('\\')
  ) {
    return '';
  }

  return normalized;
}

function joinPath(basePath, suffix) {
  const normalizedBase = normalizeIngressPath(basePath);
  const normalizedSuffix = String(suffix || '').startsWith('/')
    ? String(suffix || '')
    : '/' + String(suffix || '');
  return normalizedBase ? normalizedBase + normalizedSuffix : normalizedSuffix;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  const parts = String(cookieHeader || '').split(';');
  let index;

  for (index = 0; index < parts.length; index += 1) {
    const entry = parts[index].trim();
    const separator = entry.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const name = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (name) {
      cookies[name] = value;
    }
  }

  return cookies;
}

function getCookieId(r) {
  const value = parseCookies(getHeader(r && r.headersIn, 'Cookie'))[AUTH_COOKIE_NAME];
  return typeof value === 'string' && AUTH_COOKIE_ID_PATTERN.test(value) ? value : '';
}

function getRequestProtocol(r) {
  const forwarded = getHeader(r && r.headersIn, 'X-Forwarded-Proto')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (forwarded === 'https' || forwarded === 'http') {
    return forwarded;
  }

  const scheme =
    r && r.variables && typeof r.variables.scheme === 'string'
      ? r.variables.scheme.trim().toLowerCase()
      : '';
  return scheme === 'https' ? 'https' : 'http';
}

function getRequestOrigin(r) {
  const host = getHeader(r && r.headersIn, 'Host').trim() || 'localhost';
  return getRequestProtocol(r) + '://' + host;
}

function buildSessionCookie(r, cookieId, maxAgeSeconds) {
  const ingressPath = normalizeIngressPath(getHeader(r && r.headersIn, 'X-Ingress-Path'));
  const attributes = [
    AUTH_COOKIE_NAME + '=' + cookieId,
    'Path=' + (ingressPath || '/'),
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + String(maxAgeSeconds),
  ];

  if (getRequestProtocol(r) === 'https') {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

function setSessionCookie(r, cookieId) {
  r.headersOut['Set-Cookie'] = buildSessionCookie(r, cookieId, COOKIE_MAX_AGE_SECONDS);
}

function clearSessionCookie(r) {
  r.headersOut['Set-Cookie'] = buildSessionCookie(r, '', 0);
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut.Pragma = 'no-cache';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut.Pragma = 'no-cache';
  r.return(204);
}

function sendRedirect(r, location) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(302, location);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function hasUnsafeUrlCharacters(value) {
  return /[\u0000-\u0020\u007f\\]/.test(value);
}

function isValidPort(value) {
  if (!value) {
    return true;
  }

  if (!/^[0-9]+$/.test(value)) {
    return false;
  }

  const port = Number(value);
  return Number.isFinite(port) && port >= 0 && port <= 65535;
}

function isValidHttpAuthority(value) {
  if (!value || value.includes('@') || hasUnsafeUrlCharacters(value)) {
    return false;
  }

  if (value.startsWith('[')) {
    const closingBracket = value.indexOf(']');
    if (closingBracket <= 1) {
      return false;
    }

    const address = value.slice(1, closingBracket);
    const remainder = value.slice(closingBracket + 1);
    return (
      address.includes(':') &&
      /^[0-9A-Fa-f:.]+$/.test(address) &&
      (!remainder ||
        (remainder.startsWith(':') &&
          remainder.length > 1 &&
          isValidPort(remainder.slice(1))))
    );
  }

  const colonIndex = value.lastIndexOf(':');
  const hostname = colonIndex === -1 ? value : value.slice(0, colonIndex);
  const port = colonIndex === -1 ? '' : value.slice(colonIndex + 1);
  return (
    Boolean(hostname) &&
    !hostname.includes(':') &&
    /^[A-Za-z0-9._-]+$/.test(hostname) &&
    (colonIndex === -1 || (Boolean(port) && isValidPort(port)))
  );
}

function normalizeHassUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const candidate = value.trim();
  if (!candidate || hasUnsafeUrlCharacters(candidate)) {
    return '';
  }

  const match = /^(https?):\/\/([^/?#]+)([^?#]*)(?:\?[^#]*)?(?:#.*)?$/i.exec(candidate);
  if (!match || !match[1] || !match[2] || !isValidHttpAuthority(match[2])) {
    return '';
  }

  const path = match[3] || '';
  if (path && !path.startsWith('/')) {
    return '';
  }

  return match[1].toLowerCase() + '://' + match[2] + path.replace(/\/+$/, '');
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
  const blockedKeys = {};
  blockedKeys[NAVET_OAUTH_CALLBACK_PARAM] = true;
  blockedKeys[LEGACY_OAUTH_CALLBACK_PARAM] = true;
  blockedKeys.code = true;
  blockedKeys.state = true;
  const retained = [];
  const entries = String(query || '').split('&');

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry && !blockedKeys[getDecodedQueryKey(entry)]) {
      retained.push(entry);
    }
  }

  return retained.join('&');
}

function normalizeReturnTo(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    hasUnsafeUrlCharacters(candidate)
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

function appendOAuthCallbackMarker(returnTo) {
  const normalized = normalizeReturnTo(returnTo, '/');
  const hashIndex = normalized.indexOf('#');
  const hash = hashIndex === -1 ? '' : normalized.slice(hashIndex);
  const pathAndQuery = hashIndex === -1 ? normalized : normalized.slice(0, hashIndex);
  const separator = pathAndQuery.includes('?') ? '&' : '?';
  return pathAndQuery + separator + NAVET_OAUTH_CALLBACK_PARAM + '=1' + hash;
}

function isValidAuthData(value) {
  return (
    value &&
    typeof value.hassUrl === 'string' &&
    normalizeHassUrl(value.hassUrl) === value.hassUrl.replace(/\/+$/, '') &&
    (typeof value.clientId === 'string' || value.clientId === null) &&
    typeof value.expires === 'number' &&
    Number.isFinite(value.expires) &&
    typeof value.refresh_token === 'string' &&
    value.refresh_token.length > 0 &&
    typeof value.access_token === 'string' &&
    value.access_token.length > 0 &&
    typeof value.expires_in === 'number' &&
    Number.isFinite(value.expires_in)
  );
}

function isValidPendingOAuth(value) {
  return (
    value &&
    typeof value.state === 'string' &&
    /^[a-f0-9]{64}$/.test(value.state) &&
    normalizeHassUrl(value.hassUrl) === value.hassUrl &&
    typeof value.clientId === 'string' &&
    value.clientId.length > 0 &&
    typeof value.redirectUri === 'string' &&
    value.redirectUri.length > 0 &&
    typeof value.returnTo === 'string' &&
    value.returnTo.startsWith('/') &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt)
  );
}

function isValidStoredSession(value) {
  return (
    value &&
    value.version === 2 &&
    AUTH_PUBLIC_ID_PATTERN.test(value.sessionId) &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number' &&
    (value.auth === null || isValidAuthData(value.auth)) &&
    (value.pending === null || isValidPendingOAuth(value.pending)) &&
    value.userId === null &&
    value.userName === null
  );
}

function cloneSession(session, overrides) {
  const next = {};
  let key;

  for (key in session) {
    if (Object.prototype.hasOwnProperty.call(session, key)) {
      next[key] = session[key];
    }
  }
  for (key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      next[key] = overrides[key];
    }
  }
  return next;
}

function secureRandomHex(byteLength) {
  const values = new Uint32Array(Math.ceil(byteLength / 4));
  crypto.getRandomValues(values);
  let output = '';
  let index;

  for (index = 0; index < values.length; index += 1) {
    output += values[index].toString(16).padStart(8, '0');
  }

  return output.slice(0, byteLength * 2);
}

function createEmptySession() {
  const now = Date.now();
  return {
    version: 2,
    sessionId: 'nas_' + secureRandomHex(16),
    createdAt: now,
    updatedAt: now,
    auth: null,
    pending: null,
    userId: null,
    userName: null,
  };
}

function sanitizeSession(session) {
  const auth = session && session.auth;
  return {
    authenticated: Boolean(auth),
    providerId: 'home_assistant',
    sessionId: session.sessionId,
    hassUrl: auth ? auth.hassUrl : null,
    clientId: auth ? auth.clientId : null,
    expiresAt: auth ? auth.expires : null,
    expiresIn: auth ? auth.expires_in : null,
    userId: null,
    userName: null,
  };
}

function createAuthSessionStore(options) {
  const settings = options || {};
  const sessionsDirectory = settings.sessionsDirectory || AUTH_SESSIONS_DIRECTORY;
  const legacyAuthPath = settings.legacyAuthPath || LEGACY_AUTH_PATH;
  const fetchImpl =
    settings.fetch ||
    (typeof ngx !== 'undefined' && ngx && typeof ngx.fetch === 'function'
      ? ngx.fetch.bind(ngx)
      : null);

  function ensureDirectory() {
    try {
      fs.mkdirSync(sessionsDirectory, { recursive: true, mode: 0o700 });
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  function discardLegacyGlobalSession() {
    try {
      fs.unlinkSync(legacyAuthPath);
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function getSessionPath(cookieId) {
    return sessionsDirectory + '/' + cookieId + '.json';
  }

  function readSession(cookieId) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || ''))) {
      return null;
    }

    try {
      const sessionPath = getSessionPath(cookieId);
      const stat = fs.statSync(sessionPath);
      if (stat.size > MAX_AUTH_BYTES) {
        return null;
      }
      const session = parseJson(fs.readFileSync(sessionPath, 'utf8'));
      return isValidStoredSession(session) ? session : null;
    } catch (_error) {
      return null;
    }
  }

  function writeSession(cookieId, session) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || '')) || !isValidStoredSession(session)) {
      throw new Error('Invalid auth session');
    }

    ensureDirectory();
    const sessionPath = getSessionPath(cookieId);
    const tempPath = sessionPath + '.tmp-' + secureRandomHex(8);
    fs.writeFileSync(tempPath, JSON.stringify(session), {
      encoding: 'utf8',
      mode: 0o600,
    });
    fs.renameSync(tempPath, sessionPath);
  }

  function deleteSession(cookieId) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || ''))) {
      return;
    }

    try {
      fs.unlinkSync(getSessionPath(cookieId));
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function createRequestSession(r) {
    discardLegacyGlobalSession();

    const existingCookieId = getCookieId(r);
    const existingSession = readSession(existingCookieId);
    if (existingSession) {
      return { cookieId: existingCookieId, session: existingSession };
    }

    const cookieId = secureRandomHex(32);
    const session = createEmptySession();
    writeSession(cookieId, session);
    setSessionCookie(r, cookieId);
    return { cookieId: cookieId, session: session };
  }

  function getRequestSession(r) {
    discardLegacyGlobalSession();
    const cookieId = getCookieId(r);
    const session = readSession(cookieId);
    return session ? { cookieId: cookieId, session: session } : null;
  }

  function hasValidBinding(r, session) {
    const binding = getHeader(r && r.headersIn, AUTH_BINDING_HEADER).trim();
    return Boolean(binding && session && binding === session.sessionId);
  }

  function isSameOriginMutation(r) {
    const origin = getHeader(r && r.headersIn, 'Origin').trim();
    return !origin || origin === getRequestOrigin(r);
  }

  async function handleSessionGet(r) {
    const context = createRequestSession(r);
    sendJson(r, 200, sanitizeSession(context.session));
  }

  function handleCredentialsGet(r) {
    const context = getRequestSession(r);
    if (!context || !hasValidBinding(r, context.session)) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }
    if (!context.session.auth) {
      sendNoContent(r);
      return;
    }

    sendJson(r, 200, context.session.auth);
  }

  async function handleSessionPut(r) {
    const context = getRequestSession(r);
    if (
      !context ||
      !hasValidBinding(r, context.session) ||
      !isSameOriginMutation(r)
    ) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }

    const body = r.requestText || '';
    if (!body || body.length > MAX_AUTH_BYTES) {
      sendJson(r, 400, { error: 'Invalid auth session body' });
      return;
    }

    const auth = parseJson(body);
    if (!isValidAuthData(auth)) {
      sendJson(r, 400, { error: 'Unsupported auth session' });
      return;
    }
    if (!context.session.auth) {
      sendJson(r, 401, { error: 'Complete OAuth login before refreshing the session' });
      return;
    }
    if (
      auth.hassUrl !== context.session.auth.hassUrl ||
      auth.clientId !== context.session.auth.clientId
    ) {
      sendJson(r, 409, { error: 'OAuth refresh cannot change the Home Assistant target' });
      return;
    }

    const next = cloneSession(context.session, {
      updatedAt: Date.now(),
      auth: auth,
      pending: null,
      userId: null,
      userName: null,
    });
    writeSession(context.cookieId, next);
    sendJson(r, 200, sanitizeSession(next));
  }

  async function handleSessionDelete(r) {
    const context = getRequestSession(r);
    if (context && !hasValidBinding(r, context.session)) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }
    if (!isSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin session mutation is not allowed' });
      return;
    }

    if (context) {
      deleteSession(context.cookieId);
    }
    clearSessionCookie(r);
    sendJson(r, 200, { ok: true });
  }

  async function handleAuthorize(r) {
    if (!isSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin OAuth start is not allowed' });
      return;
    }

    const context = getRequestSession(r);
    if (!context || !hasValidBinding(r, context.session)) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }

    const requestBody = r.requestText || '';
    if (!requestBody || requestBody.length > MAX_AUTH_BYTES) {
      sendJson(r, 400, { error: 'Invalid OAuth request body' });
      return;
    }
    const body = parseJson(requestBody) || {};
    const hassUrl = normalizeHassUrl(body.hassUrl);
    if (!hassUrl) {
      sendJson(r, 400, { error: 'A valid Home Assistant URL is required' });
      return;
    }

    const ingressPath = normalizeIngressPath(getHeader(r.headersIn, 'X-Ingress-Path'));
    const origin = getRequestOrigin(r);
    const redirectUri = origin + joinPath(ingressPath, '/__navet_auth__/callback');
    const clientId = origin + joinPath(ingressPath, '/');
    const returnTo = normalizeReturnTo(
      body.returnTo,
      joinPath(ingressPath, '/') || '/'
    );
    const state = secureRandomHex(32);
    const pending = {
      state: state,
      hassUrl: hassUrl,
      clientId: clientId,
      redirectUri: redirectUri,
      returnTo: returnTo,
      expiresAt: Date.now() + OAUTH_PENDING_TTL_MS,
    };
    const next = cloneSession(context.session, {
      updatedAt: Date.now(),
      pending: pending,
    });
    writeSession(context.cookieId, next);

    const authorizeUrl =
      hassUrl +
      '/auth/authorize?response_type=code&client_id=' +
      encodeURIComponent(clientId) +
      '&redirect_uri=' +
      encodeURIComponent(redirectUri) +
      '&state=' +
      encodeURIComponent(state);
    sendJson(r, 200, { authorizeUrl: authorizeUrl });
  }

  async function handleCallback(r) {
    const context = getRequestSession(r);
    const code = r && r.args && typeof r.args.code === 'string' ? r.args.code.trim() : '';
    const state = r && r.args && typeof r.args.state === 'string' ? r.args.state.trim() : '';
    const pending = context && context.session.pending;

    if (
      !context ||
      !pending ||
      !code ||
      !state ||
      state !== pending.state ||
      pending.expiresAt < Date.now()
    ) {
      sendJson(r, 400, { error: 'OAuth callback does not match this browser session' });
      return;
    }
    if (!fetchImpl) {
      sendJson(r, 500, { error: 'OAuth token exchange is unavailable' });
      return;
    }

    try {
      const response = await fetchImpl(pending.hassUrl + '/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body:
          'client_id=' +
          encodeURIComponent(pending.clientId) +
          '&code=' +
          encodeURIComponent(code) +
          '&grant_type=authorization_code',
      });
      if (!response.ok) {
        sendJson(r, 502, { error: 'Home Assistant OAuth token exchange failed' });
        return;
      }

      const token = await response.json();
      const auth = {
        hassUrl: pending.hassUrl,
        clientId: pending.clientId,
        expires: Date.now() + Number(token.expires_in || 0) * 1000,
        refresh_token: token.refresh_token,
        access_token: token.access_token,
        expires_in: Number(token.expires_in || 0),
      };
      if (!isValidAuthData(auth)) {
        sendJson(r, 502, { error: 'Home Assistant returned an invalid OAuth session' });
        return;
      }

      const next = cloneSession(context.session, {
        updatedAt: Date.now(),
        auth: auth,
        pending: null,
        userId: null,
        userName: null,
      });
      writeSession(context.cookieId, next);

      sendRedirect(r, appendOAuthCallbackMarker(pending.returnTo));
    } catch (_error) {
      sendJson(r, 502, { error: 'Unable to complete Home Assistant OAuth callback' });
    }
  }

  async function handle(r) {
    const uri = String((r && r.uri) || '');

    if (uri === '/__navet_auth__/callback') {
      if (r.method !== 'GET') {
        r.headersOut.Allow = 'GET';
        sendJson(r, 405, { error: 'Method not allowed' });
        return;
      }
      await handleCallback(r);
      return;
    }

    if (uri === '/__navet_auth__/authorize') {
      if (r.method !== 'POST') {
        r.headersOut.Allow = 'POST';
        sendJson(r, 405, { error: 'Method not allowed' });
        return;
      }
      await handleAuthorize(r);
      return;
    }

    if (uri === '/__navet_auth__/session/credentials') {
      if (r.method !== 'POST') {
        r.headersOut.Allow = 'POST';
        sendJson(r, 405, { error: 'Method not allowed' });
        return;
      }
      handleCredentialsGet(r);
      return;
    }

    if (uri !== '/__navet_auth__/session') {
      sendJson(r, 404, { error: 'Unknown Home Assistant auth endpoint' });
      return;
    }

    if (r.method === 'GET') {
      await handleSessionGet(r);
      return;
    }
    if (r.method === 'PUT') {
      await handleSessionPut(r);
      return;
    }
    if (r.method === 'DELETE') {
      await handleSessionDelete(r);
      return;
    }

    r.headersOut.Allow = 'GET, PUT, DELETE';
    sendJson(r, 405, { error: 'Method not allowed' });
  }

  function resolveStandaloneAuthSession(r) {
    const context = getRequestSession(r);
    return context && context.session.auth
      ? { cookieId: context.cookieId, session: context.session }
      : null;
  }

  function resolveAuthenticatedPrincipalForStore(r, principalOptions) {
    const principalSettings = principalOptions || {};
    if (principalSettings.trustIngressHeaders === true) {
      const ingressUserId = getHeader(r && r.headersIn, 'X-Remote-User-Id').trim();
      if (ingressUserId) {
        const ingressDisplayName =
          getHeader(r && r.headersIn, 'X-Remote-User-Display-Name').trim() ||
          getHeader(r && r.headersIn, 'X-Remote-User-Name').trim() ||
          null;
        return {
          providerId: 'home_assistant',
          source: 'home_assistant_ingress',
          sessionId:
            'hai_' +
            hashCrypto
              .createHash('sha256')
              .update(ingressUserId)
              .digest('hex')
              .slice(0, 32),
          userId: ingressUserId,
          userName: ingressDisplayName,
        };
      }
    }

    const context = resolveStandaloneAuthSession(r);
    if (!context) {
      return null;
    }

    return {
      providerId: 'home_assistant',
      source: 'standalone_session',
      sessionId: context.session.sessionId,
      userId: null,
      userName: null,
    };
  }

  return {
    createRequestSession: createRequestSession,
    deleteSession: deleteSession,
    discardLegacyGlobalSession: discardLegacyGlobalSession,
    getRequestSession: getRequestSession,
    handle: handle,
    readSession: readSession,
    resolveAuthenticatedPrincipal: resolveAuthenticatedPrincipalForStore,
    resolveStandaloneAuthSession: resolveStandaloneAuthSession,
    sanitizeSession: sanitizeSession,
    writeSession: writeSession,
  };
}

const authSessionStore = createAuthSessionStore();

function resolveAuthenticatedPrincipal(r, options) {
  return authSessionStore.resolveAuthenticatedPrincipal(r, options);
}

function resolveStandaloneAuthSession(r) {
  return authSessionStore.resolveStandaloneAuthSession(r);
}

async function handle(r) {
  await authSessionStore.handle(r);
}

export default {
  AUTH_BINDING_HEADER: AUTH_BINDING_HEADER,
  AUTH_COOKIE_NAME: AUTH_COOKIE_NAME,
  createAuthSessionStore: createAuthSessionStore,
  handle: handle,
  isValidAuthData: isValidAuthData,
  normalizeIngressPath: normalizeIngressPath,
  resolveAuthenticatedPrincipal: resolveAuthenticatedPrincipal,
  resolveStandaloneAuthSession: resolveStandaloneAuthSession,
  sanitizeSession: sanitizeSession,
};
