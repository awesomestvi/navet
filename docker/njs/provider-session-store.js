import fs from 'fs';
import installationCookieScope from './installation-cookie-scope.js';

const COOKIE_ID_PATTERN = /^[a-f0-9]{64}$/;
const SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = SESSION_IDLE_TTL_MS / 1000;
const DEFAULT_MAX_SESSIONS = 128;
const TEMP_FILE_TTL_MS = 60 * 60 * 1000;
const SESSION_RECORD_TOO_LARGE_ERROR_CODE = 'credential-session-record-too-large';
const SESSION_RECORD_TOO_LARGE_STATUS = 507;
const SESSION_CAPACITY_ERROR_CODE = 'credential-session-capacity-reached';
const SESSION_CAPACITY_STATUS = 507;

function createSessionRecordTooLargeError() {
  const error = new Error('Provider credential session exceeds the storage limit');
  error.code = SESSION_RECORD_TOO_LARGE_ERROR_CODE;
  error.statusCode = SESSION_RECORD_TOO_LARGE_STATUS;
  return error;
}

function createSessionCapacityError() {
  const error = new Error('Provider credential session capacity has been reached');
  error.code = SESSION_CAPACITY_ERROR_CODE;
  error.statusCode = SESSION_CAPACITY_STATUS;
  return error;
}

function isSessionRecordTooLargeError(error) {
  return Boolean(error && error.code === SESSION_RECORD_TOO_LARGE_ERROR_CODE);
}

function isSessionCapacityError(error) {
  return Boolean(error && error.code === SESSION_CAPACITY_ERROR_CODE);
}

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

function buildSessionCookie(r, cookieName, cookieId, maxAgeSeconds, pathOverride) {
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

function secureRandomHex(bytes) {
  const values = new Uint32Array(Math.ceil(bytes / 4));
  crypto.getRandomValues(values);
  let output = '';
  let index;

  for (index = 0; index < values.length; index += 1) {
    output += values[index].toString(16).padStart(8, '0');
  }

  return output.slice(0, bytes * 2);
}

function isSameOriginMutation(r) {
  const origin = getHeader(r && r.headersIn, 'Origin').trim();
  return !origin || origin === getRequestOrigin(r);
}

function isStrictSameOriginMutation(r) {
  const origin = getHeader(r && r.headersIn, 'Origin').trim();
  return Boolean(origin) && origin === getRequestOrigin(r);
}

function createProviderSessionStore(options) {
  const settings = options || {};
  const cookieNames =
    settings.cookieNames ||
    installationCookieScope.createInstallationCookieNames(
      settings.cookieName,
      settings
    );
  const cookieName = cookieNames.currentName;
  const legacyCookieName = cookieNames.legacyName;
  const hasScopedCookie = cookieNames.scoped === true;
  const sessionsDirectory = settings.sessionsDirectory;
  const legacySessionPath = settings.legacySessionPath || '';
  const maxRecordBytes = settings.maxRecordBytes;
  const createRecord = settings.createRecord;
  const isValidRecord = settings.isValidRecord;
  const idleTtlMs = settings.idleTtlMs || SESSION_IDLE_TTL_MS;
  const maxSessions = settings.maxSessions || DEFAULT_MAX_SESSIONS;
  // nginx evaluates the proxy URL, authorization, and cookie js_set handlers
  // against the same request. Keep that request's parsed record without
  // retaining browser credentials in a process-wide session cache. njs 0.8.10
  // does not expose WeakMap, so use an own property on the request wrapper and
  // fall back to an uncached read if that host object is not extensible.
  const requestSessionCacheKey = '__navetProviderSessionCache_' + cookieName;
  const requestSessionCacheOwner = {};
  let storageMutationVersion = 0;

  if (
    typeof cookieName !== 'string' ||
    !/^[a-z0-9_]+$/.test(cookieName) ||
    typeof legacyCookieName !== 'string' ||
    !/^[a-z0-9_]+$/.test(legacyCookieName) ||
    typeof sessionsDirectory !== 'string' ||
    !sessionsDirectory ||
    typeof maxRecordBytes !== 'number' ||
    typeof idleTtlMs !== 'number' ||
    idleTtlMs <= 0 ||
    typeof maxSessions !== 'number' ||
    maxSessions < 1 ||
    typeof createRecord !== 'function' ||
    typeof isValidRecord !== 'function'
  ) {
    throw new Error('Invalid provider session store configuration');
  }

  function ensureDirectory() {
    try {
      fs.mkdirSync(sessionsDirectory, { recursive: true, mode: 0o700 });
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  function markStorageMutation() {
    storageMutationVersion += 1;
  }

  function canCacheRequest(r) {
    return Boolean(
      r && (typeof r === 'object' || typeof r === 'function')
    );
  }

  function getCachedRequestSession(r) {
    if (!canCacheRequest(r)) {
      return undefined;
    }

    let cached;
    try {
      cached = r[requestSessionCacheKey];
    } catch (_error) {
      return undefined;
    }
    if (
      !cached ||
      cached.owner !== requestSessionCacheOwner ||
      cached.storageMutationVersion !== storageMutationVersion ||
      cached.cookieHeader !== getHeader(r.headersIn, 'Cookie')
    ) {
      return undefined;
    }

    return cached.context;
  }

  function cacheRequestSession(r, context) {
    if (canCacheRequest(r)) {
      try {
        r[requestSessionCacheKey] = {
          context: context,
          cookieHeader: getHeader(r.headersIn, 'Cookie'),
          owner: requestSessionCacheOwner,
          storageMutationVersion: storageMutationVersion,
        };
      } catch (_error) {
        // Some host wrappers may be non-extensible. Correctness does not rely
        // on memoization, so leave that request uncached.
      }
    }
    return context;
  }

  function discardLegacyGlobalSession() {
    if (!legacySessionPath) {
      return;
    }

    try {
      fs.unlinkSync(legacySessionPath);
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function getCookieIds(r, requestedCookieName) {
    const values = [];
    const parts = String(getHeader(r && r.headersIn, 'Cookie') || '').split(';');
    let index;
    for (index = 0; index < parts.length; index += 1) {
      const entry = parts[index].trim();
      const separator = entry.indexOf('=');
      if (
        separator <= 0 ||
        entry.slice(0, separator).trim() !== requestedCookieName
      ) {
        continue;
      }
      const value = entry.slice(separator + 1).trim();
      if (COOKIE_ID_PATTERN.test(value) && values.indexOf(value) === -1) {
        values.push(value);
      }
    }
    return values;
  }

  function getSessionPath(cookieId) {
    return sessionsDirectory + '/' + cookieId + '.json';
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

  function deleteSessionPath(filePath) {
    try {
      fs.unlinkSync(filePath);
      markStorageMutation();
    } catch (error) {
      if (!error || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  function isExpiredRecord(record, now) {
    if (
      !record ||
      typeof record.updatedAt !== 'number' ||
      record.updatedAt + idleTtlMs < now
    ) {
      return true;
    }

    if (!record.auth && !record.pending) {
      return true;
    }

    return Boolean(
      !record.auth &&
        record.pending &&
        typeof record.pending.expiresAt === 'number' &&
        record.pending.expiresAt < now
    );
  }

  function readSession(cookieId) {
    if (!COOKIE_ID_PATTERN.test(String(cookieId || ''))) {
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
    if (stat.size > maxRecordBytes) {
      deleteSessionPath(sessionPath);
      return null;
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
    let record;
    try {
      record = JSON.parse(serialized);
    } catch (_error) {
      deleteSessionPath(sessionPath);
      return null;
    }
    if (!isValidRecord(record) || isExpiredRecord(record, Date.now())) {
      deleteSessionPath(sessionPath);
      return null;
    }
    return record;
  }

  function getRequestSessions(r) {
    discardLegacyGlobalSession();
    let contexts = [];
    const currentCookieIds = getCookieIds(r, cookieName);
    let index;
    for (index = 0; index < currentCookieIds.length; index += 1) {
      const session = readSession(currentCookieIds[index]);
      if (session) {
        contexts.push({
          cookieId: currentCookieIds[index],
          session: session,
        });
      }
    }
    if (contexts.length === 0 && hasScopedCookie) {
      const legacyCookieIds = getCookieIds(r, legacyCookieName);
      for (index = 0; index < legacyCookieIds.length; index += 1) {
        const legacySession = readSession(legacyCookieIds[index]);
        if (legacySession) {
          contexts.push({
            cookieId: legacyCookieIds[index],
            session: legacySession,
          });
        }
      }
    }
    contexts.sort(function (left, right) {
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
    return contexts;
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

      const record = readSession(match[1]);
      if (record) {
        active.push({
          authenticated: Boolean(record.auth),
          cookieId: match[1],
          updatedAt: record.updatedAt,
        });
      }
    }
    return active;
  }

  function cleanupSessions(preserveCookieId, reserveSlots) {
    const active = listActiveSessions(Date.now());
    active.sort(function (left, right) {
      if (left.authenticated !== right.authenticated) {
        return left.authenticated ? 1 : -1;
      }
      return left.updatedAt - right.updatedAt;
    });
    const targetCount = Math.max(0, maxSessions - (reserveSlots || 0));
    let currentCount = active.length;
    let index = 0;
    while (currentCount > targetCount && index < active.length) {
      const candidate = active[index];
      index += 1;
      if (candidate.cookieId === preserveCookieId) {
        continue;
      }
      if (candidate.authenticated) {
        continue;
      }
      deleteSessionPath(getSessionPath(candidate.cookieId));
      currentCount -= 1;
    }
    return currentCount;
  }

  function writeSessionFile(cookieId, record) {
    if (!COOKIE_ID_PATTERN.test(String(cookieId || '')) || !isValidRecord(record)) {
      throw new Error('Invalid provider session');
    }

    const serialized = JSON.stringify(record);
    if (Buffer.byteLength(serialized, 'utf8') > maxRecordBytes) {
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
      markStorageMutation();
    } catch (error) {
      deletePath(tempPath);
      throw error;
    }
  }

  function writeSession(cookieId, record) {
    if (!COOKIE_ID_PATTERN.test(String(cookieId || '')) || !isValidRecord(record)) {
      throw new Error('Invalid provider session');
    }

    const serialized = JSON.stringify(record);
    if (Buffer.byteLength(serialized, 'utf8') > maxRecordBytes) {
      throw createSessionRecordTooLargeError();
    }

    ensureDirectory();
    const sessionPath = getSessionPath(cookieId);
    let isExisting = false;
    try {
      fs.statSync(sessionPath);
      isExisting = true;
    } catch (_error) {
      isExisting = false;
    }
    if (!isExisting) {
      const remaining = cleanupSessions('', 1);
      if (remaining > maxSessions - 1) {
        throw createSessionCapacityError();
      }
    }
    writeSessionFile(cookieId, record);
  }

  function deleteSession(cookieId) {
    if (!COOKIE_ID_PATTERN.test(String(cookieId || ''))) {
      return;
    }

    deleteSessionPath(getSessionPath(cookieId));
  }

  function deleteRequestSessions(r, preserveCookieId) {
    const cookieIds = getCookieIds(r, cookieName);
    if (hasScopedCookie) {
      const legacyCookieIds = getCookieIds(r, legacyCookieName);
      let legacyIndex;
      for (legacyIndex = 0; legacyIndex < legacyCookieIds.length; legacyIndex += 1) {
        if (
          readSession(legacyCookieIds[legacyIndex]) &&
          cookieIds.indexOf(legacyCookieIds[legacyIndex]) === -1
        ) {
          cookieIds.push(legacyCookieIds[legacyIndex]);
        }
      }
    }
    let index;
    for (index = 0; index < cookieIds.length; index += 1) {
      if (cookieIds[index] !== preserveCookieId) {
        deleteSession(cookieIds[index]);
      }
    }
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
    const ingressPath = normalizeIngressPath(getHeader(r && r.headersIn, 'X-Ingress-Path'));
    r.headersOut['Set-Cookie'] = ingressPath
      ? [
          buildSessionCookie(r, cookieName, '', 0, ingressPath),
          buildSessionCookie(r, cookieName, '', 0, '/'),
        ]
      : buildSessionCookie(r, cookieName, '', 0, '/');
  }

  function createRequestSession(r) {
    discardLegacyGlobalSession();
    const existing = getRequestSessions(r)[0] || null;
    if (existing) {
      setSessionCookie(r, existing.cookieId);
      return cacheRequestSession(r, existing);
    }

    const cookieId = secureRandomHex(32);
    const session = createRecord();
    writeSession(cookieId, session);
    setSessionCookie(r, cookieId);
    return cacheRequestSession(r, { cookieId: cookieId, session: session });
  }

  function rotateRequestSession(r, previousCookieId, record) {
    const staleCookieIds = getCookieIds(r, cookieName);
    if (hasScopedCookie) {
      const legacyCookieIds = getCookieIds(r, legacyCookieName);
      let legacyIndex;
      for (legacyIndex = 0; legacyIndex < legacyCookieIds.length; legacyIndex += 1) {
        if (
          readSession(legacyCookieIds[legacyIndex]) &&
          staleCookieIds.indexOf(legacyCookieIds[legacyIndex]) === -1
        ) {
          staleCookieIds.push(legacyCookieIds[legacyIndex]);
        }
      }
    }
    if (
      previousCookieId &&
      COOKIE_ID_PATTERN.test(String(previousCookieId)) &&
      staleCookieIds.indexOf(previousCookieId) === -1
    ) {
      staleCookieIds.push(previousCookieId);
    }
    const cookieId = secureRandomHex(32);
    if (previousCookieId && readSession(previousCookieId)) {
      writeSessionFile(cookieId, record);
    } else {
      writeSession(cookieId, record);
    }
    setSessionCookie(r, cookieId);
    let index;
    for (index = 0; index < staleCookieIds.length; index += 1) {
      if (staleCookieIds[index] !== cookieId) {
        deleteSession(staleCookieIds[index]);
      }
    }
    return cacheRequestSession(r, { cookieId: cookieId, session: record });
  }

  function renewRequestSession(r, context) {
    const next = {};
    let key;
    for (key in context.session) {
      if (Object.prototype.hasOwnProperty.call(context.session, key)) {
        next[key] = context.session[key];
      }
    }
    next.updatedAt = Date.now();
    writeSession(context.cookieId, next);
    setSessionCookie(r, context.cookieId);
    return cacheRequestSession(r, {
      cookieId: context.cookieId,
      session: next,
    });
  }

  function getRequestSession(r) {
    const cached = getCachedRequestSession(r);
    if (cached !== undefined) {
      return cached;
    }

    discardLegacyGlobalSession();
    return cacheRequestSession(r, getRequestSessions(r)[0] || null);
  }

  function touchRequestSession(r, minimumIntervalMs) {
    const context = getRequestSession(r);
    if (!context || !context.session.auth) {
      return '';
    }

    const interval =
      typeof minimumIntervalMs === 'number' && minimumIntervalMs > 0
        ? minimumIntervalMs
        : 24 * 60 * 60 * 1000;
    if (context.session.updatedAt + interval < Date.now()) {
      const next = {};
      let key;
      for (key in context.session) {
        if (Object.prototype.hasOwnProperty.call(context.session, key)) {
          next[key] = context.session[key];
        }
      }
      next.updatedAt = Date.now();
      writeSession(context.cookieId, next);
      cacheRequestSession(r, {
        cookieId: context.cookieId,
        session: next,
      });
    }

    return buildSessionCookie(
      r,
      cookieName,
      context.cookieId,
      COOKIE_MAX_AGE_SECONDS
    );
  }

  return {
    cookieNames: cookieNames,
    clearSessionCookie: clearSessionCookie,
    createRequestSession: createRequestSession,
    cleanupSessions: cleanupSessions,
    deleteSession: deleteSession,
    deleteRequestSessions: deleteRequestSessions,
    discardLegacyGlobalSession: discardLegacyGlobalSession,
    getRequestSession: getRequestSession,
    getRequestSessions: getRequestSessions,
    readSession: readSession,
    renewRequestSession: renewRequestSession,
    rotateRequestSession: rotateRequestSession,
    setSessionCookie: setSessionCookie,
    touchRequestSession: touchRequestSession,
    writeSession: writeSession,
  };
}

export default {
  SESSION_CAPACITY_ERROR_CODE,
  SESSION_CAPACITY_STATUS,
  SESSION_RECORD_TOO_LARGE_ERROR_CODE,
  SESSION_RECORD_TOO_LARGE_STATUS,
  createProviderSessionStore,
  getHeader,
  getRequestOrigin,
  isSameOriginMutation,
  isSessionCapacityError,
  isSessionRecordTooLargeError,
  isStrictSameOriginMutation,
  secureRandomHex,
};
