import hashCrypto from 'crypto';
import fs from 'fs';
import installationCookieScope from './installation-cookie-scope.js';

const INSTALLATION_KEY_PATH = '/data/navet-installation-key';
const REQUESTS_DIRECTORY = '/data/navet-device-requests';
const SESSIONS_DIRECTORY = '/data/navet-device-sessions';
const DEVICE_COOKIE_BASE_NAME = 'navet_device_session';
const REQUEST_TTL_MS = 5 * 60 * 1000;
const DEVICE_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ID_PATTERN = /^[a-f0-9]{32}$/;
const SECRET_PATTERN = /^[a-f0-9]{64}$/;
const CODE_PATTERN = /^[a-f0-9]{12}$/;
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const SUPPORTED_LANGUAGES = [
  'en', 'de', 'fr', 'nl', 'es', 'it', 'pt', 'pl', 'sv', 'no', 'da', 'fi', 'zh',
];
const PROVIDERS = {
  home_assistant: {
    cookieName: 'navet_auth_session',
    directory: '/data/navet-auth-sessions',
  },
  homey: {
    cookieName: 'navet_homey_session',
    directory: '/data/navet-provider-sessions/homey',
  },
  openhab: {
    cookieName: 'navet_openhab_session',
    directory: '/data/navet-provider-sessions/openhab',
  },
};
const rateBuckets = {};

function validPairingPreferences(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    SUPPORTED_LANGUAGES.indexOf(value.language) === -1 ||
    typeof value.use24HourTime !== 'boolean' ||
    (value.temperatureUnit !== 'celsius' && value.temperatureUnit !== 'fahrenheit')
  ) {
    return null;
  }
  return {
    language: value.language,
    use24HourTime: value.use24HourTime,
    temperatureUnit: value.temperatureUnit,
  };
}

function consumeRate(r, action, limit, windowMs) {
  const address = String((r && r.remoteAddress) || getHeader(r && r.headersIn, 'X-Real-IP') || 'local');
  const key = action + ':' + address;
  const now = Date.now();
  const bucket = rateBuckets[key];
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function getHeader(headers, name) {
  const source = headers || {};
  const expected = String(name || '').toLowerCase();
  const keys = Object.keys(source);
  let index;
  for (index = 0; index < keys.length; index += 1) {
    if (keys[index].toLowerCase() === expected) {
      return String(source[keys[index]] || '');
    }
  }
  return '';
}

function getCookie(r, name) {
  const entries = getHeader(r && r.headersIn, 'Cookie').split(';');
  let index;
  for (index = 0; index < entries.length; index += 1) {
    const separator = entries[index].indexOf('=');
    if (separator > 0 && entries[index].slice(0, separator).trim() === name) {
      return entries[index].slice(separator + 1).trim();
    }
  }
  return '';
}

function deviceClientIdentity(r) {
  const clientId = getHeader(r && r.headersIn, 'X-Navet-Device-Client-Id');
  let name = '';
  try {
    name = decodeURIComponent(getHeader(r && r.headersIn, 'X-Navet-Device-Name'));
  } catch (_error) {
    name = '';
  }
  name = Array.from(name).filter(function (character) {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint > 0x1f && codePoint !== 0x7f;
  }).join('').trim().slice(0, 64);
  return {
    clientId: CLIENT_ID_PATTERN.test(clientId) ? clientId : null,
    name: name || 'Navet device',
  };
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

function digest(value) {
  return hashCrypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function constantTimeEquals(left, right) {
  const leftDigest = digest(left);
  const rightDigest = digest(right);
  let difference = 0;
  let index;
  for (index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest.charCodeAt(index) ^ rightDigest.charCodeAt(index);
  }
  return difference === 0;
}

function readJson(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 64 * 1024) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error instanceof SyntaxError)) {
      return null;
    }
    return null;
  }
}

function writeJson(filePath, value) {
  const directory = filePath.slice(0, filePath.lastIndexOf('/')) || '.';
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = filePath + '.tmp-' + secureRandomHex(8);
  fs.writeFileSync(temporary, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

function deletePath(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (_error) {
    // Missing or concurrently consumed records are already unavailable.
  }
}

function readInstallationKey() {
  try {
    return String(fs.readFileSync(INSTALLATION_KEY_PATH, 'utf8') || '').trim();
  } catch (_error) {
    return '';
  }
}

function scopedCookieName(baseName) {
  return installationCookieScope.createInstallationCookieNames(baseName, {
    installationKey: readInstallationKey(),
  }).currentName;
}

function formatCode(raw) {
  return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12);
}

function normalizeCode(value) {
  return String(value || '').toLowerCase().replace(/[^a-f0-9]/g, '');
}

function requestBody(r) {
  try {
    return JSON.parse((r && r.requestText) || '{}');
  } catch (_error) {
    return {};
  }
}

function requestPath(id) {
  return REQUESTS_DIRECTORY + '/' + id + '.json';
}

function sessionPath(id) {
  return SESSIONS_DIRECTORY + '/' + id + '.json';
}

function providerCookieIdsFromDirectSession(r) {
  const result = {};
  const providerIds = Object.keys(PROVIDERS);
  let index;
  for (index = 0; index < providerIds.length; index += 1) {
    const providerId = providerIds[index];
    const provider = PROVIDERS[providerId];
    const cookieId = getCookie(r, scopedCookieName(provider.cookieName));
    if (!SECRET_PATTERN.test(cookieId)) {
      continue;
    }
    const record = readJson(provider.directory + '/' + cookieId + '.json');
    if (
      record &&
      record.auth &&
      typeof record.updatedAt === 'number' &&
      record.updatedAt + DEVICE_SESSION_TTL_MS >= Date.now()
    ) {
      result[providerId] = cookieId;
    }
  }
  return result;
}

function validProviderCookieIds(candidateIds) {
  const result = {};
  const providerIds = Object.keys(candidateIds || {});
  let index;
  for (index = 0; index < providerIds.length; index += 1) {
    const providerId = providerIds[index];
    const provider = PROVIDERS[providerId];
    const cookieId = String(candidateIds[providerId] || '');
    const record = provider && SECRET_PATTERN.test(cookieId)
      ? readJson(provider.directory + '/' + cookieId + '.json')
      : null;
    if (record && record.auth && record.updatedAt + DEVICE_SESSION_TTL_MS >= Date.now()) {
      result[providerId] = cookieId;
    }
  }
  return result;
}

function hasOtherActivePrimaryProviderSession(r) {
  const providerIds = Object.keys(PROVIDERS);
  let providerIndex;
  for (providerIndex = 0; providerIndex < providerIds.length; providerIndex += 1) {
    const provider = PROVIDERS[providerIds[providerIndex]];
    const currentCookieId = getCookie(r, scopedCookieName(provider.cookieName));
    let names = [];
    try {
      names = fs.readdirSync(provider.directory);
    } catch (_error) {
      names = [];
    }
    let sessionIndex;
    for (sessionIndex = 0; sessionIndex < names.length && sessionIndex < 256; sessionIndex += 1) {
      const match = /^([a-f0-9]{64})\.json$/.exec(names[sessionIndex]);
      if (match && match[1] === currentCookieId) {
        continue;
      }
      const record = match ? readJson(provider.directory + '/' + names[sessionIndex]) : null;
      if (
        record &&
        record.auth &&
        typeof record.updatedAt === 'number' &&
        record.updatedAt + DEVICE_SESSION_TTL_MS >= Date.now()
      ) {
        return true;
      }
    }
  }
  return false;
}

function buildDeviceCookie(r, id, maxAge) {
  const attributes = [
    scopedCookieName(DEVICE_COOKIE_BASE_NAME) + '=' + id,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=' + maxAge,
  ];
  const forwarded = getHeader(r && r.headersIn, 'X-Forwarded-Proto').split(',')[0].trim();
  const scheme = String((r && r.variables && r.variables.scheme) || '');
  if (forwarded === 'https' || scheme === 'https') {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}

function demoteOtherPrimaryDevices(primaryId) {
  let names = [];
  try { names = fs.readdirSync(SESSIONS_DIRECTORY); } catch (_error) { return; }
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    const match = /^([a-f0-9]{64})\.json$/.exec(names[index]);
    if (!match || match[1] === primaryId) {
      continue;
    }
    const record = readJson(sessionPath(match[1]));
    if (!record || record.role !== 'primary') {
      continue;
    }
    delete record.role;
    record.directProviderSession = false;
    writeJson(sessionPath(match[1]), record);
  }
}

function hasOtherActiveDeviceReference(excludedDeviceId, providerId, cookieId) {
  let names = [];
  try { names = fs.readdirSync(SESSIONS_DIRECTORY); } catch (_error) { return false; }
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    const match = /^([a-f0-9]{64})\.json$/.exec(names[index]);
    if (!match || match[1] === excludedDeviceId) {
      continue;
    }
    const record = readJson(sessionPath(match[1]));
    if (
      record &&
      !record.revokedAt &&
      record.expiresAt >= Date.now() &&
      record.providerCookieIds &&
      record.providerCookieIds[providerId] === cookieId
    ) {
      return true;
    }
  }
  return false;
}

function registerPrimaryDevice(r, providerCookieIds) {
  const identity = deviceClientIdentity(r);
  let names = [];
  try { names = fs.readdirSync(SESSIONS_DIRECTORY); } catch (_error) { names = []; }
  let existing = null;
  let index;
  if (identity.clientId) {
    for (index = 0; index < names.length && index < 256; index += 1) {
      const match = /^([a-f0-9]{64})\.json$/.exec(names[index]);
      const record = match ? readJson(sessionPath(match[1])) : null;
      if (
        record &&
        record.clientId === identity.clientId &&
        !record.revokedAt &&
        record.expiresAt >= Date.now()
      ) {
        existing = { id: match[1], record: record };
        break;
      }
    }
  }
  const id = existing ? existing.id : secureRandomHex(32);
  const record = existing ? existing.record : {
    version: 1,
    id: id,
    name: identity.name,
    role: 'primary',
    clientId: identity.clientId,
    directProviderSession: true,
    providerCookieIds: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + DEVICE_SESSION_TTL_MS,
    revokedAt: null,
  };
  record.directProviderSession = true;
  record.role = 'primary';
  record.providerCookieIds = Object.assign({}, record.providerCookieIds, providerCookieIds);
  record.updatedAt = Date.now();
  record.expiresAt = Date.now() + DEVICE_SESSION_TTL_MS;
  writeJson(sessionPath(id), record);
  r.headersOut['Set-Cookie'] = buildDeviceCookie(r, id, DEVICE_SESSION_TTL_MS / 1000);
  return { id: id, record: record };
}

function getDeviceSession(r) {
  const id = getCookie(r, scopedCookieName(DEVICE_COOKIE_BASE_NAME));
  if (!SECRET_PATTERN.test(id)) {
    return null;
  }
  const record = readJson(sessionPath(id));
  if (
    !record ||
    record.version !== 1 ||
    record.revokedAt ||
    typeof record.expiresAt !== 'number' ||
    record.expiresAt < Date.now() ||
    !record.providerCookieIds ||
    typeof record.providerCookieIds !== 'object'
  ) {
    return null;
  }
  if (record.updatedAt + 60 * 1000 < Date.now()) {
    record.updatedAt = Date.now();
    writeJson(sessionPath(id), record);
  }
  return { id: id, record: record };
}

function primaryProviderCookieIds(r) {
  const requestedDeviceId = getCookie(r, scopedCookieName(DEVICE_COOKIE_BASE_NAME));
  const currentDevice = getDeviceSession(r);
  if (currentDevice) {
    return currentDevice.record.role === 'primary'
      ? validProviderCookieIds(currentDevice.record.providerCookieIds)
      : {};
  }
  if (SECRET_PATTERN.test(requestedDeviceId) && readJson(sessionPath(requestedDeviceId))) {
    return {};
  }
  return providerCookieIdsFromDirectSession(r);
}

function getProviderCookieId(r, providerId) {
  const context = getDeviceSession(r);
  if (!context || !PROVIDERS[providerId]) {
    return '';
  }
  const cookieId = context.record.providerCookieIds[providerId];
  return SECRET_PATTERN.test(String(cookieId || '')) ? cookieId : '';
}

function hasPresentedDeviceCookie(r) {
  return SECRET_PATTERN.test(getCookie(r, scopedCookieName(DEVICE_COOKIE_BASE_NAME)));
}

function isDelegatedRequest(r, providerId) {
  return hasPresentedDeviceCookie(r);
}

function replaceProviderCookieId(providerId, previousId, nextId) {
  if (!PROVIDERS[providerId] || !SECRET_PATTERN.test(previousId) || !SECRET_PATTERN.test(nextId)) {
    return;
  }
  let names = [];
  try {
    names = fs.readdirSync(SESSIONS_DIRECTORY);
  } catch (_error) {
    return;
  }
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    if (!/^([a-f0-9]{64})\.json$/.test(names[index])) {
      continue;
    }
    const filePath = SESSIONS_DIRECTORY + '/' + names[index];
    const record = readJson(filePath);
    if (record && record.providerCookieIds && record.providerCookieIds[providerId] === previousId) {
      record.providerCookieIds[providerId] = nextId;
      record.updatedAt = Date.now();
      writeJson(filePath, record);
    }
  }
}

function hasDependentDevices(providerId, cookieId) {
  let names = [];
  try { names = fs.readdirSync(SESSIONS_DIRECTORY); } catch (_error) { return false; }
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    const match = /^([a-f0-9]{64})\.json$/.exec(names[index]);
    const record = match ? readJson(sessionPath(match[1])) : null;
    if (
      record &&
      !record.revokedAt &&
      record.expiresAt >= Date.now() &&
      record.providerCookieIds &&
      record.providerCookieIds[providerId] === cookieId
    ) {
      return true;
    }
  }
  return false;
}

function revokeCurrentDevice(r) {
  const context = getDeviceSession(r);
  if (context) {
    context.record.revokedAt = Date.now();
    context.record.updatedAt = Date.now();
    writeJson(sessionPath(context.id), context.record);
  }
  if (r && r.headersOut) {
    r.headersOut['Set-Cookie'] = buildDeviceCookie(r, '', 0);
  }
  return Boolean(context);
}

function sendJson(r, status, value) {
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(status, JSON.stringify(value));
}

function sameOrigin(r) {
  const origin = getHeader(r && r.headersIn, 'Origin').trim();
  const host = getHeader(r && r.headersIn, 'Host').trim();
  const forwarded = getHeader(r && r.headersIn, 'X-Forwarded-Proto').split(',')[0].trim();
  const requestScheme = String((r && r.variables && r.variables.scheme) || '');
  const scheme = forwarded === 'https' || requestScheme === 'https' ? 'https' : 'http';
  return Boolean(origin && host && origin === scheme + '://' + host);
}

function handleRequestCreate(r) {
  const body = requestBody(r);
  let names = [];
  try { names = fs.readdirSync(REQUESTS_DIRECTORY); } catch (_error) { names = []; }
  let activeCount = 0;
  let index;
  for (index = 0; index < names.length; index += 1) {
    const match = /^([a-f0-9]{32})\.json$/.exec(names[index]);
    const existing = match ? readJson(requestPath(match[1])) : null;
    if (!existing || existing.expiresAt < Date.now() || existing.state === 'redeemed') {
      deletePath(REQUESTS_DIRECTORY + '/' + names[index]);
    } else {
      activeCount += 1;
    }
  }
  if (activeCount >= 256) {
    sendJson(r, 503, { error: 'Too many pending device requests. Try again shortly.' });
    return;
  }
  const id = secureRandomHex(16);
  const requesterSecret = secureRandomHex(32);
  const code = secureRandomHex(6);
  const expiresAt = Date.now() + REQUEST_TTL_MS;
  writeJson(requestPath(id), {
    version: 1,
    id: id,
    requesterSecretHash: digest(requesterSecret),
    codeHash: digest(code),
    createdAt: Date.now(),
    expiresAt: expiresAt,
    state: 'pending',
    deviceName:
      typeof body.deviceName === 'string' ? body.deviceName.trim().slice(0, 64) : 'Navet screen',
  });
  sendJson(r, 201, {
    id: id,
    requesterSecret: requesterSecret,
    code: formatCode(code),
    expiresAt: expiresAt,
  });
}

function handlePreview(r) {
  const body = requestBody(r);
  const code = normalizeCode(body.code);
  const providerCookieIds = primaryProviderCookieIds(r);
  if (!CODE_PATTERN.test(code) || Object.keys(providerCookieIds).length === 0) {
    sendJson(r, 403, { error: 'A signed-in primary device is required' });
    return;
  }
  const record = findPendingByCode(code);
  if (!record) {
    sendJson(r, 404, { error: 'That device request expired or was already used' });
    return;
  }
  sendJson(r, 200, {
    code: formatCode(code),
    deviceName: record.deviceName || 'Navet screen',
    providers: Object.keys(providerCookieIds),
    expiresAt: record.expiresAt,
  });
}

function validRequester(record, secret) {
  return Boolean(
    record &&
      SECRET_PATTERN.test(String(secret || '')) &&
      constantTimeEquals(digest(secret), record.requesterSecretHash)
  );
}

function handleStatus(r) {
  const id = String((r.args && r.args.id) || '');
  const secret = String((r.args && r.args.secret) || '');
  const record = ID_PATTERN.test(id) ? readJson(requestPath(id)) : null;
  if (!validRequester(record, secret)) {
    sendJson(r, 404, { error: 'Device request not found' });
    return;
  }
  const state = record.expiresAt < Date.now() && record.state === 'pending' ? 'expired' : record.state;
  sendJson(r, 200, { id: id, state: state, expiresAt: record.expiresAt });
}

function findPendingByCode(code) {
  let names = [];
  try {
    names = fs.readdirSync(REQUESTS_DIRECTORY);
  } catch (_error) {
    return null;
  }
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    const match = /^([a-f0-9]{32})\.json$/.exec(names[index]);
    if (!match) {
      continue;
    }
    const record = readJson(requestPath(match[1]));
    if (
      record &&
      record.state === 'pending' &&
      record.expiresAt >= Date.now() &&
      constantTimeEquals(digest(code), record.codeHash)
    ) {
      return record;
    }
  }
  return null;
}

function handleApprove(r) {
  const body = requestBody(r);
  const code = normalizeCode(body.code);
  const providerCookieIds = primaryProviderCookieIds(r);
  if (!CODE_PATTERN.test(code) || Object.keys(providerCookieIds).length === 0) {
    sendJson(r, 403, { error: 'A signed-in primary device is required' });
    return;
  }
  const record = findPendingByCode(code);
  if (!record) {
    sendJson(r, 404, { error: 'That device request expired or was already used' });
    return;
  }
  record.state = 'approved';
  record.approvedAt = Date.now();
  if (typeof body.deviceName === 'string' && body.deviceName.trim()) {
    record.deviceName = body.deviceName.trim().slice(0, 64);
  }
  record.providerCookieIds = providerCookieIds;
  record.preferences = validPairingPreferences(body.preferences);
  writeJson(requestPath(record.id), record);
  sendJson(r, 200, { approved: true, providers: Object.keys(providerCookieIds) });
}

function handleDeny(r) {
  const body = requestBody(r);
  const code = normalizeCode(body.code);
  const providerCookieIds = primaryProviderCookieIds(r);
  if (!CODE_PATTERN.test(code) || Object.keys(providerCookieIds).length === 0) {
    sendJson(r, 403, { error: 'A signed-in primary device is required' });
    return;
  }
  const record = findPendingByCode(code);
  if (!record) {
    sendJson(r, 404, { error: 'That device request expired or was already used' });
    return;
  }
  record.state = 'declined';
  record.declinedAt = Date.now();
  writeJson(requestPath(record.id), record);
  sendJson(r, 200, { declined: true });
}

function handleRedeem(r) {
  const body = requestBody(r);
  const id = String(body.id || '');
  const record = ID_PATTERN.test(id) ? readJson(requestPath(id)) : null;
  if (
    !validRequester(record, body.requesterSecret) ||
    record.state !== 'approved' ||
    record.expiresAt < Date.now()
  ) {
    sendJson(r, 403, { error: 'This device approval is unavailable' });
    return;
  }
  const claimedPath = requestPath(id) + '.redeeming';
  try {
    fs.renameSync(requestPath(id), claimedPath);
  } catch (_error) {
    sendJson(r, 403, { error: 'This device approval was already used' });
    return;
  }
  const claimed = readJson(claimedPath);
  if (!validRequester(claimed, body.requesterSecret) || claimed.state !== 'approved') {
    deletePath(claimedPath);
    sendJson(r, 403, { error: 'This device approval is unavailable' });
    return;
  }
  const providerCookieIds = validProviderCookieIds(claimed.providerCookieIds);
  if (Object.keys(providerCookieIds).length === 0) {
    deletePath(claimedPath);
    sendJson(r, 403, { error: 'The approving session is no longer available' });
    return;
  }
  const deviceId = secureRandomHex(32);
  writeJson(sessionPath(deviceId), {
    version: 1,
    id: deviceId,
    name: claimed.deviceName || 'Navet device',
    providerCookieIds: providerCookieIds,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + DEVICE_SESSION_TTL_MS,
    revokedAt: null,
  });
  deletePath(claimedPath);
  r.headersOut['Set-Cookie'] = buildDeviceCookie(r, deviceId, DEVICE_SESSION_TTL_MS / 1000);
  sendJson(r, 200, {
    connected: true,
    preferences: validPairingPreferences(claimed.preferences),
  });
}

function listDevices(r) {
  const isPrimary = Object.keys(primaryProviderCookieIds(r)).length > 0;
  let currentDevice = getDeviceSession(r);
  if (isPrimary && !currentDevice) {
    currentDevice = registerPrimaryDevice(r, providerCookieIdsFromDirectSession(r));
  }
  if (!isPrimary && !currentDevice) {
    sendJson(r, 403, { error: 'An authorized Navet device is required' });
    return;
  }
  let names = [];
  try { names = fs.readdirSync(SESSIONS_DIRECTORY); } catch (_error) { names = []; }
  const devices = [];
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    const match = /^([a-f0-9]{64})\.json$/.exec(names[index]);
    const record = match ? readJson(sessionPath(match[1])) : null;
    if (record && !record.revokedAt && record.expiresAt >= Date.now()) {
      devices.push({
        id: record.id,
        name: record.name,
        role: record.role === 'primary' ? 'primary' : 'authorized',
        providers: Object.keys(record.providerCookieIds || {}),
        createdAt: record.createdAt,
        lastActivityAt: record.updatedAt,
        expiresAt: record.expiresAt,
      });
    }
  }
  sendJson(r, 200, {
    access: isPrimary ? 'primary' : 'authorized',
    currentDeviceId: currentDevice ? currentDevice.id : null,
    devices: devices,
  });
}

function revokeDevice(r) {
  if (Object.keys(primaryProviderCookieIds(r)).length === 0) {
    sendJson(r, 403, { error: 'A signed-in primary device is required' });
    return;
  }
  const body = requestBody(r);
  const id = String(body.id || '');
  const record = SECRET_PATTERN.test(id) ? readJson(sessionPath(id)) : null;
  if (!record) {
    sendJson(r, 404, { error: 'Device not found' });
    return;
  }
  const providerIds = Object.keys(record.providerCookieIds || {});
  let providerIndex;
  for (providerIndex = 0; providerIndex < providerIds.length; providerIndex += 1) {
    const providerId = providerIds[providerIndex];
    const provider = PROVIDERS[providerId];
    const cookieId = String(record.providerCookieIds[providerId] || '');
    if (
      provider &&
      SECRET_PATTERN.test(cookieId) &&
      !hasOtherActiveDeviceReference(id, providerId, cookieId)
    ) {
      deletePath(provider.directory + '/' + cookieId + '.json');
    }
  }
  record.revokedAt = Date.now();
  record.updatedAt = Date.now();
  writeJson(sessionPath(id), record);
  sendJson(r, 200, { revoked: true });
}

function renameDevice(r) {
  if (Object.keys(primaryProviderCookieIds(r)).length === 0) {
    sendJson(r, 403, { error: 'A signed-in primary device is required' });
    return;
  }
  const body = requestBody(r);
  const id = String(body.id || '');
  const record = SECRET_PATTERN.test(id) ? readJson(sessionPath(id)) : null;
  if (!record) {
    sendJson(r, 404, { error: 'Device not found' });
    return;
  }
  if (body.role === 'primary') {
    demoteOtherPrimaryDevices(id);
    record.role = 'primary';
    record.directProviderSession = true;
    record.updatedAt = Date.now();
    writeJson(sessionPath(id), record);
    sendJson(r, 200, { updated: true });
    return;
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 64) : '';
  if (!name) {
    sendJson(r, 400, { error: 'Choose a valid device name' });
    return;
  }
  record.name = name;
  record.updatedAt = Date.now();
  writeJson(sessionPath(id), record);
  sendJson(r, 200, { updated: true });
}

function invalidateProviderDevices(r) {
  const body = requestBody(r);
  const providerId = String(body.providerId || '');
  const primaryIds = primaryProviderCookieIds(r);
  if (!PROVIDERS[providerId] || !primaryIds[providerId]) {
    sendJson(r, 403, { error: 'A signed-in primary provider session is required' });
    return;
  }
  let names = [];
  try { names = fs.readdirSync(SESSIONS_DIRECTORY); } catch (_error) { names = []; }
  let index;
  for (index = 0; index < names.length && index < 256; index += 1) {
    const match = /^([a-f0-9]{64})\.json$/.exec(names[index]);
    const record = match ? readJson(sessionPath(match[1])) : null;
    if (record && record.providerCookieIds && record.providerCookieIds[providerId]) {
      delete record.providerCookieIds[providerId];
      record.updatedAt = Date.now();
      if (Object.keys(record.providerCookieIds).length === 0) {
        record.revokedAt = Date.now();
      }
      writeJson(sessionPath(record.id), record);
    }
  }
  sendJson(r, 200, { invalidated: true });
}

async function handle(r) {
  if (r.method !== 'GET' && !sameOrigin(r)) {
    sendJson(r, 403, { error: 'Cross-origin device authorization is not allowed' });
    return;
  }
  const action = r.uri.split('/').pop() || 'unknown';
  const limit = r.method === 'GET' ? 240 : action === 'request' ? 20 : 30;
  if (!consumeRate(r, action + ':' + r.method, limit, 5 * 60 * 1000)) {
    sendJson(r, 429, { error: 'Too many device authorization attempts. Try again shortly.' });
    return;
  }
  if (r.uri === '/__navet_devices__/availability' && r.method === 'GET') {
    sendJson(r, 200, { available: hasOtherActivePrimaryProviderSession(r) });
    return;
  }
  if (r.uri === '/__navet_devices__/request' && r.method === 'POST') {
    handleRequestCreate(r);
    return;
  }
  if (r.uri === '/__navet_devices__/request' && r.method === 'GET') {
    handleStatus(r);
    return;
  }
  if (r.uri === '/__navet_devices__/approve' && r.method === 'POST') {
    handleApprove(r);
    return;
  }
  if (r.uri === '/__navet_devices__/preview' && r.method === 'POST') {
    handlePreview(r);
    return;
  }
  if (r.uri === '/__navet_devices__/deny' && r.method === 'POST') {
    handleDeny(r);
    return;
  }
  if (r.uri === '/__navet_devices__/redeem' && r.method === 'POST') {
    handleRedeem(r);
    return;
  }
  if (r.uri === '/__navet_devices__/current' && r.method === 'DELETE') {
    revokeCurrentDevice(r);
    sendJson(r, 200, { revoked: true });
    return;
  }
  if (r.uri === '/__navet_devices__/sessions' && r.method === 'GET') {
    listDevices(r);
    return;
  }
  if (r.uri === '/__navet_devices__/sessions' && r.method === 'DELETE') {
    revokeDevice(r);
    return;
  }
  if (r.uri === '/__navet_devices__/sessions' && r.method === 'PATCH') {
    renameDevice(r);
    return;
  }
  if (r.uri === '/__navet_devices__/providers' && r.method === 'DELETE') {
    invalidateProviderDevices(r);
    return;
  }
  sendJson(r, 404, { error: 'Unknown device authorization endpoint' });
}

export default {
  getProviderCookieId: getProviderCookieId,
  hasPresentedDeviceCookie: hasPresentedDeviceCookie,
  hasDependentDevices: hasDependentDevices,
  handle: handle,
  isDelegatedRequest: isDelegatedRequest,
  replaceProviderCookieId: replaceProviderCookieId,
  revokeCurrentDevice: revokeCurrentDevice,
};
