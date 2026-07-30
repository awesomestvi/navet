import providerSessionModule from './provider-session-store.js';
import installationAuthorityModule from './installation-authority.js';

const createProviderSessionStore = providerSessionModule.createProviderSessionStore;
const isStrictSameOriginMutation = providerSessionModule.isStrictSameOriginMutation;
const isSessionRecordTooLargeError =
  providerSessionModule.isSessionRecordTooLargeError;
const isSessionCapacityError = providerSessionModule.isSessionCapacityError;
const SESSION_CAPACITY_ERROR_CODE =
  providerSessionModule.SESSION_CAPACITY_ERROR_CODE;
const SESSION_CAPACITY_STATUS =
  providerSessionModule.SESSION_CAPACITY_STATUS;
const SESSION_RECORD_TOO_LARGE_ERROR_CODE =
  providerSessionModule.SESSION_RECORD_TOO_LARGE_ERROR_CODE;
const SESSION_RECORD_TOO_LARGE_STATUS =
  providerSessionModule.SESSION_RECORD_TOO_LARGE_STATUS;

const OPENHAB_COOKIE_NAME = 'navet_openhab_session';
const OPENHAB_SESSIONS_DIRECTORY = '/data/navet-provider-sessions/openhab';
const LEGACY_OPENHAB_PATH = '/data/navet-openhab-session.json';
const MAX_OPENHAB_REQUEST_BYTES = 12 * 1024;
const MAX_OPENHAB_RECORD_BYTES = 16 * 1024;
const PROVIDER_SESSION_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const OPENHAB_VALIDATE_TIMEOUT_MESSAGE = 'Unable to verify the openHAB connection';
const OPENHAB_LOGIN_ATTEMPT_LIMIT = 5;
const OPENHAB_LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const OPENHAB_LOGIN_RATE_LIMIT_MAX_SOURCES = 512;

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

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function parseIpv4(hostname) {
  const parts = String(hostname || '').split('.');
  if (parts.length !== 4) {
    return null;
  }
  const values = [];
  let index;
  for (index = 0; index < parts.length; index += 1) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(parts[index])) {
      return null;
    }
    const value = Number(parts[index]);
    if (value < 0 || value > 255) {
      return null;
    }
    values.push(value);
  }
  return values;
}

function hasUnsafeUrlCharacters(value) {
  return /[\u0000-\u0020\u007f\\]/.test(value);
}

function isValidPort(value) {
  if (!/^[0-9]+$/.test(value)) {
    return false;
  }
  const port = Number(value);
  return Number.isFinite(port) && port >= 1 && port <= 65535;
}

function isAllowedOpenHABHostname(value) {
  const hostname = String(value || '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    return (
      ipv4[0] === 10 ||
      (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
      (ipv4[0] === 192 && ipv4[1] === 168)
    );
  }
  if (hostname.includes(':')) {
    return hostname.startsWith('fc') || hostname.startsWith('fd');
  }
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.length > 253 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
      hostname
    )
  ) {
    return false;
  }
  return !hostname.includes('.') || hostname.endsWith('.local');
}

function isAllowedPublicHttpsHostname(value) {
  const hostname = String(value || '').toLowerCase();
  if (
    parseIpv4(hostname) ||
    hostname.includes(':') ||
    !hostname.includes('.') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.home.arpa') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.example')
  ) {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(
    hostname
  );
}

function normalizeOpenHABAuthority(value, protocol) {
  if (!value || value.includes('@') || hasUnsafeUrlCharacters(value)) {
    return '';
  }

  let hostname;
  let serializedHostname;
  let port = '';
  if (value.startsWith('[')) {
    const closingBracket = value.indexOf(']');
    if (closingBracket <= 1) {
      return '';
    }
    hostname = value.slice(1, closingBracket);
    const remainder = value.slice(closingBracket + 1);
    if (
      !hostname.includes(':') ||
      !/^[0-9A-Fa-f:.]+$/.test(hostname) ||
      (remainder &&
        (!remainder.startsWith(':') || !isValidPort(remainder.slice(1))))
    ) {
      return '';
    }
    port = remainder ? remainder.slice(1) : '';
    serializedHostname = '[' + hostname.toLowerCase() + ']';
  } else {
    const colonIndex = value.lastIndexOf(':');
    if (colonIndex !== value.indexOf(':')) {
      return '';
    }
    hostname = colonIndex === -1 ? value : value.slice(0, colonIndex);
    port = colonIndex === -1 ? '' : value.slice(colonIndex + 1);
    if (
      !/^[A-Za-z0-9.-]+$/.test(hostname) ||
      (colonIndex !== -1 && !isValidPort(port))
    ) {
      return '';
    }
    serializedHostname = hostname.toLowerCase();
  }

  if (
    !isAllowedOpenHABHostname(hostname) &&
    !(protocol === 'https' && isAllowedPublicHttpsHostname(hostname))
  ) {
    return '';
  }
  const numericPort = port ? Number(port) : null;
  const canonicalPort =
    numericPort === null ||
    (protocol === 'http' && numericPort === 80) ||
    (protocol === 'https' && numericPort === 443)
      ? ''
      : ':' + String(numericPort);
  return serializedHostname + canonicalPort;
}

function normalizeOpenHABBaseUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const candidate = value.trim();
  if (!candidate || hasUnsafeUrlCharacters(candidate)) {
    return '';
  }

  const match = /^(https?):\/\/([^/?#]+)([^?#]*)$/i.exec(candidate);
  if (!match || !match[1] || !match[2]) {
    return '';
  }
  const protocol = match[1].toLowerCase();
  const authority = normalizeOpenHABAuthority(match[2], protocol);
  const pathname = match[3] || '';
  if (!authority || (pathname && !pathname.startsWith('/')) || /%25/i.test(pathname)) {
    return '';
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname || '/');
  } catch (_error) {
    return '';
  }
  if (
    decodedPath.includes('\\') ||
    decodedPath.split('/').some(function (segment) {
      return segment === '..' || segment === '.';
    })
  ) {
    return '';
  }

  return protocol + '://' + authority + pathname.replace(/\/+$/, '');
}

function normalizeOpenHABSession(value) {
  const hassUrl = value && normalizeOpenHABBaseUrl(value.hassUrl);
  if (
    !hassUrl ||
    typeof value.username !== 'string' ||
    value.username.trim().length === 0 ||
    typeof value.password !== 'string' ||
    value.password.length === 0
  ) {
    return null;
  }
  return {
    hassUrl: hassUrl,
    username: value.username.trim(),
    password: value.password,
  };
}

function isValidOpenHABSession(value) {
  const normalized = normalizeOpenHABSession(value);
  return Boolean(
    normalized &&
      normalized.hassUrl === value.hassUrl &&
      normalized.username === value.username
  );
}

function isValidStoredOpenHABSession(value) {
  return (
    value &&
    value.version === 1 &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    (value.auth === null || isValidOpenHABSession(value.auth))
  );
}

function createEmptyOpenHABSession() {
  const now = Date.now();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    auth: null,
  };
}

function sanitizeOpenHABSession(session) {
  return {
    authenticated: true,
    hassUrl: session.hassUrl,
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
  };
}

function createOpenHABLoginRateLimiter(options) {
  const settings = options || {};
  const attemptLimit =
    settings.attemptLimit || OPENHAB_LOGIN_ATTEMPT_LIMIT;
  const windowMs =
    settings.windowMs || OPENHAB_LOGIN_RATE_LIMIT_WINDOW_MS;
  const maxSources =
    settings.maxSources || OPENHAB_LOGIN_RATE_LIMIT_MAX_SOURCES;
  const attemptsBySource = Object.create(null);

  function getSource(r) {
    const value =
      (r && typeof r.remoteAddress === 'string' && r.remoteAddress) ||
      (r &&
        r.variables &&
        typeof r.variables.remote_addr === 'string' &&
        r.variables.remote_addr) ||
      'unknown';
    const normalized = String(value).trim();
    return normalized && normalized.length <= 128 ? normalized : 'unknown';
  }

  function pruneExpired(now) {
    const sources = Object.keys(attemptsBySource);
    let index;
    for (index = 0; index < sources.length; index += 1) {
      if (attemptsBySource[sources[index]].resetAt <= now) {
        delete attemptsBySource[sources[index]];
      }
    }
  }

  function reserveSource(now) {
    const sources = Object.keys(attemptsBySource);
    if (sources.length < maxSources) {
      return;
    }
    let oldestSource = sources[0];
    let index;
    for (index = 1; index < sources.length; index += 1) {
      if (
        attemptsBySource[sources[index]].resetAt <
        attemptsBySource[oldestSource].resetAt
      ) {
        oldestSource = sources[index];
      }
    }
    delete attemptsBySource[oldestSource];
  }

  function consume(r) {
    const now = Date.now();
    pruneExpired(now);
    const source = getSource(r);
    let attempt = attemptsBySource[source];
    if (!attempt) {
      reserveSource(now);
      attempt = { count: 0, resetAt: now + windowMs };
      attemptsBySource[source] = attempt;
    }
    if (attempt.count >= attemptLimit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((attempt.resetAt - now) / 1000)
        ),
      };
    }
    attempt.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  function reset(r) {
    delete attemptsBySource[getSource(r)];
  }

  return {
    consume: consume,
    reset: reset,
  };
}

function createOpenHABSessionStore(options) {
  const settings = options || {};
  const fetchImpl =
    settings.fetch ||
    (typeof ngx !== 'undefined' && ngx && typeof ngx.fetch === 'function'
      ? ngx.fetch.bind(ngx)
      : null);
  const bindingStore = createProviderSessionStore({
    cookieName: OPENHAB_COOKIE_NAME,
    cookieNames: settings.cookieNames,
    installationKey: settings.installationKey,
    keyPath: settings.keyPath,
    sessionsDirectory: settings.sessionsDirectory || OPENHAB_SESSIONS_DIRECTORY,
    legacySessionPath: settings.legacySessionPath || LEGACY_OPENHAB_PATH,
    maxRecordBytes: MAX_OPENHAB_RECORD_BYTES,
    createRecord: createEmptyOpenHABSession,
    isValidRecord: isValidStoredOpenHABSession,
  });
  const installationAuthority =
    settings.installationAuthority || installationAuthorityModule;
  const loginRateLimiter =
    settings.loginRateLimiter ||
    createOpenHABLoginRateLimiter();

  async function validateOpenHABSession(session) {
    if (!fetchImpl) {
      throw new Error(OPENHAB_VALIDATE_TIMEOUT_MESSAGE);
    }

    const normalizedBaseUrl = session.hassUrl.replace(/\/+$/, '');
    const allowInsecureTls =
      typeof process !== 'undefined' &&
      process.env &&
      /^(1|true|yes)$/i.test(
        String(process.env.NAVET_ALLOW_INSECURE_PROVIDER_TLS || '')
      );
    const response = await fetchImpl(
      normalizedBaseUrl + '/rest/items?recursive=false&limit=1',
      {
        method: 'GET',
        redirect: 'manual',
        verify: !allowInsecureTls,
        headers: {
          Accept: 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(session.username + ':' + session.password).toString('base64'),
        },
      }
    );

    if (!response.ok) {
      throw new Error(OPENHAB_VALIDATE_TIMEOUT_MESSAGE);
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error(OPENHAB_VALIDATE_TIMEOUT_MESSAGE);
    }
  }

  async function handleSessionGet(r) {
    const context = bindingStore.getRequestSession(r);
    if (!context || !context.session.auth) {
      sendNoContent(r);
      return;
    }

    const renewed = bindingStore.renewRequestSession(r, context);
    sendJson(r, 200, sanitizeOpenHABSession(renewed.session.auth));
  }

  async function handleSessionPut(r) {
    const context = bindingStore.getRequestSession(r);
    if (!isStrictSameOriginMutation(r)) {
      sendJson(r, 403, { error: 'Cross-origin session mutation is not allowed' });
      return;
    }

    const body = r.requestText || '';
    if (
      !body ||
      Buffer.byteLength(body, 'utf8') > MAX_OPENHAB_REQUEST_BYTES
    ) {
      sendJson(r, 400, { error: 'Invalid openHAB session body' });
      return;
    }

    const parsed = normalizeOpenHABSession(parseJson(body));
    if (!parsed) {
      sendJson(r, 400, { error: 'Unsupported openHAB session' });
      return;
    }
    const installationAccess = installationAuthority.authorizeOpenHAB(
      r,
      parsed.hassUrl,
      normalizeOpenHABBaseUrl
    );
    if (!installationAccess.allowed) {
      sendJson(r, 403, {
        error: 'Operator pairing is required for this openHAB installation',
      });
      return;
    }
    const rateLimit = loginRateLimiter.consume(r);
    if (!rateLimit.allowed) {
      r.headersOut['Retry-After'] = String(rateLimit.retryAfterSeconds);
      sendJson(r, 429, {
        error: 'Too many openHAB login attempts. Try again later.',
      });
      return;
    }

    try {
      await validateOpenHABSession(parsed);
      const next = cloneRecord(createEmptyOpenHABSession(), {
        updatedAt: Date.now(),
        auth: parsed,
      });
      if (context) {
        const current = bindingStore.readSession(context.cookieId);
        if (!current || JSON.stringify(current) !== JSON.stringify(context.session)) {
          sendJson(r, 409, {
            error: 'openHAB session changed before login completed',
          });
          return;
        }
      }
      if (
        !installationAuthority.commitOpenHAB(
          parsed.hassUrl,
          normalizeOpenHABBaseUrl,
          installationAccess.pairingVerified === true
        )
      ) {
        sendJson(r, 403, { error: 'openHAB installation is not authorized' });
        return;
      }
      bindingStore.rotateRequestSession(r, context ? context.cookieId : '', next);
      loginRateLimiter.reset(r);
      sendJson(r, 200, sanitizeOpenHABSession(parsed));
    } catch (error) {
      if (sendSessionStoreError(r, error)) {
        loginRateLimiter.reset(r);
        return;
      }
      sendJson(r, 400, { error: OPENHAB_VALIDATE_TIMEOUT_MESSAGE });
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

  async function handle(r) {
    if (r.method === 'GET') {
      await handleSessionGet(r);
      return;
    }
    if (r.method === 'PUT') {
      await handleSessionPut(r);
      return;
    }
    if (r.method === 'DELETE') {
      handleSessionDelete(r);
      return;
    }

    r.headersOut.Allow = 'GET, PUT, DELETE';
    sendJson(r, 405, { error: 'Method not allowed' });
  }

  function resolveOpenHABSession(r) {
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
    resolveOpenHABSession: resolveOpenHABSession,
    touchSessionCookie: touchSessionCookie,
  };
}

const openHABSessionStore = createOpenHABSessionStore();

export default {
  createOpenHABLoginRateLimiter,
  createOpenHABSessionStore,
  handle: openHABSessionStore.handle,
  normalizeOpenHABBaseUrl,
  resolveOpenHABSession: openHABSessionStore.resolveOpenHABSession,
  touchSessionCookie: openHABSessionStore.touchSessionCookie,
};
