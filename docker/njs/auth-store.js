import hashCrypto from 'crypto';
import fs from 'fs';
import installationAuthorityModule from './installation-authority.js';
import installationCookieScope from './installation-cookie-scope.js';

const AUTH_COOKIE_NAME = 'navet_auth_session';
const AUTH_COOKIE_ID_PATTERN = /^[a-f0-9]{64}$/;
const AUTH_PUBLIC_ID_PATTERN = /^nas_[a-f0-9]{32}$/;
const AUTH_BINDING_HEADER = 'X-Navet-OAuth-Binding';
const AUTH_REVISION_HEADER = 'X-Navet-Auth-Revision';
const AUTH_SESSIONS_DIRECTORY = '/data/navet-auth-sessions';
const LEGACY_AUTH_PATH = '/data/navet-auth-session.json';
const MAX_AUTH_REQUEST_BYTES = 24 * 1024;
const MAX_AUTH_RECORD_BYTES = 32 * 1024;
const SESSION_RECORD_TOO_LARGE_ERROR_CODE = 'credential-session-record-too-large';
const SESSION_RECORD_TOO_LARGE_STATUS = 507;
const SESSION_CAPACITY_ERROR_CODE = 'credential-session-capacity-reached';
const SESSION_CAPACITY_STATUS = 507;
const SESSION_UNAVAILABLE_ERROR_CODE = 'credential-session-record-unavailable';
const SESSION_UNAVAILABLE_STATUS = 503;
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;
const AUTH_SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = AUTH_SESSION_IDLE_TTL_MS / 1000;
const MAX_AUTH_SESSIONS = 256;
const TEMP_FILE_TTL_MS = 60 * 60 * 1000;
const NAVET_OAUTH_CALLBACK_PARAM = 'navet_oauth_callback';
const NAVET_OAUTH_ERROR_PARAM = 'navet_oauth_error';
const LEGACY_OAUTH_CALLBACK_PARAM = 'auth_callback';
const OAUTH_ERROR_CODES = {
  access_denied: true,
  callback_incomplete: true,
  invalid_response: true,
  not_authorized: true,
  session_changed: true,
  temporarily_unavailable: true,
};

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

function getCookieIds(r, cookieName) {
  const values = [];
  const parts = String(getHeader(r && r.headersIn, 'Cookie') || '').split(';');
  let index;
  for (index = 0; index < parts.length; index += 1) {
    const entry = parts[index].trim();
    const separator = entry.indexOf('=');
    if (separator <= 0 || entry.slice(0, separator).trim() !== cookieName) {
      continue;
    }
    const value = entry.slice(separator + 1).trim();
    if (AUTH_COOKIE_ID_PATTERN.test(value) && values.indexOf(value) === -1) {
      values.push(value);
    }
  }
  return values;
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

function buildSessionCookie(
  r,
  cookieName,
  cookieId,
  maxAgeSeconds,
  pathOverride
) {
  const ingressPath = normalizeIngressPath(getHeader(r && r.headersIn, 'X-Ingress-Path'));
  const cookiePath =
    typeof pathOverride === 'string' ? pathOverride : ingressPath || '/';
  const attributes = [
    cookieName + '=' + cookieId,
    'Path=' + cookiePath,
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + String(maxAgeSeconds),
  ];

  if (getRequestProtocol(r) === 'https') {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

function buildSessionCookieDeletion(r, cookieName) {
  const ingressPath = normalizeIngressPath(getHeader(r && r.headersIn, 'X-Ingress-Path'));
  const paths = ingressPath ? [ingressPath, '/'] : ['/'];
  const cookies = paths.map(function (path) {
    return buildSessionCookie(r, cookieName, '', 0, path);
  });
  return cookies.length === 1 ? cookies[0] : cookies;
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut.Pragma = 'no-cache';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function createSessionRecordTooLargeError() {
  const error = new Error('Home Assistant credential session exceeds the storage limit');
  error.code = SESSION_RECORD_TOO_LARGE_ERROR_CODE;
  error.statusCode = SESSION_RECORD_TOO_LARGE_STATUS;
  return error;
}

function createSessionCapacityError() {
  const error = new Error('Home Assistant credential session capacity has been reached');
  error.code = SESSION_CAPACITY_ERROR_CODE;
  error.statusCode = SESSION_CAPACITY_STATUS;
  return error;
}

function createSessionUnavailableError() {
  const error = new Error('Home Assistant credential session is unavailable');
  error.code = SESSION_UNAVAILABLE_ERROR_CODE;
  error.statusCode = SESSION_UNAVAILABLE_STATUS;
  return error;
}

function isSessionRecordTooLargeError(error) {
  return Boolean(error && error.code === SESSION_RECORD_TOO_LARGE_ERROR_CODE);
}

function isSessionCapacityError(error) {
  return Boolean(error && error.code === SESSION_CAPACITY_ERROR_CODE);
}

function isSessionUnavailableError(error) {
  return Boolean(error && error.code === SESSION_UNAVAILABLE_ERROR_CODE);
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
  } else if (isSessionUnavailableError(error)) {
    code = SESSION_UNAVAILABLE_ERROR_CODE;
    status = SESSION_UNAVAILABLE_STATUS;
  } else {
    return false;
  }

  sendJson(r, status, {
    error: error.message,
    code: code,
  });
  return true;
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut.Pragma = 'no-cache';
  r.return(204);
}

function sendRedirect(r, location) {
  r.headersOut['Cache-Control'] = 'no-store';
  const redirectLocation = String(location || '').startsWith('/')
    ? getRequestOrigin(r) + location
    : location;
  r.return(302, redirectLocation);
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

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(path || '/');
  } catch (_error) {
    return '';
  }
  if (
    /%25/i.test(path) ||
    decodedPath.includes('\\') ||
    decodedPath.split('/').some(function (segment) {
      return segment === '..' || segment === '.';
    })
  ) {
    return '';
  }

  const protocol = match[1].toLowerCase();
  const authority = match[2];
  let hostname;
  let port = '';
  if (authority.startsWith('[')) {
    const closingBracket = authority.indexOf(']');
    hostname = '[' + authority.slice(1, closingBracket).toLowerCase() + ']';
    port = authority.slice(closingBracket + 1).replace(/^:/, '');
  } else {
    const colonIndex = authority.lastIndexOf(':');
    hostname = (colonIndex === -1 ? authority : authority.slice(0, colonIndex)).toLowerCase();
    port = colonIndex === -1 ? '' : authority.slice(colonIndex + 1);
  }
  const numericPort = port ? Number(port) : null;
  const canonicalPort =
    numericPort === null ||
    (protocol === 'http' && numericPort === 80) ||
    (protocol === 'https' && numericPort === 443)
      ? ''
      : ':' + String(numericPort);
  return protocol + '://' + hostname + canonicalPort + path.replace(/\/+$/, '');
}

function normalizeHassOrigin(value) {
  const normalizedUrl = normalizeHassUrl(value);
  const match = /^(https?):\/\/(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9._-]+)(?::([0-9]+))?/i.exec(
    normalizedUrl
  );
  if (!match || !match[1] || !match[2]) {
    return '';
  }

  const protocol = match[1].toLowerCase();
  const hostname = match[2].toLowerCase();
  const numericPort = match[3] ? Number(match[3]) : null;
  const port =
    numericPort === null ||
    (protocol === 'http' && numericPort === 80) ||
    (protocol === 'https' && numericPort === 443)
      ? ''
      : ':' + String(numericPort);
  return protocol + '://' + hostname + port;
}

function createHomeAssistantTenantId(hassUrl) {
  const normalizedUrl = normalizeHassUrl(hassUrl);
  const origin = normalizeHassOrigin(normalizedUrl);
  const match = /^(?:https?):\/\/[^/?#]+([^?#]*)$/i.exec(normalizedUrl);
  if (!origin || !match) {
    return '';
  }
  const normalizedBaseUrl = origin + (match[1] || '');
  return 'hat_' + hashCrypto.createHash('sha256').update(normalizedBaseUrl).digest('hex');
}

const HOME_ASSISTANT_INGRESS_TENANT_ID =
  'hat_' +
  hashCrypto.createHash('sha256').update('home_assistant_ingress').digest('hex');

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
  blockedKeys[NAVET_OAUTH_ERROR_PARAM] = true;
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

function appendOAuthErrorMarker(returnTo, errorCode) {
  const normalized = normalizeReturnTo(returnTo, '/');
  const hashIndex = normalized.indexOf('#');
  const hash = hashIndex === -1 ? '' : normalized.slice(hashIndex);
  const pathAndQuery = hashIndex === -1 ? normalized : normalized.slice(0, hashIndex);
  const separator = pathAndQuery.includes('?') ? '&' : '?';
  const safeErrorCode = Object.prototype.hasOwnProperty.call(OAUTH_ERROR_CODES, errorCode)
    ? errorCode
    : 'temporarily_unavailable';
  return pathAndQuery + separator + NAVET_OAUTH_ERROR_PARAM + '=' + safeErrorCode + hash;
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
    (value.authRevision === undefined ||
      (typeof value.authRevision === 'number' &&
        Number.isSafeInteger(value.authRevision) &&
        value.authRevision >= 0 &&
        value.authRevision < Number.MAX_SAFE_INTEGER)) &&
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

function getAuthRevision(session) {
  return session && typeof session.authRevision === 'number'
    ? session.authRevision
    : 0;
}

function parseAuthRevisionHeader(r) {
  const value = getHeader(r && r.headersIn, AUTH_REVISION_HEADER).trim();
  if (!/^(0|[1-9][0-9]{0,15})$/.test(value)) {
    return null;
  }
  const revision = Number(value);
  return Number.isSafeInteger(revision) &&
    revision >= 0 &&
    revision < Number.MAX_SAFE_INTEGER
    ? revision
    : null;
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
    authRevision: 0,
    auth: null,
    pending: null,
    userId: null,
    userName: null,
  };
}

function createEphemeralSession(cookieId, bindingSecret) {
  const now = Date.now();
  return {
    version: 2,
    sessionId:
      'nas_' +
      hashCrypto
        .createHmac('sha256', bindingSecret)
        .update(cookieId)
        .digest('hex')
        .slice(0, 32),
    createdAt: now,
    updatedAt: now,
    authRevision: 0,
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
    authRevision:
      typeof session.authRevision === 'number' ? session.authRevision : 0,
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
  const cookieNames =
    settings.cookieNames ||
    installationCookieScope.createInstallationCookieNames(
      AUTH_COOKIE_NAME,
      settings
    );
  const cookieName = cookieNames.currentName;
  const legacyCookieName = cookieNames.legacyName;
  const hasScopedCookie = cookieNames.scoped === true;
  const sessionsDirectory = settings.sessionsDirectory || AUTH_SESSIONS_DIRECTORY;
  const legacyAuthPath = settings.legacyAuthPath || LEGACY_AUTH_PATH;
  const bindingSecretPath =
    settings.bindingSecretPath || sessionsDirectory + '/.binding-secret';
  const fetchImpl =
    settings.fetch ||
    (typeof ngx !== 'undefined' && ngx && typeof ngx.fetch === 'function'
      ? ngx.fetch.bind(ngx)
      : null);
  const installationAuthority =
    settings.installationAuthority || installationAuthorityModule;

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

  function getBindingSecret() {
    if (
      typeof settings.bindingSecret === 'string' &&
      /^[a-f0-9]{64}$/.test(settings.bindingSecret)
    ) {
      return settings.bindingSecret;
    }

    ensureDirectory();
    try {
      const existing = String(fs.readFileSync(bindingSecretPath, 'utf8') || '').trim();
      if (/^[a-f0-9]{64}$/.test(existing)) {
        return existing;
      }
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }

    const candidate = secureRandomHex(32);
    try {
      fs.writeFileSync(bindingSecretPath, candidate, {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      });
      return candidate;
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }
      const existing = String(fs.readFileSync(bindingSecretPath, 'utf8') || '').trim();
      if (!/^[a-f0-9]{64}$/.test(existing)) {
        throw new Error('Invalid auth binding secret');
      }
      return existing;
    }
  }

  function deletePath(filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function readSession(cookieId) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || ''))) {
      return null;
    }

    const sessionPath = getSessionPath(cookieId);
    let stat;
    try {
      stat = fs.statSync(sessionPath);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
    if (stat.size > MAX_AUTH_RECORD_BYTES) {
      throw createSessionUnavailableError();
    }

    let serialized;
    try {
      serialized = fs.readFileSync(sessionPath, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
    const session = parseJson(serialized);
    if (!isValidStoredSession(session)) {
      throw createSessionUnavailableError();
    }
    if (
      session.updatedAt + AUTH_SESSION_IDLE_TTL_MS < Date.now() ||
      (!session.auth &&
        (!session.pending || session.pending.expiresAt < Date.now()))
    ) {
      deletePath(sessionPath);
      return null;
    }
    return session;
  }

  function getCurrentCookieIds(r) {
    return getCookieIds(r, cookieName);
  }

  function getRecognizedLegacyCookieIds(r) {
    if (!hasScopedCookie) {
      return [];
    }
    return getCookieIds(r, legacyCookieName).filter(function (cookieId) {
      return Boolean(readSession(cookieId));
    });
  }

  function getRequestCookieIds(r) {
    const currentCookieIds = getCurrentCookieIds(r);
    return currentCookieIds.concat(
      getRecognizedLegacyCookieIds(r).filter(function (cookieId) {
        return currentCookieIds.indexOf(cookieId) === -1;
      })
    );
  }

  function getStoredRequestContexts(r) {
    const currentContexts = getCurrentCookieIds(r)
      .map(function (cookieId) {
        const session = readSession(cookieId);
        return session ? { cookieId: cookieId, session: session } : null;
      })
      .filter(function (context) {
        return Boolean(context);
      });
    if (currentContexts.length > 0 || !hasScopedCookie) {
      return currentContexts;
    }
    return getRecognizedLegacyCookieIds(r)
      .map(function (cookieId) {
        const session = readSession(cookieId);
        return session ? { cookieId: cookieId, session: session } : null;
      })
      .filter(function (context) {
        return Boolean(context);
      });
  }

  function setSessionCookie(r, cookieId) {
    r.headersOut['Set-Cookie'] = buildSessionCookie(
      r,
      cookieName,
      cookieId,
      COOKIE_MAX_AGE_SECONDS
    );
  }

  function clearSessionCookie(r) {
    r.headersOut['Set-Cookie'] = buildSessionCookieDeletion(r, cookieName);
  }

  function listActiveSessions(now) {
    let names;
    try {
      names = fs.readdirSync(sessionsDirectory);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const active = [];
    let index;
    for (index = 0; index < names.length; index += 1) {
      const name = names[index];
      const match = /^([a-f0-9]{64})\.json$/.exec(name);
      const filePath = sessionsDirectory + '/' + name;
      if (!match) {
        if (name.includes('.tmp-')) {
          try {
            if (fs.statSync(filePath).mtimeMs + TEMP_FILE_TTL_MS < now) {
              deletePath(filePath);
            }
          } catch (_error) {
            // Ignore a concurrently removed temporary file.
          }
        }
        continue;
      }
      try {
        const session = readSession(match[1]);
        if (session) {
          active.push({
            authenticated: Boolean(session.auth),
            cookieId: match[1],
            updatedAt: session.updatedAt,
          });
        }
      } catch (error) {
        if (!isSessionUnavailableError(error)) {
          throw error;
        }
        // Preserve unreadable credential records and count them toward capacity.
        // A caller presenting this cookie receives a typed 503 instead of a
        // false logged-out response, while unrelated browser sessions continue.
        active.push({
          authenticated: true,
          cookieId: match[1],
          updatedAt: now,
        });
      }
    }
    return active;
  }

  function cleanupSessions(reserveSlots) {
    const active = listActiveSessions(Date.now());
    active.sort(function (left, right) {
      if (left.authenticated !== right.authenticated) {
        return left.authenticated ? 1 : -1;
      }
      return left.updatedAt - right.updatedAt;
    });
    const targetCount = Math.max(0, MAX_AUTH_SESSIONS - (reserveSlots || 0));
    let index = 0;
    let currentCount = active.length;
    while (currentCount > targetCount && index < active.length) {
      if (active[index].authenticated) {
        index += 1;
        continue;
      }
      deletePath(getSessionPath(active[index].cookieId));
      index += 1;
      currentCount -= 1;
    }
    return currentCount;
  }

  function writeSessionFile(cookieId, session) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || '')) || !isValidStoredSession(session)) {
      throw new Error('Invalid auth session');
    }

    const serialized = JSON.stringify(session);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_AUTH_RECORD_BYTES) {
      throw createSessionRecordTooLargeError();
    }

    ensureDirectory();
    const sessionPath = getSessionPath(cookieId);
    const tempPath = sessionPath + '.tmp-' + secureRandomHex(8);
    try {
      fs.writeFileSync(tempPath, serialized, {
        encoding: 'utf8',
        mode: 0o600,
      });
      fs.renameSync(tempPath, sessionPath);
    } catch (error) {
      deletePath(tempPath);
      throw error;
    }
  }

  function writeSession(cookieId, session) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || '')) || !isValidStoredSession(session)) {
      throw new Error('Invalid auth session');
    }

    const serialized = JSON.stringify(session);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_AUTH_RECORD_BYTES) {
      throw createSessionRecordTooLargeError();
    }

    ensureDirectory();
    const sessionPath = getSessionPath(cookieId);
    try {
      fs.statSync(sessionPath);
    } catch (_error) {
      const remaining = cleanupSessions(1);
      if (remaining > MAX_AUTH_SESSIONS - 1) {
        throw createSessionCapacityError();
      }
    }
    writeSessionFile(cookieId, session);
  }

  function deleteSession(cookieId) {
    if (!AUTH_COOKIE_ID_PATTERN.test(String(cookieId || ''))) {
      return;
    }

    deletePath(getSessionPath(cookieId));
  }

  function getPreferredRequestSession(r) {
    discardLegacyGlobalSession();
    const contexts = getStoredRequestContexts(r);
    const now = Date.now();
    contexts.sort(function (left, right) {
      const leftCurrent = Boolean(
        left.session.auth && left.session.auth.expires > now
      );
      const rightCurrent = Boolean(
        right.session.auth && right.session.auth.expires > now
      );
      if (leftCurrent !== rightCurrent) {
        return leftCurrent ? -1 : 1;
      }
      const leftAuthenticated = Boolean(left.session.auth);
      const rightAuthenticated = Boolean(right.session.auth);
      if (leftAuthenticated !== rightAuthenticated) {
        return leftAuthenticated ? -1 : 1;
      }
      if (left.session.updatedAt !== right.session.updatedAt) {
        return right.session.updatedAt - left.session.updatedAt;
      }
      if (left.cookieId === right.cookieId) {
        return 0;
      }
      return left.cookieId < right.cookieId ? -1 : 1;
    });
    return contexts[0] || null;
  }

  function createRequestSession(r) {
    const existing = getPreferredRequestSession(r);
    if (existing) {
      setSessionCookie(r, existing.cookieId);
      return existing;
    }

    // Never reuse an unbacked caller-supplied cookie. A fresh cookie plus the
    // server-authenticated public binding supports OAuth bootstrap without
    // creating one disk record per anonymous GET.
    const cookieId = secureRandomHex(32);
    const session = createEphemeralSession(cookieId, getBindingSecret());
    setSessionCookie(r, cookieId);
    return { cookieId: cookieId, session: session };
  }

  function renewRequestSession(r, context) {
    const next = cloneSession(context.session, { updatedAt: Date.now() });
    if (next.auth || next.pending) {
      writeSession(context.cookieId, next);
    }
    setSessionCookie(r, context.cookieId);
    return { cookieId: context.cookieId, session: next };
  }

  function rotateRequestSession(r, previousCookieId, session) {
    const cookieId = secureRandomHex(32);
    if (previousCookieId && readSession(previousCookieId)) {
      writeSessionFile(cookieId, session);
    } else {
      writeSession(cookieId, session);
    }
    setSessionCookie(r, cookieId);
    if (previousCookieId) {
      deleteSession(previousCookieId);
    }
    return { cookieId: cookieId, session: session };
  }

  function getRequestSession(r) {
    return getPreferredRequestSession(r);
  }

  function getBoundRequestSession(r, allowEphemeral) {
    discardLegacyGlobalSession();
    const storedContexts = getStoredRequestContexts(r);
    let index;
    for (index = 0; index < storedContexts.length; index += 1) {
      if (hasValidBinding(r, storedContexts[index].session)) {
        return storedContexts[index];
      }
    }
    if (!allowEphemeral) {
      return null;
    }

    const currentCookieIds = getCurrentCookieIds(r);
    for (index = 0; index < currentCookieIds.length; index += 1) {
      const session = createEphemeralSession(
        currentCookieIds[index],
        getBindingSecret()
      );
      if (hasValidBinding(r, session)) {
        return { cookieId: currentCookieIds[index], session: session };
      }
    }
    return null;
  }

  function getOAuthCallbackSession(r, state) {
    discardLegacyGlobalSession();
    const contexts = getStoredRequestContexts(r);
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

  function hasValidBinding(r, session) {
    const binding = getHeader(r && r.headersIn, AUTH_BINDING_HEADER).trim();
    return Boolean(binding && session && binding === session.sessionId);
  }

  function isSameOriginMutation(r) {
    const origin = getHeader(r && r.headersIn, 'Origin').trim();
    return Boolean(origin) && origin === getRequestOrigin(r);
  }

  async function handleSessionGet(r) {
    const context = createRequestSession(r);
    const renewed = renewRequestSession(r, context);
    sendJson(r, 200, sanitizeSession(renewed.session));
  }

  function handleCredentialsGet(r) {
    const context = getBoundRequestSession(r, true);
    if (!context) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }
    if (!context.session.auth) {
      sendNoContent(r);
      return;
    }

    renewRequestSession(r, context);
    sendJson(r, 200, context.session.auth);
  }

  async function handleSessionPut(r) {
    const context = getBoundRequestSession(r, false);
    if (!context || !isSameOriginMutation(r)) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }

    const body = r.requestText || '';
    if (!body || Buffer.byteLength(body, 'utf8') > MAX_AUTH_REQUEST_BYTES) {
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

    const revisionHeader = getHeader(r && r.headersIn, AUTH_REVISION_HEADER).trim();
    const legacyRefresh = revisionHeader === '';
    const expectedRevision = parseAuthRevisionHeader(r);
    if (!legacyRefresh && expectedRevision === null) {
      sendJson(r, 428, {
        error: 'Home Assistant auth revision is invalid',
        code: 'credential-session-revision-required',
      });
      return;
    }
    const current = readSession(context.cookieId);
    const unchanged =
      Boolean(current && current.auth) &&
      JSON.stringify(current.auth) === JSON.stringify(auth);
    if (!current || current.sessionId !== context.session.sessionId) {
      if (unchanged) {
        setSessionCookie(r, context.cookieId);
        sendJson(r, 200, sanitizeSession(current));
        return;
      }
      sendJson(r, 409, {
        error: 'Auth session changed before refresh completed',
        code: 'credential-session-superseded',
        session: current ? sanitizeSession(current) : null,
      });
      return;
    }
    if (legacyRefresh) {
      // Compatibility for a tab that loaded before auth revisions shipped:
      // a later token expiry may advance the session, while stale/equal
      // refreshes become successful no-ops instead of retrying forever.
      if (
        unchanged ||
        !current.auth ||
        auth.expires <= current.auth.expires
      ) {
        setSessionCookie(r, context.cookieId);
        sendJson(r, 200, sanitizeSession(current));
        return;
      }
    } else if (expectedRevision !== getAuthRevision(current)) {
      if (unchanged) {
        setSessionCookie(r, context.cookieId);
        sendJson(r, 200, sanitizeSession(current));
        return;
      }
      sendJson(r, 409, {
        error: 'Auth session changed before refresh completed',
        code: 'credential-session-superseded',
        session: sanitizeSession(current),
      });
      return;
    }
    if (unchanged) {
      setSessionCookie(r, context.cookieId);
      sendJson(r, 200, sanitizeSession(current));
      return;
    }

    const next = cloneSession(current, {
      updatedAt: Date.now(),
      authRevision: getAuthRevision(current) + 1,
      auth: auth,
      pending: null,
      userId: null,
      userName: null,
    });
    try {
      writeSession(context.cookieId, next);
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        return;
      }
      throw error;
    }
    setSessionCookie(r, context.cookieId);
    sendJson(r, 200, sanitizeSession(next));
  }

  async function handleSessionDelete(r) {
    const revisionHeader = getHeader(r && r.headersIn, AUTH_REVISION_HEADER).trim();
    const conditionalInvalidation = revisionHeader !== '';
    const expectedRevision = parseAuthRevisionHeader(r);
    if (conditionalInvalidation && expectedRevision === null) {
      sendJson(r, 428, {
        error: 'Home Assistant auth revision is invalid',
        code: 'credential-session-revision-required',
      });
      return;
    }
    if (conditionalInvalidation && !isSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin session mutation is not allowed' });
      return;
    }
    const context = getBoundRequestSession(r, true);
    const presentedCookieIds = getRequestCookieIds(r);
    if (conditionalInvalidation) {
      const binding = getHeader(r && r.headersIn, AUTH_BINDING_HEADER).trim();
      const current = context ? readSession(context.cookieId) : null;
      const superseded =
        !context ||
        !current ||
        !current.auth ||
        current.sessionId !== binding ||
        current.sessionId !== context.session.sessionId ||
        getAuthRevision(current) !== expectedRevision;
      let index;
      if (superseded) {
        const latest = getRequestSession(r);
        sendJson(r, 409, {
          error: 'Auth session changed before invalidation completed',
          code: 'credential-session-superseded',
          session: latest ? sanitizeSession(latest.session) : null,
        });
        return;
      }
      for (index = 0; index < presentedCookieIds.length; index += 1) {
        const stored = readSession(presentedCookieIds[index]);
        if (
          stored &&
          stored.sessionId === binding &&
          getAuthRevision(stored) === expectedRevision
        ) {
          deleteSession(presentedCookieIds[index]);
        }
      }
      clearSessionCookie(r);
      sendJson(r, 200, { ok: true });
      return;
    }
    if (!context && presentedCookieIds.length > 0) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }
    if (!isSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin session mutation is not allowed' });
      return;
    }

    if (context) {
      let index;
      for (index = 0; index < presentedCookieIds.length; index += 1) {
        const stored = readSession(presentedCookieIds[index]);
        if (stored && (hasScopedCookie || hasValidBinding(r, stored))) {
          deleteSession(presentedCookieIds[index]);
        }
      }
    }
    clearSessionCookie(r);
    sendJson(r, 200, { ok: true });
  }

  async function handleAuthorize(r) {
    if (!isSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin OAuth start is not allowed' });
      return;
    }

    const context = getBoundRequestSession(r, true);
    if (!context) {
      sendJson(r, 401, { error: 'Authenticated browser session is required' });
      return;
    }

    const requestBody = r.requestText || '';
    if (
      !requestBody ||
      Buffer.byteLength(requestBody, 'utf8') > MAX_AUTH_REQUEST_BYTES
    ) {
      sendJson(r, 400, { error: 'Invalid OAuth request body' });
      return;
    }
    const body = parseJson(requestBody) || {};
    const hassUrl = normalizeHassUrl(body.hassUrl);
    if (!hassUrl) {
      sendJson(r, 400, { error: 'A valid Home Assistant URL is required' });
      return;
    }
    const installationAccess = installationAuthority.authorizeHomeAssistant(
      r,
      hassUrl,
      normalizeHassUrl
    );
    if (!installationAccess.allowed) {
      sendJson(r, 403, {
        error: 'Operator pairing is required for this Home Assistant installation',
      });
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
      installationPairingVerified:
        installationAccess.pairingVerified === true,
    };
    const next = cloneSession(context.session, {
      updatedAt: Date.now(),
      pending: pending,
    });
    try {
      writeSession(context.cookieId, next);
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        return;
      }
      throw error;
    }
    setSessionCookie(r, context.cookieId);

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
    const code = r && r.args && typeof r.args.code === 'string' ? r.args.code.trim() : '';
    const state = r && r.args && typeof r.args.state === 'string' ? r.args.state.trim() : '';
    const providerError =
      r && r.args && typeof r.args.error === 'string' ? r.args.error.trim() : '';
    const context = state ? getOAuthCallbackSession(r, state) : null;
    const pending = context && context.session.pending;

    if (
      !context ||
      !pending ||
      !state ||
      state !== pending.state ||
      pending.expiresAt < Date.now()
    ) {
      sendJson(r, 400, { error: 'OAuth callback does not match this browser session' });
      return;
    }

    // Consume state before the upstream exchange so concurrent or replayed
    // callbacks cannot reuse it, including provider-declared callback failures.
    const consumed = cloneSession(context.session, {
      updatedAt: Date.now(),
      pending: cloneSession(pending, {
        state: secureRandomHex(32),
      }),
    });
    try {
      writeSession(context.cookieId, consumed);
    } catch (_error) {
      // The original state may still be valid when the atomic write fails.
      // Keep the response non-redirecting so we never claim one-shot
      // consumption that was not durably recorded.
      sendJson(r, 503, { error: 'Unable to persist OAuth callback state' });
      return;
    }

    const redirectFailure = function (errorCode) {
      sendRedirect(r, appendOAuthErrorMarker(pending.returnTo, errorCode));
    };
    if (providerError) {
      redirectFailure(providerError === 'access_denied' ? 'access_denied' : 'invalid_response');
      return;
    }
    if (!code) {
      redirectFailure('callback_incomplete');
      return;
    }
    if (!fetchImpl) {
      redirectFailure('temporarily_unavailable');
      return;
    }

    let response;
    try {
      response = await fetchImpl(pending.hassUrl + '/auth/token', {
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
    } catch (_error) {
      redirectFailure('temporarily_unavailable');
      return;
    }
    if (!response.ok) {
      redirectFailure('temporarily_unavailable');
      return;
    }

    let token;
    try {
      token = await response.json();
    } catch (_error) {
      redirectFailure('invalid_response');
      return;
    }
    const auth = {
      hassUrl: pending.hassUrl,
      clientId: pending.clientId,
      expires: Date.now() + Number(token.expires_in || 0) * 1000,
      refresh_token: token.refresh_token,
      access_token: token.access_token,
      expires_in: Number(token.expires_in || 0),
    };
    if (!isValidAuthData(auth)) {
      redirectFailure('invalid_response');
      return;
    }
    const current = readSession(context.cookieId);
    if (!current || JSON.stringify(current) !== JSON.stringify(consumed)) {
      redirectFailure('session_changed');
      return;
    }

    let installationAuthorized = false;
    try {
      installationAuthorized = installationAuthority.commitHomeAssistant(
          pending.hassUrl,
          normalizeHassUrl,
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
      const next = cloneSession(createEmptySession(), {
        updatedAt: Date.now(),
        authRevision: 1,
        auth: auth,
        pending: null,
        userId: null,
        userName: null,
      });
      const presentedCookieIds = getRequestCookieIds(r);
      rotateRequestSession(r, context.cookieId, next);
      let index;
      for (index = 0; index < presentedCookieIds.length; index += 1) {
        if (presentedCookieIds[index] !== context.cookieId) {
          deleteSession(presentedCookieIds[index]);
        }
      }

      sendRedirect(r, appendOAuthCallbackMarker(pending.returnTo));
    } catch (_error) {
      redirectFailure('temporarily_unavailable');
    }
  }

  async function handleRequest(r) {
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

  async function handle(r) {
    try {
      await handleRequest(r);
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        return;
      }
      throw error;
    }
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
          tenantId: HOME_ASSISTANT_INGRESS_TENANT_ID,
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
    if (
      !context ||
      !context.session.auth ||
      context.session.auth.expires <= Date.now()
    ) {
      return null;
    }

    return {
      providerId: 'home_assistant',
      source: 'standalone_session',
      tenantId: createHomeAssistantTenantId(context.session.auth.hassUrl),
      sessionId: context.session.sessionId,
      userId: null,
      userName: null,
    };
  }

  return {
    cookieNames: cookieNames,
    createRequestSession: createRequestSession,
    cleanupSessions: cleanupSessions,
    deleteSession: deleteSession,
    discardLegacyGlobalSession: discardLegacyGlobalSession,
    getRequestSession: getRequestSession,
    handle: handle,
    readSession: readSession,
    renewRequestSession: renewRequestSession,
    resolveAuthenticatedPrincipal: resolveAuthenticatedPrincipalForStore,
    resolveStandaloneAuthSession: resolveStandaloneAuthSession,
    sanitizeSession: sanitizeSession,
    rotateRequestSession: rotateRequestSession,
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
  AUTH_REVISION_HEADER: AUTH_REVISION_HEADER,
  SESSION_CAPACITY_ERROR_CODE: SESSION_CAPACITY_ERROR_CODE,
  SESSION_RECORD_TOO_LARGE_ERROR_CODE: SESSION_RECORD_TOO_LARGE_ERROR_CODE,
  SESSION_UNAVAILABLE_ERROR_CODE: SESSION_UNAVAILABLE_ERROR_CODE,
  createAuthSessionStore: createAuthSessionStore,
  createHomeAssistantTenantId: createHomeAssistantTenantId,
  handle: handle,
  isValidAuthData: isValidAuthData,
  normalizeHassOrigin: normalizeHassOrigin,
  normalizeIngressPath: normalizeIngressPath,
  isSessionCapacityError: isSessionCapacityError,
  isSessionRecordTooLargeError: isSessionRecordTooLargeError,
  isSessionUnavailableError: isSessionUnavailableError,
  resolveAuthenticatedPrincipal: resolveAuthenticatedPrincipal,
  resolveStandaloneAuthSession: resolveStandaloneAuthSession,
  sanitizeSession: sanitizeSession,
};
