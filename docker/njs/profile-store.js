import fs from 'fs';
import hashCrypto from 'crypto';
import authStore from './auth-store.js';
import installationCookieScope from './installation-cookie-scope.js';
import providerSessionStore from './provider-session-store.js';

const isStrictSameOriginMutation =
  providerSessionStore.isStrictSameOriginMutation;

const CONTRACT_VERSION = 1;
const SETTINGS_PROFILE_SCHEMA_VERSION = 1;
const PROFILE_ID = 'default';
const HISTORY_LIMIT = 20;
const MAX_HISTORY_BYTES = 4 * 1024 * 1024;
const MAX_PROFILE_BYTES = 1024 * 1024;
const MAX_PREFERENCE_BYTES = 256 * 1024;
const MAX_PREFERENCE_COLLECTION_BYTES = 4 * 1024 * 1024;
const MAX_WORKSPACE_BYTES = 128 * 1024;
const MAX_PROFILE_STATE_BYTES = 128 * 1024;
const MAX_CLIENT_REGISTRY_BYTES = 512 * 1024;
const MAX_CLIENT_BINDING_BOOTSTRAP_BYTES = 128 * 1024;
const CLIENT_REGISTRY_LIMIT = 200;
const MAX_PATCH_OPERATIONS = 200;
const PROFILE_HASH_PATTERN = /^[a-f0-9]{64}$/;
const CLIENT_TOUCH_INTERVAL_MS = 15 * 60 * 1000;
const TENANT_ID_PATTERN = /^hat_[a-f0-9]{64}$/;
const CLIENT_BINDING_COOKIE_NAME = 'navet_profile_client';
const CLIENT_BINDING_COOKIE_NAMES =
  installationCookieScope.createInstallationCookieNames(
    CLIENT_BINDING_COOKIE_NAME
  );
const CLIENT_BINDING_PATTERN = /^[a-f0-9]{64}$/;
const CLIENT_BINDING_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const CLIENT_STALE_AFTER_MS = 90 * 24 * 60 * 60 * 1000;
// Tolerate brief host clock skew, but reset timestamps beyond this window so
// they cannot retain a registry slot indefinitely.
const CLIENT_FUTURE_SKEW_MS = 5 * 60 * 1000;
const CLIENT_BINDING_BOOTSTRAP_TTL_MS = 5 * 1000;
const CLIENT_BINDING_BOOTSTRAP_LIMIT = 256;
const SHARED_SETTING_KEYS = {
  showWeatherInHeader: true,
  showHomeSummaryBar: true,
  weatherForecastMode: true,
  weatherMetricIds: true,
  advancedCustomizationEnabled: true,
  customSidebarActions: true,
  customSummaryPills: true,
};
const ACCOUNT_SETTING_KEYS = {
  language: true,
  showNotifications: true,
  use24HourTime: true,
  temperatureUnit: true,
  defaultView: true,
  entityInteractionMode: true,
};
const CLIENT_SETTING_KEYS = {
  headerTitleMode: true,
  headerCustomText: true,
  keepDeviceAwake: true,
  compactMode: true,
  kioskMode: true,
  dashboardProfileMode: true,
  dashboardSpaceMode: true,
  disableAnimations: true,
  lowPowerMode: true,
  effectsQuality: true,
  effectsQualityUserOverride: true,
  cameraDashboardViewMode: true,
  cameraViewModes: true,
  cameraStreamPreference: true,
  cameraStreamPreferences: true,
  cameraFitMode: true,
  cameraFitModes: true,
  ambientLightBleed: true,
};

const WORKSPACE_PATH = '/data/navet-dashboard-workspace.json';
const PROFILE_PATH = '/data/navet-dashboard-profile.json';
const PROFILE_STATE_PATH = '/data/navet-dashboard-profile-state.json';
const PROFILE_HISTORY_PATH = '/data/navet-dashboard-profile-history.json';
const ACCOUNT_PREFERENCES_PATH = '/data/navet-dashboard-account-preferences.json';
const CLIENT_PREFERENCES_PATH = '/data/navet-dashboard-client-preferences.json';
const CLIENT_REGISTRY_PATH = '/data/navet-dashboard-clients.json';
const CLIENT_BINDING_BOOTSTRAP_PATH =
  '/data/navet-dashboard-client-binding-bootstrap.json';

const HEADERS = {
  contractVersion: 'X-Navet-Profile-Contract',
  generation: 'X-Navet-Profile-Generation',
  installationId: 'X-Navet-Installation-Id',
  workspaceId: 'X-Navet-Workspace-Id',
  profileId: 'X-Navet-Profile-Id',
  revision: 'X-Navet-Profile-Revision',
  baseRevision: 'X-Navet-Base-Revision',
  recovery: 'X-Navet-Profile-Recovery',
  resetRevision: 'X-Navet-Profile-Reset-Revision',
  author: 'X-Navet-Profile-Author',
  changedPaths: 'X-Navet-Changed-Paths',
  clientId: 'X-Navet-Client-Id',
  clientName: 'X-Navet-Client-Name',
  clientKind: 'X-Navet-Client-Kind',
  preferenceRevision: 'X-Navet-Preference-Revision',
  errorCode: 'X-Navet-Profile-Error-Code',
};

const SYSTEM_AUTHOR = {
  id: 'legacy-import',
  name: 'Imported dashboard',
  kind: 'unknown',
  providerId: 'system',
  userId: null,
  userName: null,
};

let fsModule = fs;
let principalResolver = function (r, options) {
  if (!authStore || typeof authStore.resolveAuthenticatedPrincipal !== 'function') {
    return null;
  }
  return authStore.resolveAuthenticatedPrincipal(r, options);
};

function setProfileStoreFsForTests(mockFs) {
  fsModule = mockFs;
}

function resetProfileStoreFsForTests() {
  fsModule = fs;
  principalResolver = function (r, options) {
    if (!authStore || typeof authStore.resolveAuthenticatedPrincipal !== 'function') {
      return null;
    }
    return authStore.resolveAuthenticatedPrincipal(r, options);
  };
}

function setProfileStorePrincipalResolverForTests(resolver) {
  principalResolver = resolver;
}

function nowIso() {
  return new Date().toISOString();
}

function compareText(leftValue, rightValue) {
  const left = String(leftValue);
  const right = String(rightValue);
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareRegistryClients(left, right, newestFirst) {
  const timestampOrder = compareText(left.lastSeenAt, right.lastSeenAt);
  if (timestampOrder !== 0) {
    return newestFirst ? -timestampOrder : timestampOrder;
  }
  const idOrder = compareText(left.id, right.id);
  if (idOrder !== 0) {
    return idOrder;
  }
  return compareText(left.bindingId || '', right.bindingId || '');
}

function compareRegistryClientsOldestFirst(left, right) {
  return compareRegistryClients(left, right, false);
}

function compareRegistryClientsNewestFirst(left, right) {
  if (left.id === right.id) {
    const leftHasBinding =
      typeof left.bindingId === 'string' &&
      CLIENT_BINDING_PATTERN.test(left.bindingId);
    const rightHasBinding =
      typeof right.bindingId === 'string' &&
      CLIENT_BINDING_PATTERN.test(right.bindingId);
    if (leftHasBinding !== rightHasBinding) {
      return leftHasBinding ? -1 : 1;
    }
  }
  return compareRegistryClients(left, right, true);
}

function createOpaqueId(prefix) {
  const timestamp = Date.now().toString(36);
  let random = '';
  for (let index = 0; index < 4; index += 1) {
    random += Math.random().toString(36).slice(2, 10);
  }
  return `${prefix}_${timestamp}${random}`.slice(0, 52);
}

function createProfileGeneration() {
  return createOpaqueId('nvg');
}

function getHeader(r, name) {
  const headers = r.headersIn || {};
  if (headers[name] !== undefined) {
    return headers[name];
  }

  const lowerName = name.toLowerCase();
  if (headers[lowerName] !== undefined) {
    return headers[lowerName];
  }

  const keys = Object.keys(headers);
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index].toLowerCase() === lowerName) {
      return headers[keys[index]];
    }
  }
  return undefined;
}

function readCookieValues(cookieHeader, cookieName) {
  const values = [];
  const parts = String(cookieHeader || '').split(';');
  for (let index = 0; index < parts.length; index += 1) {
    const entry = parts[index].trim();
    const separator = entry.indexOf('=');
    if (separator <= 0 || entry.slice(0, separator).trim() !== cookieName) {
      continue;
    }
    const value = entry.slice(separator + 1).trim();
    if (values.indexOf(value) === -1) {
      values.push(value);
    }
  }
  return values;
}

function secureRandomHex(byteLength) {
  const values = new Uint32Array(Math.ceil(byteLength / 4));
  crypto.getRandomValues(values);
  let output = '';
  for (let index = 0; index < values.length; index += 1) {
    output += values[index].toString(16).padStart(8, '0');
  }
  return output.slice(0, byteLength * 2);
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
    normalized.includes('..') ||
    decoded.includes('..') ||
    decoded.includes('\\')
  ) {
    return '';
  }
  return normalized;
}

function requestUsesHttps(r) {
  const forwarded = String(getHeader(r, 'X-Forwarded-Proto') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (forwarded === 'https') {
    return true;
  }
  return Boolean(r && r.variables && r.variables.scheme === 'https');
}

function setClientBindingCookie(r, bindingId) {
  const ingressPath = normalizeIngressPath(getHeader(r, 'X-Ingress-Path'));
  const attributes = [
    `${CLIENT_BINDING_COOKIE_NAMES.currentName}=${bindingId}`,
    `Path=${ingressPath || '/'}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${CLIENT_BINDING_MAX_AGE_SECONDS}`,
  ];
  if (requestUsesHttps(r)) {
    attributes.push('Secure');
  }
  r.headersOut['Set-Cookie'] = attributes.join('; ');
}

function createClientBindingBootstrapKey(
  principal,
  clientId,
  remoteAddress,
  userAgent
) {
  return hashCrypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        String(principal.sessionId || ''),
        clientId,
        remoteAddress,
        userAgent,
      ])
    )
    .digest('hex');
}

function readClientBindingBootstraps(now) {
  const persisted = readJson(CLIENT_BINDING_BOOTSTRAP_PATH, {
    contractVersion: CONTRACT_VERSION,
    records: [],
  }, MAX_CLIENT_BINDING_BOOTSTRAP_BYTES);
  const candidates =
    persisted &&
    persisted.contractVersion === CONTRACT_VERSION &&
    Array.isArray(persisted.records)
      ? persisted.records
      : [];
  const records = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (
      candidate &&
      typeof candidate.key === 'string' &&
      CLIENT_BINDING_PATTERN.test(candidate.key) &&
      typeof candidate.bindingId === 'string' &&
      CLIENT_BINDING_PATTERN.test(candidate.bindingId) &&
      Number.isFinite(candidate.expiresAt) &&
      candidate.expiresAt > now
    ) {
      records.push(candidate);
    }
  }
  return records
    .sort(function (left, right) {
      return left.expiresAt - right.expiresAt;
    })
    .slice(-CLIENT_BINDING_BOOTSTRAP_LIMIT);
}

function persistClientBindingBootstrap(records, key, bindingId, now) {
  const nextRecords = records.filter(function (candidate) {
    return candidate.key !== key;
  });
  nextRecords.push({
    key: key,
    bindingId: bindingId,
    expiresAt: now + CLIENT_BINDING_BOOTSTRAP_TTL_MS,
  });
  writeJson(CLIENT_BINDING_BOOTSTRAP_PATH, {
    contractVersion: CONTRACT_VERSION,
    records: nextRecords.slice(-CLIENT_BINDING_BOOTSTRAP_LIMIT),
  });
}

function resolveClientBinding(r, principal, clientId) {
  const responseBindings = readCookieValues(
    r.headersOut['Set-Cookie'],
    CLIENT_BINDING_COOKIE_NAMES.currentName
  ).filter(function (value) {
    return CLIENT_BINDING_PATTERN.test(value);
  });
  if (responseBindings.length > 0) {
    return responseBindings[0];
  }

  const currentCookieBindings = readCookieValues(
    getHeader(r, 'Cookie'),
    CLIENT_BINDING_COOKIE_NAMES.currentName
  ).filter(function (value) {
    return CLIENT_BINDING_PATTERN.test(value);
  });
  const legacyCookieBindings = CLIENT_BINDING_COOKIE_NAMES.scoped
    ? readCookieValues(
        getHeader(r, 'Cookie'),
        CLIENT_BINDING_COOKIE_NAMES.legacyName
      ).filter(function (value) {
        return CLIENT_BINDING_PATTERN.test(value);
      })
    : currentCookieBindings;
  const cookieBindings = currentCookieBindings.concat(
    legacyCookieBindings.filter(function (value) {
      return currentCookieBindings.indexOf(value) === -1;
    })
  );
  const now = Date.now();
  const forwardedAddress = String(getHeader(r, 'X-Forwarded-For') || '')
    .split(',')[0]
    .trim();
  const remoteAddress =
    forwardedAddress ||
    (r && r.variables && typeof r.variables.remote_addr === 'string'
      ? r.variables.remote_addr
      : '');
  const userAgent = String(getHeader(r, 'User-Agent') || '').slice(0, 512);
  const bootstrapKey = createClientBindingBootstrapKey(
    principal,
    clientId,
    remoteAddress,
    userAgent
  );
  const records = readClientBindingBootstraps(now);
  const registry = readRegistry();
  let existingClient = null;
  for (let index = 0; index < registry.clients.length; index += 1) {
    if (registry.clients[index].id === clientId) {
      existingClient = registry.clients[index];
      break;
    }
  }
  if (
    existingClient &&
    typeof existingClient.bindingId === 'string' &&
    CLIENT_BINDING_PATTERN.test(existingClient.bindingId)
  ) {
    if (cookieBindings.indexOf(existingClient.bindingId) !== -1) {
      setClientBindingCookie(r, existingClient.bindingId);
      return existingClient.bindingId;
    }
    const concurrentBootstrap = records.find(function (record) {
      return (
        record.key === bootstrapKey &&
        record.bindingId === existingClient.bindingId
      );
    });
    if (concurrentBootstrap) {
      setClientBindingCookie(r, concurrentBootstrap.bindingId);
      return concurrentBootstrap.bindingId;
    }
    // Never overwrite a registered browser binding merely because a duplicate,
    // stale, or malformed parent-path cookie was presented.
    return currentCookieBindings[0] || secureRandomHex(32);
  }

  for (let index = 0; index < legacyCookieBindings.length; index += 1) {
    const candidate = legacyCookieBindings[index];
    const hasBindingContinuity = registry.clients.some(function (entry) {
      return entry.bindingId === candidate;
    });
    if (hasBindingContinuity) {
      setClientBindingCookie(r, candidate);
      return candidate;
    }
  }
  if (currentCookieBindings.length > 0) {
    setClientBindingCookie(r, currentCookieBindings[0]);
    return currentCookieBindings[0];
  }

  let bindingId = null;
  for (let index = 0; index < records.length; index += 1) {
    if (records[index].key === bootstrapKey) {
      bindingId = records[index].bindingId;
      break;
    }
  }
  if (!bindingId) {
    bindingId = secureRandomHex(32);
  }
  persistClientBindingBootstrap(records, bootstrapKey, bindingId, now);
  setClientBindingCookie(r, bindingId);
  return bindingId;
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(204);
}

function sendUnauthorized(r) {
  sendJson(r, 401, { error: 'Authentication required' });
}

function sendWorkspaceForbidden(r) {
  r.headersOut[HEADERS.errorCode] = 'workspace-tenant-mismatch';
  sendJson(r, 403, {
    error: 'This dashboard workspace belongs to a different Home Assistant installation',
  });
}

function sendClientForbidden(r) {
  r.headersOut[HEADERS.errorCode] = 'client-binding-mismatch';
  sendJson(r, 403, {
    error: 'This dashboard client identity belongs to another browser',
  });
}

function sendClientCapacityUnavailable(r) {
  r.headersOut[HEADERS.errorCode] = 'client-capacity-reached';
  r.headersOut['Retry-After'] = '60';
  sendJson(r, 503, {
    error:
      'Dashboard client capacity is currently full; existing clients remain protected while Navet waits for an inactive slot',
  });
}

function sendProfileStorageUnavailable(r) {
  r.headersOut[HEADERS.errorCode] = 'profile-storage-unavailable';
  r.headersOut['Retry-After'] = '60';
  sendJson(r, 503, {
    error: 'Dashboard profile storage is unavailable',
  });
}

function createStorageReadError(path) {
  const error = new Error(`Dashboard profile storage cannot be read safely: ${path}`);
  error.code = 'NAVET_PROFILE_STORAGE_READ_LIMIT';
  return error;
}

function createProfileWriteLimitError() {
  const error = new Error('Dashboard profile is too large');
  error.code = 'NAVET_PROFILE_WRITE_LIMIT';
  return error;
}

function createProfileStorageWriteError(path, cause) {
  const error = new Error(`Dashboard profile storage cannot be written safely: ${path}`);
  error.code = 'NAVET_PROFILE_STORAGE_WRITE';
  error.cause = cause;
  return error;
}

function readJson(path, fallback, maxBytes) {
  try {
    if (
      Number.isSafeInteger(maxBytes) &&
      maxBytes > 0 &&
      fsModule.statSync(path).size > maxBytes
    ) {
      throw createStorageReadError(path);
    }
    return JSON.parse(fsModule.readFileSync(path, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    if (error && error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT') {
      throw error;
    }
    throw createStorageReadError(path);
  }
}

function writeJson(path, value) {
  const temporaryPath = path + '.tmp';
  try {
    fsModule.writeFileSync(temporaryPath, JSON.stringify(value), 'utf8');
    fsModule.renameSync(temporaryPath, path);
  } catch (error) {
    throw createProfileStorageWriteError(path, error);
  }
}

function removeFile(path) {
  try {
    fsModule.unlinkSync(path);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw createProfileStorageWriteError(path, error);
    }
  }
}

function isValidWorkspace(value) {
  return (
    value &&
    value.contractVersion === CONTRACT_VERSION &&
    typeof value.installationId === 'string' &&
    value.installationId.length > 4 &&
    typeof value.workspaceId === 'string' &&
    value.workspaceId.length > 4 &&
    value.defaultProfileId === PROFILE_ID &&
    typeof value.createdAt === 'string'
  );
}

function isValidTenantBinding(value) {
  return (
    value &&
    value.providerId === 'home_assistant' &&
    typeof value.tenantId === 'string' &&
    TENANT_ID_PATTERN.test(value.tenantId) &&
    typeof value.enrolledAt === 'string' &&
    Number.isFinite(Date.parse(value.enrolledAt))
  );
}

function publicWorkspace(workspace) {
  return {
    contractVersion: workspace.contractVersion,
    installationId: workspace.installationId,
    workspaceId: workspace.workspaceId,
    defaultProfileId: workspace.defaultProfileId,
    createdAt: workspace.createdAt,
  };
}

function readOrCreateWorkspace() {
  const existing = readJson(WORKSPACE_PATH, null, MAX_WORKSPACE_BYTES);
  if (isValidWorkspace(existing)) {
    return existing;
  }

  const workspace = {
    contractVersion: CONTRACT_VERSION,
    installationId: createOpaqueId('nvi'),
    workspaceId: createOpaqueId('nvw'),
    defaultProfileId: PROFILE_ID,
    createdAt: nowIso(),
  };
  writeJson(WORKSPACE_PATH, workspace);
  return workspace;
}

function authorizeWorkspacePrincipal(principal) {
  if (
    !principal ||
    principal.providerId !== 'home_assistant' ||
    typeof principal.tenantId !== 'string' ||
    !TENANT_ID_PATTERN.test(principal.tenantId)
  ) {
    return null;
  }

  const workspace = readOrCreateWorkspace();
  if (workspace.tenantBinding === undefined) {
    // Legacy workspaces did not persist an HA tenant. Enroll only from the
    // server-resolved authenticated principal; request headers and client IDs
    // are intentionally excluded from this trust decision.
    const enrolledWorkspace = Object.assign({}, workspace, {
      tenantBinding: {
        providerId: 'home_assistant',
        tenantId: principal.tenantId,
        enrolledAt: nowIso(),
      },
    });
    writeJson(WORKSPACE_PATH, enrolledWorkspace);
    return enrolledWorkspace;
  }

  if (
    !isValidTenantBinding(workspace.tenantBinding) ||
    workspace.tenantBinding.providerId !== principal.providerId ||
    workspace.tenantBinding.tenantId !== principal.tenantId
  ) {
    return null;
  }
  return workspace;
}

function isValidProfile(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.app === 'navet' &&
    value.version === 3
  );
}

function isCredentialFieldName(value) {
  const normalized = String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (
    normalized.indexOf('token') >= 0 ||
    normalized.indexOf('password') >= 0 ||
    normalized.indexOf('passwd') >= 0 ||
    normalized.indexOf('passcode') >= 0 ||
    normalized.indexOf('jwt') >= 0 ||
    normalized.indexOf('secret') >= 0 ||
    normalized.indexOf('credential') >= 0 ||
    normalized === 'key' ||
    normalized === 'sig' ||
    normalized === 'pin' ||
    normalized === 'code' ||
    normalized === 'authorization' ||
    normalized === 'auth' ||
    normalized === 'authsig' ||
    normalized.indexOf('signature') >= 0 ||
    normalized === 'bearer' ||
    normalized === 'accesskey' ||
    normalized === 'accesscode' ||
    normalized === 'privatekey' ||
    normalized.slice(Math.max(0, normalized.length - 6)) === 'apikey' ||
    (normalized.indexOf('api') === 0 &&
      normalized.slice(Math.max(0, normalized.length - 3)) === 'key')
  );
}

function containsCredentialParameters(value) {
  const parts = String(value || '').split(/[&;]/);
  for (let index = 0; index < parts.length; index += 1) {
    let parameterName = parts[index].split('=')[0] || '';
    const questionIndex = parameterName.lastIndexOf('?');
    if (questionIndex >= 0) {
      parameterName = parameterName.slice(questionIndex + 1);
    }
    try {
      parameterName = decodeURIComponent(parameterName.replace(/\+/g, ' '));
    } catch (_error) {
      // Keep the undecoded name and apply the same conservative check.
    }
    if (isCredentialFieldName(parameterName)) {
      return true;
    }
  }
  return false;
}

function isCredentialBearingUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const candidate = value.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\/[^/?#]*@/i.test(candidate)) {
    return true;
  }

  const hashIndex = candidate.indexOf('#');
  const queryIndex = candidate.indexOf('?');
  if (queryIndex >= 0 && (hashIndex < 0 || queryIndex < hashIndex)) {
    const queryEnd = hashIndex >= 0 ? hashIndex : candidate.length;
    if (containsCredentialParameters(candidate.slice(queryIndex + 1, queryEnd))) {
      return true;
    }
  }

  if (hashIndex >= 0) {
    let fragment = candidate.slice(hashIndex + 1);
    const fragmentQueryIndex = fragment.indexOf('?');
    if (fragmentQueryIndex >= 0) {
      fragment = fragment.slice(fragmentQueryIndex + 1);
    }
    if (containsCredentialParameters(fragment)) {
      return true;
    }
  }

  return false;
}

function sanitizeCredentialBearingValue(value, depth) {
  if (depth > 16) {
    return undefined;
  }
  if (typeof value === 'string') {
    return isCredentialBearingUrl(value) ? undefined : value;
  }
  if (Array.isArray(value)) {
    const sanitizedItems = [];
    for (let index = 0; index < value.length; index += 1) {
      const sanitizedItem = sanitizeCredentialBearingValue(value[index], depth + 1);
      if (sanitizedItem !== undefined) {
        sanitizedItems.push(sanitizedItem);
      }
    }
    return sanitizedItems;
  }
  if (value && typeof value === 'object') {
    const sanitizedRecord = {};
    for (const key in value) {
      if (
        !Object.prototype.hasOwnProperty.call(value, key) ||
        isCredentialFieldName(key)
      ) {
        continue;
      }
      const sanitizedEntry = sanitizeCredentialBearingValue(value[key], depth + 1);
      if (sanitizedEntry !== undefined) {
        sanitizedRecord[key] = sanitizedEntry;
      }
    }
    return sanitizedRecord;
  }
  return value;
}

function sanitizeSharedExtensionList(value, urlKey) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(function (entry) {
      return (
        !entry ||
        typeof entry !== 'object' ||
        Array.isArray(entry) ||
        !isCredentialBearingUrl(entry[urlKey])
      );
    })
    .map(function (entry) {
      return JSON.parse(JSON.stringify(entry));
    });
}

function normalizeDashboardCollections(profile) {
  delete profile.cardOrders;

  const cardZonesSource =
    profile.cardZones &&
    typeof profile.cardZones === 'object' &&
    !Array.isArray(profile.cardZones) &&
    profile.cardZones.state &&
    typeof profile.cardZones.state === 'object' &&
    !Array.isArray(profile.cardZones.state) &&
    profile.cardZones.state.cardZones &&
    typeof profile.cardZones.state.cardZones === 'object' &&
    !Array.isArray(profile.cardZones.state.cardZones)
      ? profile.cardZones.state.cardZones
      : profile.cardZones;
  if (
    cardZonesSource &&
    typeof cardZonesSource === 'object' &&
    !Array.isArray(cardZonesSource)
  ) {
    const cardZones = {};
    const entityIds = Object.keys(cardZonesSource);
    for (let index = 0; index < entityIds.length; index += 1) {
      const entityId = entityIds[index];
      const zone = cardZonesSource[entityId];
      if (typeof zone === 'string' && zone.length > 0) {
        cardZones[entityId] = zone;
      }
    }
    if (Object.keys(cardZones).length > 0) {
      profile.cardZones = cardZones;
    } else {
      delete profile.cardZones;
    }
  }
}

function sanitizeDashboardProfile(profile) {
  if (!isValidProfile(profile)) {
    return profile;
  }

  const sanitized = JSON.parse(JSON.stringify(profile));
  normalizeDashboardCollections(sanitized);
  const sourceSettings =
    sanitized.settings &&
    typeof sanitized.settings === 'object' &&
    !Array.isArray(sanitized.settings)
      ? sanitized.settings
      : {};
  const settings = {};
  for (const key in SHARED_SETTING_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(SHARED_SETTING_KEYS, key) &&
      Object.prototype.hasOwnProperty.call(sourceSettings, key)
    ) {
      settings[key] = JSON.parse(JSON.stringify(sourceSettings[key]));
    }
  }
  if (Object.prototype.hasOwnProperty.call(settings, 'customSidebarActions')) {
    settings.customSidebarActions = sanitizeSharedExtensionList(
      settings.customSidebarActions,
      'targetUrl'
    );
  }
  if (Object.prototype.hasOwnProperty.call(settings, 'customSummaryPills')) {
    settings.customSummaryPills = sanitizeSharedExtensionList(
      settings.customSummaryPills,
      'actionUrl'
    );
  }
  if (Object.prototype.hasOwnProperty.call(sanitized, 'settings')) {
    sanitized.settings = settings;
  }
  const credentialSafeProfile = sanitizeCredentialBearingValue(sanitized, 0);
  return isValidProfile(credentialSafeProfile) ? credentialSafeProfile : sanitized;
}

const PROFILE_COMPARISON_IGNORED_ROOT_KEYS = {
  cardOrders: true,
  exportedAt: true,
  navigation: true,
};

function stableSerializeProfileValue(value, root) {
  if (Array.isArray(value)) {
    return (
      '[' +
      value
        .map(function (entry) {
          return stableSerializeProfileValue(entry, false);
        })
        .join(',') +
      ']'
    );
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter(function (key) {
        return !root || !PROFILE_COMPARISON_IGNORED_ROOT_KEYS[key];
      })
      .sort();
    return (
      '{' +
      keys
        .map(function (key) {
          return JSON.stringify(key) + ':' + stableSerializeProfileValue(value[key], false);
        })
        .join(',') +
      '}'
    );
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? 'null' : serialized;
}

function areDashboardProfilesEquivalent(current, candidate) {
  return (
    stableSerializeProfileValue(current, true) ===
    stableSerializeProfileValue(candidate, true)
  );
}

function hashDashboardProfile(profile) {
  return hashCrypto
    .createHash('sha256')
    .update(JSON.stringify(profile))
    .digest('hex');
}

function pickPreferenceSettings(value, allowedKeys) {
  const source =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const settings = {};
  for (const key in allowedKeys) {
    if (
      Object.prototype.hasOwnProperty.call(allowedKeys, key) &&
      Object.prototype.hasOwnProperty.call(source, key)
    ) {
      const sanitizedValue = sanitizeCredentialBearingValue(source[key], 0);
      if (sanitizedValue !== undefined) {
        settings[key] = sanitizedValue;
      }
    }
  }
  return settings;
}

function sanitizePreferenceValues(value, scope) {
  const source =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const allowedKeys = scope === 'account' ? ACCOUNT_SETTING_KEYS : CLIENT_SETTING_KEYS;
  if (
    Object.prototype.hasOwnProperty.call(source, 'settings') &&
    source.settings &&
    typeof source.settings === 'object' &&
    !Array.isArray(source.settings)
  ) {
    return {
      schemaVersion: Number.isSafeInteger(source.schemaVersion)
        ? source.schemaVersion
        : SETTINGS_PROFILE_SCHEMA_VERSION,
      settings: pickPreferenceSettings(source.settings, allowedKeys),
    };
  }
  return pickPreferenceSettings(source, allowedKeys);
}

function readProfileFile() {
  try {
    const stat = fsModule.statSync(PROFILE_PATH);
    if (typeof stat.size === 'number' && stat.size > MAX_PROFILE_BYTES) {
      throw createStorageReadError(PROFILE_PATH);
    }
    const profile = JSON.parse(fsModule.readFileSync(PROFILE_PATH, 'utf8'));
    if (!isValidProfile(profile)) {
      return { status: 'invalid', profile: null, profileHash: null };
    }
    const sanitized = sanitizeDashboardProfile(profile);
    return {
      status: 'present',
      profile: sanitized,
      profileHash: hashDashboardProfile(sanitized),
      needsRewrite: JSON.stringify(sanitized) !== JSON.stringify(profile),
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { status: 'missing', profile: null, profileHash: null };
    }
    if (error && error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT') {
      throw error;
    }
    throw createStorageReadError(PROFILE_PATH);
  }
}

function isValidAuthor(value) {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.providerId === 'string'
  );
}

function isValidRevisionMetadata(value) {
  return (
    value &&
    value.contractVersion === CONTRACT_VERSION &&
    typeof value.installationId === 'string' &&
    typeof value.workspaceId === 'string' &&
    value.profileId === PROFILE_ID &&
    Number.isSafeInteger(value.revision) &&
    value.revision > 0 &&
    typeof value.generation === 'string' &&
    (value.kind === 'update' ||
      value.kind === 'patch' ||
      value.kind === 'reset' ||
      value.kind === 'restore') &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    isValidAuthor(value.author) &&
    Array.isArray(value.changedPaths) &&
    value.changedPaths.every(function (path) {
      return typeof path === 'string' && path.charAt(0) === '/';
    })
  );
}

function isValidState(value, workspace) {
  if (
    !value ||
    value.contractVersion !== CONTRACT_VERSION ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    typeof value.generation !== 'string' ||
    (value.status !== 'uninitialized' &&
      value.status !== 'active' &&
      value.status !== 'reset')
  ) {
    return false;
  }

  if (
    value.metadata !== null &&
    (!isValidRevisionMetadata(value.metadata) ||
      value.metadata.revision !== value.revision ||
      value.metadata.generation !== value.generation ||
      (workspace &&
        (value.metadata.installationId !== workspace.installationId ||
          value.metadata.workspaceId !== workspace.workspaceId)))
  ) {
    return false;
  }

  if (
    value.revision === 0
      ? value.status !== 'uninitialized' || value.metadata !== null
      : value.metadata === null || value.status === 'uninitialized'
  ) {
    return false;
  }
  if (
    value.status === 'reset'
      ? value.resetRevision !== value.revision
      : value.resetRevision !== null
  ) {
    return false;
  }
  if (
    value.metadata &&
    (value.status === 'reset'
      ? value.metadata.kind !== 'reset'
      : value.metadata.kind === 'reset')
  ) {
    return false;
  }
  if (
    Object.prototype.hasOwnProperty.call(value, 'profileHash') &&
    (value.status === 'active'
      ? !PROFILE_HASH_PATTERN.test(value.profileHash)
      : value.profileHash !== null)
  ) {
    return false;
  }
  if (
    Object.prototype.hasOwnProperty.call(value, 'latestRecoverableRevision') &&
    value.latestRecoverableRevision !== null &&
    (!Number.isSafeInteger(value.latestRecoverableRevision) ||
      value.latestRecoverableRevision <= 0 ||
      value.latestRecoverableRevision > value.revision)
  ) {
    return false;
  }
  return true;
}

function createInitialState() {
  return {
    contractVersion: CONTRACT_VERSION,
    revision: 0,
    generation: createProfileGeneration(),
    status: 'uninitialized',
    resetRevision: null,
    metadata: null,
    profileHash: null,
    latestRecoverableRevision: null,
  };
}

function pruneHistory(history) {
  const candidates = history.slice(-HISTORY_LIMIT);
  const retained = [];
  let serializedBytes = 2;
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const entryBytes = Buffer.byteLength(JSON.stringify(candidates[index]), 'utf8');
    const nextBytes = serializedBytes + entryBytes + (retained.length > 0 ? 1 : 0);
    if (retained.length > 0 && nextBytes > MAX_HISTORY_BYTES) {
      break;
    }
    retained.unshift(candidates[index]);
    serializedBytes = nextBytes;
  }
  return retained;
}

function readHistory() {
  const history = readJson(PROFILE_HISTORY_PATH, [], MAX_HISTORY_BYTES);
  if (!Array.isArray(history)) {
    return [];
  }
  let changed = false;
  const sanitizedCandidates = [];
  for (let index = 0; index < history.length; index += 1) {
    const entry = history[index];
    if (!entry || !isValidRevisionMetadata(entry.metadata)) {
      changed = true;
      continue;
    }
    if (entry.profile === null) {
      if (entry.profileHash !== null) {
        changed = true;
      }
      sanitizedCandidates.push({
        metadata: entry.metadata,
        profile: null,
        profileHash: null,
      });
      continue;
    }
    if (!isValidProfile(entry.profile)) {
      changed = true;
      continue;
    }
    const profile = sanitizeDashboardProfile(entry.profile);
    const serializedProfile = JSON.stringify(profile);
    if (Buffer.byteLength(serializedProfile, 'utf8') > MAX_PROFILE_BYTES) {
      changed = true;
      continue;
    }
    const profileHash = hashDashboardProfile(profile);
    if (
      serializedProfile !== JSON.stringify(entry.profile) ||
      entry.profileHash !== profileHash
    ) {
      changed = true;
    }
    sanitizedCandidates.push({
      metadata: entry.metadata,
      profile: profile,
      profileHash: profileHash,
    });
  }
  const sanitizedHistory = pruneHistory(sanitizedCandidates);
  if (sanitizedHistory.length !== history.length) {
    changed = true;
  }
  if (changed) {
    writeJson(PROFILE_HISTORY_PATH, sanitizedHistory);
  }
  return sanitizedHistory;
}

function writeHistory(history) {
  writeJson(PROFILE_HISTORY_PATH, pruneHistory(history));
}

function historyEntryMatchesState(entry, state) {
  if (
    !entry ||
    !entry.metadata ||
    !state.metadata ||
    entry.metadata.installationId !== state.metadata.installationId ||
    entry.metadata.workspaceId !== state.metadata.workspaceId ||
    entry.metadata.profileId !== state.metadata.profileId ||
    entry.metadata.revision !== state.revision ||
    entry.metadata.generation !== state.generation
  ) {
    return false;
  }
  if (state.status === 'reset') {
    return entry.profile === null;
  }
  if (state.status !== 'active' || !entry.profile) {
    return false;
  }
  return (
    !PROFILE_HASH_PATTERN.test(state.profileHash) ||
    entry.profileHash === state.profileHash
  );
}

function committedHistory(state) {
  return readHistory().filter(function (entry) {
    if (
      !state.metadata ||
      entry.metadata.installationId !== state.metadata.installationId ||
      entry.metadata.workspaceId !== state.metadata.workspaceId ||
      entry.metadata.profileId !== state.metadata.profileId
    ) {
      return false;
    }
    if (entry.metadata.revision < state.revision) {
      return true;
    }
    return (
      entry.metadata.revision === state.revision &&
      historyEntryMatchesState(entry, state)
    );
  });
}

function findStateHistoryEntry(state, history) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (historyEntryMatchesState(history[index], state)) {
      return history[index];
    }
  }
  return null;
}

function latestRecoverableRevision(state) {
  if (
    Number.isSafeInteger(state.latestRecoverableRevision) &&
    state.latestRecoverableRevision > 0 &&
    state.latestRecoverableRevision <= state.revision
  ) {
    return state.latestRecoverableRevision;
  }
  const history = committedHistory(state);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].profile && isValidProfile(history[index].profile)) {
      return history[index].metadata.revision;
    }
  }
  return null;
}

function stageHistoryRevision(currentState, currentProfile, metadata, nextProfile) {
  let retained = readHistory().filter(function (entry) {
    return (
      entry.metadata.installationId === metadata.installationId &&
      entry.metadata.workspaceId === metadata.workspaceId &&
      entry.metadata.profileId === metadata.profileId &&
      entry.metadata.revision < metadata.revision
    );
  });
  const newestByRevision = Object.create(null);
  for (let index = 0; index < retained.length; index += 1) {
    newestByRevision[String(retained[index].metadata.revision)] = retained[index];
  }
  retained = Object.keys(newestByRevision).map(function (revision) {
    return newestByRevision[revision];
  });
  if (
    currentState.revision < metadata.revision &&
    currentState.status === 'active' &&
    currentProfile &&
    isValidProfile(currentProfile)
  ) {
    const currentProfileHash = hashDashboardProfile(currentProfile);
    const hasCurrentSnapshot = retained.some(function (entry) {
      return (
        entry.metadata.revision === currentState.revision &&
        entry.metadata.generation === currentState.generation &&
        entry.profileHash === currentProfileHash
      );
    });
    if (!hasCurrentSnapshot && currentState.metadata) {
      retained.push({
        metadata: currentState.metadata,
        profile: currentProfile,
        profileHash: currentProfileHash,
      });
    }
  }
  const nextProfileHash = nextProfile ? hashDashboardProfile(nextProfile) : null;
  retained.push({
    metadata: metadata,
    profile: nextProfile,
    profileHash: nextProfileHash,
  });
  retained.sort(function (left, right) {
    return left.metadata.revision - right.metadata.revision;
  });
  const staged = pruneHistory(retained);
  const candidateRetained = staged.some(function (entry) {
    return (
      entry.metadata.revision === metadata.revision &&
      entry.metadata.generation === metadata.generation &&
      entry.profileHash === nextProfileHash
    );
  });
  const currentRetained =
    currentState.status !== 'active' ||
    currentState.revision >= metadata.revision ||
    staged.some(function (entry) {
      return (
        entry.metadata.revision === currentState.revision &&
        entry.metadata.generation === currentState.generation &&
        entry.profileHash === hashDashboardProfile(currentProfile)
      );
    });
  if (!candidateRetained || !currentRetained) {
    throw createProfileStorageWriteError(
      PROFILE_HISTORY_PATH,
      new Error('Dashboard profile history cannot retain the commit boundary')
    );
  }
  writeHistory(staged);
}

function migrateLegacyProfile(workspace, profile) {
  const sanitizedProfile = sanitizeDashboardProfile(profile);
  const metadata = {
    contractVersion: CONTRACT_VERSION,
    installationId: workspace.installationId,
    workspaceId: workspace.workspaceId,
    profileId: PROFILE_ID,
    revision: 1,
    generation: createProfileGeneration(),
    kind: 'update',
    updatedAt:
      profile &&
      typeof profile.exportedAt === 'string' &&
      Number.isFinite(Date.parse(profile.exportedAt))
        ? profile.exportedAt
        : nowIso(),
    author: SYSTEM_AUTHOR,
    changedPaths: ['/'],
  };
  const state = {
    contractVersion: CONTRACT_VERSION,
    revision: 1,
    generation: metadata.generation,
    status: 'active',
    resetRevision: null,
    metadata: metadata,
    profileHash: hashDashboardProfile(sanitizedProfile),
    latestRecoverableRevision: 1,
  };
  stageHistoryRevision(createInitialState(), null, metadata, sanitizedProfile);
  writeJson(PROFILE_PATH, sanitizedProfile);
  writeJson(PROFILE_STATE_PATH, state);
  return state;
}

function readState(workspace) {
  const state = readJson(PROFILE_STATE_PATH, null, MAX_PROFILE_STATE_BYTES);
  if (isValidState(state, workspace)) {
    return state;
  }

  const history = readHistory().filter(function (entry) {
    return (
      entry.metadata.installationId === workspace.installationId &&
      entry.metadata.workspaceId === workspace.workspaceId &&
      entry.metadata.profileId === PROFILE_ID
    );
  });
  if (history.length > 0) {
    const latest = history[history.length - 1];
    const recovered = {
      contractVersion: CONTRACT_VERSION,
      revision: latest.metadata.revision,
      generation: latest.metadata.generation,
      status: latest.profile ? 'active' : 'reset',
      resetRevision: latest.profile ? null : latest.metadata.revision,
      metadata: latest.metadata,
      profileHash: latest.profileHash,
      latestRecoverableRevision: null,
    };
    recovered.latestRecoverableRevision = latest.profile
      ? latest.metadata.revision
      : latestRecoverableRevision(recovered);
    if (latest.profile) {
      writeJson(PROFILE_PATH, latest.profile);
    } else {
      removeFile(PROFILE_PATH);
    }
    writeJson(PROFILE_STATE_PATH, recovered);
    return recovered;
  }

  const profileResult = readProfileFile();
  if (profileResult.status === 'present') {
    return migrateLegacyProfile(workspace, profileResult.profile);
  }

  const initial = createInitialState();
  writeJson(PROFILE_STATE_PATH, initial);
  return initial;
}

function readCommittedProfile(state) {
  if (state.status !== 'active') {
    return { status: 'missing', profile: null, profileHash: null };
  }
  const profileResult = readProfileFile();
  if (
    PROFILE_HASH_PATTERN.test(state.profileHash) &&
    profileResult.status === 'present' &&
    profileResult.profileHash === state.profileHash
  ) {
    if (profileResult.needsRewrite) {
      try {
        writeJson(PROFILE_PATH, profileResult.profile);
      } catch (_error) {
        // The sanitized in-memory profile still matches the committed digest.
      }
    }
    return profileResult;
  }

  const history = readHistory().filter(function (entry) {
    return (
      state.metadata &&
      entry.metadata.installationId === state.metadata.installationId &&
      entry.metadata.workspaceId === state.metadata.workspaceId &&
      entry.metadata.profileId === state.metadata.profileId
    );
  });
  const historyEntry = findStateHistoryEntry(state, history);
  if (historyEntry && historyEntry.profile) {
    try {
      writeJson(PROFILE_PATH, historyEntry.profile);
    } catch (_error) {
      // The validated history snapshot is still safe to serve. A later
      // successful request can repair the fast-path profile cache.
    }
    if (!PROFILE_HASH_PATTERN.test(state.profileHash)) {
      const upgradedState = Object.assign({}, state, {
        profileHash: historyEntry.profileHash,
        latestRecoverableRevision: state.revision,
      });
      try {
        writeJson(PROFILE_STATE_PATH, upgradedState);
      } catch (_error) {
        // Legacy state remains readable through the exact history snapshot.
      }
    }
    return {
      status: 'present',
      profile: historyEntry.profile,
      profileHash: historyEntry.profileHash,
    };
  }

  if (
    !PROFILE_HASH_PATTERN.test(state.profileHash) &&
    profileResult.status === 'present' &&
    !history.some(function (entry) {
      return entry.metadata.revision > state.revision;
    })
  ) {
    const profileHash = profileResult.profileHash;
    if (state.metadata) {
      try {
        stageHistoryRevision(
          Object.assign({}, state, { profileHash: profileHash }),
          profileResult.profile,
          state.metadata,
          profileResult.profile
        );
        writeJson(
          PROFILE_STATE_PATH,
          Object.assign({}, state, {
            profileHash: profileHash,
            latestRecoverableRevision: state.revision,
          })
        );
      } catch (_error) {
        // The legacy profile remains the only available committed snapshot.
      }
    }
    return profileResult;
  }

  return {
    status: profileResult.status === 'invalid' ? 'invalid' : 'missing',
    profile: null,
    profileHash: null,
  };
}

function resolveRecovery(state, profileResult) {
  if (state.status === 'reset') {
    return {
      status: 'reset',
      resetRevision: state.resetRevision,
      latestRecoverableRevision: latestRecoverableRevision(state),
    };
  }
  if (state.status === 'uninitialized') {
    return {
      status: 'uninitialized',
      resetRevision: null,
      latestRecoverableRevision: latestRecoverableRevision(state),
    };
  }
  if (profileResult.status === 'present') {
    return {
      status: 'active',
      resetRevision: null,
      latestRecoverableRevision: state.revision,
    };
  }

  const recoverableRevision = latestRecoverableRevision(state);
  return {
    status: recoverableRevision === null ? 'missing' : 'recoverable',
    resetRevision: null,
    latestRecoverableRevision: recoverableRevision,
  };
}

function encodeHeaderJson(value) {
  return encodeURIComponent(JSON.stringify(value));
}

function applyWorkspaceHeaders(r, workspace) {
  r.headersOut[HEADERS.contractVersion] = String(CONTRACT_VERSION);
  r.headersOut[HEADERS.installationId] = workspace.installationId;
  r.headersOut[HEADERS.workspaceId] = workspace.workspaceId;
  r.headersOut[HEADERS.profileId] = PROFILE_ID;
  r.headersOut['X-Navet-Workspace-Created-At'] = workspace.createdAt;
}

function buildProfileMetadata(workspace, state) {
  const candidateUpdatedAt =
    state.metadata && typeof state.metadata.updatedAt === 'string'
      ? state.metadata.updatedAt
      : workspace.createdAt;
  const updatedAt = Number.isFinite(Date.parse(candidateUpdatedAt))
    ? candidateUpdatedAt
    : nowIso();
  return {
    etag: `"navet-${workspace.workspaceId}-${state.revision}"`,
    lastModified: new Date(updatedAt).toUTCString(),
  };
}

function applyStateHeaders(r, workspace, state, recovery) {
  applyWorkspaceHeaders(r, workspace);
  r.headersOut[HEADERS.generation] = state.generation;
  r.headersOut[HEADERS.revision] = String(state.revision);
  r.headersOut[HEADERS.recovery] = recovery.status;
  if (recovery.resetRevision !== null) {
    r.headersOut[HEADERS.resetRevision] = String(recovery.resetRevision);
  }
  if (recovery.latestRecoverableRevision !== null) {
    r.headersOut['X-Navet-Latest-Recoverable-Revision'] = String(
      recovery.latestRecoverableRevision
    );
  }
  if (state.metadata) {
    r.headersOut[HEADERS.author] = encodeHeaderJson(state.metadata.author);
    r.headersOut[HEADERS.changedPaths] = encodeHeaderJson(state.metadata.changedPaths);
    r.headersOut['X-Navet-Profile-Change-Kind'] = state.metadata.kind;
    r.headersOut['X-Navet-Profile-Updated-At'] = state.metadata.updatedAt;
    if (Number.isSafeInteger(state.metadata.restoredFromRevision)) {
      r.headersOut['X-Navet-Restored-From-Revision'] = String(
        state.metadata.restoredFromRevision
      );
    }
  }

  const validators = buildProfileMetadata(workspace, state);
  r.headersOut.ETag = validators.etag;
  r.headersOut['Last-Modified'] = validators.lastModified;
}

function isProfileFresh(r, metadata) {
  const ifNoneMatch = getHeader(r, 'If-None-Match');
  if (typeof ifNoneMatch === 'string' && ifNoneMatch === metadata.etag) {
    return true;
  }
  const ifModifiedSince = getHeader(r, 'If-Modified-Since');
  return (
    typeof ifModifiedSince === 'string' && ifModifiedSince === metadata.lastModified
  );
}

function parseRevision(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function evaluateWritePrecondition(r, workspace, state) {
  const rawBaseRevision = getHeader(r, HEADERS.baseRevision);
  if (rawBaseRevision !== undefined) {
    const baseRevision = parseRevision(rawBaseRevision);
    return baseRevision !== null && baseRevision === state.revision
      ? 'satisfied'
      : 'failed';
  }
  // Production rejects these validators before js_content because njs 0.8.10
  // can crash when r.return() processes them. Normal Navet writes use the
  // revision header above and must never inspect the legacy fallback.
  const ifMatch = getHeader(r, 'If-Match');
  const ifUnmodifiedSince = getHeader(r, 'If-Unmodified-Since');
  const validators = buildProfileMetadata(workspace, state);
  if (typeof ifMatch === 'string') {
    return ifMatch === validators.etag ? 'satisfied' : 'failed';
  }
  if (typeof ifUnmodifiedSince === 'string') {
    return ifUnmodifiedSince === validators.lastModified ? 'satisfied' : 'failed';
  }
  return state.revision === 0 ? 'satisfied' : 'required';
}

function isWritePreconditionSatisfied(r, metadata) {
  const ifMatch = getHeader(r, 'If-Match');
  if (typeof ifMatch === 'string') {
    return metadata !== null && ifMatch === metadata.etag;
  }
  const ifUnmodifiedSince = getHeader(r, 'If-Unmodified-Since');
  if (typeof ifUnmodifiedSince === 'string') {
    return metadata !== null && ifUnmodifiedSince === metadata.lastModified;
  }
  return true;
}

function sendPreconditionResult(r, workspace, state, recovery, result) {
  applyStateHeaders(r, workspace, state, recovery);
  if (result === 'required') {
    sendJson(r, 428, {
      error: 'A base revision or current ETag is required',
      revision: state.revision,
    });
    return true;
  }
  if (result === 'failed') {
    sendJson(r, 412, {
      error: 'Dashboard profile changed before save',
      revision: state.revision,
    });
    return true;
  }
  return false;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function sanitizeText(value, fallback, maxLength) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = safeDecodeURIComponent(value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function readClient(r, required, principal) {
  const id = getHeader(r, HEADERS.clientId);
  if (
    typeof id !== 'string' ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(id) ||
    id.indexOf('..') !== -1
  ) {
    return required ? null : undefined;
  }

  const kindHeader = getHeader(r, HEADERS.clientKind);
  const kind =
    kindHeader === 'desktop' ||
    kindHeader === 'phone' ||
    kindHeader === 'tablet' ||
    kindHeader === 'wall_panel'
      ? kindHeader
      : 'unknown';
  return {
    id: id,
    name: sanitizeText(getHeader(r, HEADERS.clientName), 'Navet dashboard', 120),
    kind: kind,
    bindingId: resolveClientBinding(r, principal, id),
  };
}

function createAuthor(principal, client) {
  return {
    id: client.id,
    name: client.name,
    kind: client.kind,
    providerId: sanitizeText(principal.providerId, 'unknown', 64),
    userId:
      typeof principal.userId === 'string'
        ? sanitizeText(principal.userId, null, 128)
        : null,
    userName:
      typeof principal.userName === 'string'
        ? sanitizeText(principal.userName, null, 120)
        : null,
  };
}

function readChangedPaths(r, fallback) {
  const raw = getHeader(r, HEADERS.changedPaths);
  if (typeof raw !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(safeDecodeURIComponent(raw));
    if (!Array.isArray(parsed)) {
      return fallback;
    }
    return parsed
      .filter(function (path) {
        return typeof path === 'string' && path.length <= 512 && path.charAt(0) === '/';
      })
      .slice(0, MAX_PATCH_OPERATIONS);
  } catch (_error) {
    return fallback;
  }
}

function createRevisionMetadata(workspace, state, kind, author, changedPaths, extra) {
  const metadata = {
    contractVersion: CONTRACT_VERSION,
    installationId: workspace.installationId,
    workspaceId: workspace.workspaceId,
    profileId: PROFILE_ID,
    revision: state.revision + 1,
    generation: kind === 'reset' ? createProfileGeneration() : state.generation,
    kind: kind,
    updatedAt: nowIso(),
    author: author,
    changedPaths: changedPaths,
  };
  if (extra && Number.isSafeInteger(extra.restoredFromRevision)) {
    metadata.restoredFromRevision = extra.restoredFromRevision;
  }
  return metadata;
}

function persistRevision(currentState, currentProfile, metadata, profile) {
  const sanitizedProfile = profile ? sanitizeDashboardProfile(profile) : null;
  if (
    sanitizedProfile &&
    Buffer.byteLength(JSON.stringify(sanitizedProfile), 'utf8') >
      MAX_PROFILE_BYTES
  ) {
    throw createProfileWriteLimitError();
  }
  stageHistoryRevision(currentState, currentProfile, metadata, sanitizedProfile);
  if (sanitizedProfile) {
    writeJson(PROFILE_PATH, sanitizedProfile);
  } else {
    removeFile(PROFILE_PATH);
  }
  const state = {
    contractVersion: CONTRACT_VERSION,
    revision: metadata.revision,
    generation: metadata.generation,
    status: sanitizedProfile ? 'active' : 'reset',
    resetRevision: sanitizedProfile ? null : metadata.revision,
    metadata: metadata,
    profileHash: sanitizedProfile ? hashDashboardProfile(sanitizedProfile) : null,
    latestRecoverableRevision: sanitizedProfile
      ? metadata.revision
      : currentState.status === 'active'
        ? currentState.revision
        : latestRecoverableRevision(currentState),
  };
  writeJson(PROFILE_STATE_PATH, state);
  return state;
}

function readRegistry() {
  const missingRegistry = {};
  const registry = readJson(
    CLIENT_REGISTRY_PATH,
    missingRegistry,
    MAX_CLIENT_REGISTRY_BYTES
  );
  if (registry === missingRegistry) {
    return { contractVersion: CONTRACT_VERSION, clients: [] };
  }
  if (
    !registry ||
    registry.contractVersion !== CONTRACT_VERSION ||
    !Array.isArray(registry.clients)
  ) {
    throw createStorageReadError(CLIENT_REGISTRY_PATH);
  }
  for (let index = 0; index < registry.clients.length; index += 1) {
    if (!isValidRegistryClient(registry.clients[index])) {
      throw createStorageReadError(CLIENT_REGISTRY_PATH);
    }
  }
  return registry;
}

function isValidRegistryClient(entry) {
  return Boolean(
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.id === 'string' &&
    /^[A-Za-z0-9_-]{8,128}$/.test(entry.id) &&
    entry.id.indexOf('..') === -1 &&
    typeof entry.name === 'string' &&
    (entry.kind === 'desktop' ||
      entry.kind === 'phone' ||
      entry.kind === 'tablet' ||
      entry.kind === 'wall_panel' ||
      entry.kind === 'unknown') &&
    typeof entry.firstSeenAt === 'string' &&
    Number.isFinite(Date.parse(entry.firstSeenAt)) &&
    typeof entry.lastSeenAt === 'string' &&
    Number.isFinite(Date.parse(entry.lastSeenAt)) &&
    (entry.lastRevision === undefined ||
      entry.lastRevision === null ||
      (Number.isSafeInteger(entry.lastRevision) && entry.lastRevision >= 0)) &&
    entry.principal &&
    typeof entry.principal === 'object' &&
    typeof entry.principal.providerId === 'string' &&
    (entry.principal.userId === null ||
      typeof entry.principal.userId === 'string') &&
    (entry.principal.userName === null ||
      typeof entry.principal.userName === 'string') &&
    (entry.bindingId === undefined ||
      entry.bindingId === null ||
      (typeof entry.bindingId === 'string' &&
        CLIENT_BINDING_PATTERN.test(entry.bindingId)))
  );
}

function normalizeRegistryClients(clients, now) {
  const currentClients = [];
  for (let index = 0; index < clients.length; index += 1) {
    const entry = clients[index];
    const parsedLastSeenAt = Date.parse(entry.lastSeenAt);
    if (now - parsedLastSeenAt > CLIENT_STALE_AFTER_MS) {
      continue;
    }
    const boundedLastSeenAt =
      parsedLastSeenAt > now + CLIENT_FUTURE_SKEW_MS
        ? now
        : parsedLastSeenAt;
    const parsedFirstSeenAt = Date.parse(entry.firstSeenAt);
    const boundedFirstSeenAt = Math.min(
      parsedFirstSeenAt,
      boundedLastSeenAt
    );
    const canonicalFirstSeenAt = new Date(boundedFirstSeenAt).toISOString();
    const canonicalLastSeenAt = new Date(boundedLastSeenAt).toISOString();
    const canonicalLastRevision =
      entry.lastRevision === undefined ? null : entry.lastRevision;
    currentClients.push(
      canonicalFirstSeenAt === entry.firstSeenAt &&
        canonicalLastSeenAt === entry.lastSeenAt &&
        canonicalLastRevision === entry.lastRevision
        ? entry
        : Object.assign({}, entry, {
            firstSeenAt: canonicalFirstSeenAt,
            lastSeenAt: canonicalLastSeenAt,
            lastRevision: canonicalLastRevision,
          })
    );
  }
  const newestFirst = currentClients
    .slice()
    .sort(compareRegistryClientsNewestFirst);
  const seenIds = Object.create(null);
  const seenBindings = Object.create(null);
  const retained = [];
  for (let index = 0; index < newestFirst.length; index += 1) {
    const entry = newestFirst[index];
    const bindingId =
      typeof entry.bindingId === 'string' &&
      CLIENT_BINDING_PATTERN.test(entry.bindingId)
        ? entry.bindingId
        : null;
    if (seenIds[entry.id] || (bindingId && seenBindings[bindingId])) {
      continue;
    }
    seenIds[entry.id] = true;
    if (bindingId) {
      seenBindings[bindingId] = true;
    }
    retained.push(entry);
  }
  return retained.sort(compareRegistryClientsOldestFirst);
}

function reconcileClientPreferences(registry, allowEmptyRegistry) {
  const collection = readPreferenceCollection(CLIENT_PREFERENCES_PATH);
  const originalRecordCount = Object.keys(collection.records).length;
  if (
    allowEmptyRegistry !== true &&
    registry.clients.length === 0 &&
    originalRecordCount > 0
  ) {
    throw createStorageReadError(CLIENT_PREFERENCES_PATH);
  }
  const records = {};
  for (let index = 0; index < registry.clients.length; index += 1) {
    const client = registry.clients[index];
    const legacyKey = `client:${client.id}`;
    const hasBinding =
      typeof client.bindingId === 'string' &&
      CLIENT_BINDING_PATTERN.test(client.bindingId);
    const canonicalKey = hasBinding
      ? `client-binding:${client.bindingId}`
      : legacyKey;
    const boundDocument = hasBinding
      ? collection.records[canonicalKey]
      : null;
    const legacyDocument = collection.records[legacyKey];
    if (boundDocument && boundDocument.scope === 'client') {
      records[canonicalKey] = boundDocument;
    } else if (
      legacyDocument &&
      legacyDocument.scope === 'client' &&
      legacyDocument.clientId === client.id
    ) {
      records[canonicalKey] = legacyDocument;
    }
  }
  if (JSON.stringify(records) !== JSON.stringify(collection.records)) {
    const reconciled = {
      contractVersion: CONTRACT_VERSION,
      records: records,
    };
    if (preferenceCollectionFits(reconciled, 'client')) {
      writeJson(CLIENT_PREFERENCES_PATH, reconciled);
    } else if (originalRecordCount > CLIENT_REGISTRY_LIMIT) {
      throw createStorageReadError(CLIENT_PREFERENCES_PATH);
    }
  }
  return true;
}

function publicPrincipal(principal) {
  return {
    providerId: sanitizeText(principal.providerId, 'unknown', 64),
    userId:
      typeof principal.userId === 'string'
        ? sanitizeText(principal.userId, null, 128)
        : null,
    userName:
      typeof principal.userName === 'string'
        ? sanitizeText(principal.userName, null, 120)
        : null,
  };
}

function publicRegistryClient(client) {
  return {
    id: client.id,
    name: client.name,
    kind: client.kind,
    firstSeenAt: client.firstSeenAt,
    lastSeenAt: client.lastSeenAt,
    lastRevision: client.lastRevision,
    principal: client.principal,
  };
}

function clientPreferenceBelongsToAnotherBinding(client) {
  const collection = readPreferenceCollection(CLIENT_PREFERENCES_PATH);
  const ownedKey = `client-binding:${client.bindingId}`;
  for (const key in collection.records) {
    if (
      Object.prototype.hasOwnProperty.call(collection.records, key) &&
      key.indexOf('client-binding:') === 0 &&
      key !== ownedKey &&
      collection.records[key] &&
      collection.records[key].clientId === client.id
    ) {
      return true;
    }
  }
  return false;
}

function touchClient(workspace, principal, client, lastRevision) {
  if (!client) {
    return true;
  }
  const registry = readRegistry();
  const hadRegistryClients = registry.clients.length > 0;
  const normalizedClients = normalizeRegistryClients(
    registry.clients,
    Date.now()
  );
  const registryChanged =
    JSON.stringify(normalizedClients) !== JSON.stringify(registry.clients);
  if (registryChanged) {
    registry.clients = normalizedClients;
  }
  if (registry.preferenceCollectionVersion !== 1 || registryChanged) {
    reconcileClientPreferences(registry, registryChanged && hadRegistryClients);
    registry.preferenceCollectionVersion = 1;
    registry.workspaceId = workspace.workspaceId;
    writeJson(CLIENT_REGISTRY_PATH, registry);
  }
  const timestamp = nowIso();
  let existing = null;
  let bindingContinuity = null;
  for (let index = 0; index < registry.clients.length; index += 1) {
    if (registry.clients[index].id === client.id) {
      existing = registry.clients[index];
    }
    if (registry.clients[index].bindingId === client.bindingId) {
      bindingContinuity = registry.clients[index];
    }
  }
  if (
    existing &&
    typeof existing.bindingId === 'string' &&
    CLIENT_BINDING_PATTERN.test(existing.bindingId) &&
    existing.bindingId !== client.bindingId
  ) {
    return false;
  }
  const continuity = existing || bindingContinuity;
  if (!continuity && registry.clients.length >= CLIENT_REGISTRY_LIMIT) {
    return 'capacity';
  }
  if (
    (!continuity ||
      typeof continuity.bindingId !== 'string' ||
      !CLIENT_BINDING_PATTERN.test(continuity.bindingId)) &&
    clientPreferenceBelongsToAnotherBinding(client)
  ) {
    return false;
  }
  const nextPrincipal = publicPrincipal(principal);
  const requestedRevision =
    Number.isSafeInteger(lastRevision) && lastRevision >= 0
      ? lastRevision
      : continuity
        ? continuity.lastRevision
        : null;
  if (
    continuity &&
    continuity.id === client.id &&
    continuity.name === client.name &&
    continuity.kind === client.kind &&
    continuity.lastRevision === requestedRevision &&
    continuity.principal &&
    continuity.principal.providerId === nextPrincipal.providerId &&
    continuity.principal.userId === nextPrincipal.userId &&
    continuity.principal.userName === nextPrincipal.userName &&
    continuity.bindingId === client.bindingId &&
    Number.isFinite(Date.parse(continuity.lastSeenAt)) &&
    Date.now() - Date.parse(continuity.lastSeenAt) < CLIENT_TOUCH_INTERVAL_MS
  ) {
    return true;
  }
  const next = {
    id: client.id,
    name: client.name,
    kind: client.kind,
    firstSeenAt: continuity ? continuity.firstSeenAt : timestamp,
    lastSeenAt: timestamp,
    lastRevision: requestedRevision,
    principal: nextPrincipal,
    bindingId: client.bindingId,
  };
  const retainedClients = registry.clients.filter(function (entry) {
    return entry.id !== client.id && entry.bindingId !== client.bindingId;
  });
  if (!continuity && retainedClients.length >= CLIENT_REGISTRY_LIMIT) {
    return 'capacity';
  }
  retainedClients.push(next);
  registry.clients = retainedClients.sort(compareRegistryClientsOldestFirst);
  registry.workspaceId = workspace.workspaceId;
  writeJson(CLIENT_REGISTRY_PATH, registry);
  if (continuity && continuity.id !== client.id) {
    reconcileClientPreferences(registry);
  }
  return true;
}

function touchClientAfterCommit(workspace, principal, client, lastRevision) {
  try {
    touchClient(workspace, principal, client, lastRevision);
  } catch (_error) {
    // The profile state is already committed. Registry freshness is secondary
    // and must not make a successful dashboard save look like a failure.
  }
}

function readProfile(r, principal, client, routedWorkspace, routedState) {
  try {
    const isRoutedRequest = arguments.length >= 5;
    const workspace = isRoutedRequest
      ? routedWorkspace
      : readOrCreateWorkspace();
    const state = isRoutedRequest ? routedState : readState(workspace);
    const profileResult = readCommittedProfile(state);
    const recovery = resolveRecovery(state, profileResult);
    applyStateHeaders(r, workspace, state, recovery);
    if (!isRoutedRequest) {
      client = readClient(r, false, principal);
      touchClient(workspace, principal, client, state.revision);
    }

    if (recovery.status === 'recoverable' || recovery.status === 'missing') {
      sendJson(r, 409, {
        error: 'The current dashboard profile file is missing',
        recovery: recovery,
      });
      return;
    }
    if (recovery.status === 'reset' || recovery.status === 'uninitialized') {
      sendNoContent(r);
      return;
    }

    const metadata = buildProfileMetadata(workspace, state);
    if (isProfileFresh(r, metadata)) {
      r.headersOut['Cache-Control'] = 'no-store';
      r.return(304);
      return;
    }
    r.headersOut['Cache-Control'] = 'no-store';
    r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
    r.return(200, JSON.stringify(profileResult.profile));
  } catch (error) {
    if (
      error &&
      (error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT' ||
        error.code === 'NAVET_PROFILE_STORAGE_WRITE')
    ) {
      throw error;
    }
    sendJson(r, 500, { error: 'Unable to read dashboard profile' });
  }
}

function writeProfile(r, principal, client, routedWorkspace, routedState) {
  try {
    const isRoutedRequest = arguments.length >= 5;
    const workspace = isRoutedRequest
      ? routedWorkspace
      : readOrCreateWorkspace();
    const state = isRoutedRequest ? routedState : readState(workspace);
    const profileResult = readCommittedProfile(state);
    const recovery = resolveRecovery(state, profileResult);
    const precondition = evaluateWritePrecondition(r, workspace, state);
    if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
      return;
    }

    if (!isRoutedRequest) {
      client = readClient(r, true, principal);
    }
    if (!client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const body = r.requestText || '';
    if (!body) {
      sendJson(r, 400, { error: 'Missing dashboard profile body' });
      return;
    }
    if (Buffer.byteLength(body, 'utf8') > MAX_PROFILE_BYTES) {
      sendJson(r, 413, { error: 'Dashboard profile is too large' });
      return;
    }
    const profile = JSON.parse(body);
    if (!isValidProfile(profile)) {
      sendJson(r, 400, { error: 'Unsupported dashboard profile' });
      return;
    }
    const sanitizedProfile = sanitizeDashboardProfile(profile);
    if (
      recovery.status === 'active' &&
      profileResult.profile &&
      areDashboardProfilesEquivalent(profileResult.profile, sanitizedProfile)
    ) {
      applyStateHeaders(r, workspace, state, recovery);
      sendJson(r, 200, {
        ok: true,
        revision: state.revision,
        updatedAt: state.metadata ? state.metadata.updatedAt : null,
      });
      return;
    }

    const metadata = createRevisionMetadata(
      workspace,
      state,
      'update',
      createAuthor(principal, client),
      readChangedPaths(r, ['/']),
      null
    );
    const nextState = persistRevision(
      state,
      profileResult.profile,
      metadata,
      sanitizedProfile
    );
    const nextRecovery = resolveRecovery(nextState, {
      status: 'present',
      profile: sanitizedProfile,
    });
    applyStateHeaders(r, workspace, nextState, nextRecovery);
    touchClientAfterCommit(workspace, principal, client, nextState.revision);
    sendJson(r, 200, {
      ok: true,
      revision: nextState.revision,
      updatedAt: metadata.updatedAt,
    });
  } catch (error) {
    if (
      error &&
      (error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT' ||
        error.code === 'NAVET_PROFILE_STORAGE_WRITE')
    ) {
      throw error;
    }
    if (error && error.code === 'NAVET_PROFILE_WRITE_LIMIT') {
      sendJson(r, 413, { error: 'Dashboard profile is too large' });
      return;
    }
    sendJson(r, 400, { error: 'Unable to save dashboard profile' });
  }
}

function decodePointer(path) {
  if (path === '') {
    return [];
  }
  if (typeof path !== 'string' || path.charAt(0) !== '/') {
    throw new Error('Invalid JSON pointer');
  }
  return path
    .slice(1)
    .split('/')
    .map(function (segment) {
      const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
      if (decoded === '__proto__' || decoded === 'prototype' || decoded === 'constructor') {
        throw new Error('Unsafe JSON pointer');
      }
      return decoded;
    });
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyPatchOperation(document, operation) {
  if (
    !operation ||
    (operation.op !== 'add' && operation.op !== 'replace' && operation.op !== 'remove') ||
    typeof operation.path !== 'string'
  ) {
    throw new Error('Unsupported patch operation');
  }
  const segments = decodePointer(operation.path);
  if (segments.length === 0) {
    if (operation.op === 'remove') {
      throw new Error('The profile root cannot be removed');
    }
    return cloneJson(operation.value);
  }

  let parent = document;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (
      parent === null ||
      typeof parent !== 'object' ||
      !Object.prototype.hasOwnProperty.call(parent, segment)
    ) {
      throw new Error('Patch path does not exist');
    }
    parent = parent[segment];
  }

  const key = segments[segments.length - 1];
  if (Array.isArray(parent)) {
    if (operation.op === 'add' && key === '-') {
      parent.push(cloneJson(operation.value));
      return document;
    }
    if (!/^\d+$/.test(key)) {
      throw new Error('Invalid array index');
    }
    const arrayIndex = Number.parseInt(key, 10);
    if (operation.op === 'add') {
      if (arrayIndex > parent.length) {
        throw new Error('Patch array index is out of range');
      }
      parent.splice(arrayIndex, 0, cloneJson(operation.value));
      return document;
    }
    if (arrayIndex >= parent.length) {
      throw new Error('Patch array index is out of range');
    }
    if (operation.op === 'remove') {
      parent.splice(arrayIndex, 1);
    } else {
      parent[arrayIndex] = cloneJson(operation.value);
    }
    return document;
  }

  if (parent === null || typeof parent !== 'object') {
    throw new Error('Patch parent is not an object');
  }
  if (operation.op === 'remove') {
    if (!Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new Error('Patch path does not exist');
    }
    delete parent[key];
  } else {
    if (operation.op === 'replace' && !Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new Error('Patch path does not exist');
    }
    parent[key] = cloneJson(operation.value);
  }
  return document;
}

function patchProfile(r, principal, client, routedWorkspace, routedState) {
  try {
    const isRoutedRequest = arguments.length >= 5;
    const workspace = isRoutedRequest
      ? routedWorkspace
      : readOrCreateWorkspace();
    const state = isRoutedRequest ? routedState : readState(workspace);
    const profileResult = readCommittedProfile(state);
    const recovery = resolveRecovery(state, profileResult);
    if (recovery.status !== 'active' || !profileResult.profile) {
      applyStateHeaders(r, workspace, state, recovery);
      sendJson(r, 409, { error: 'There is no active dashboard profile to patch' });
      return;
    }
    const precondition = evaluateWritePrecondition(r, workspace, state);
    if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
      return;
    }
    if (!isRoutedRequest) {
      client = readClient(r, true, principal);
    }
    if (!client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const body = r.requestText || '';
    if (!body || Buffer.byteLength(body, 'utf8') > MAX_PROFILE_BYTES) {
      sendJson(r, body ? 413 : 400, {
        error: body ? 'Dashboard patch is too large' : 'Missing dashboard patch body',
      });
      return;
    }
    const operations = JSON.parse(body);
    if (!Array.isArray(operations) || operations.length > MAX_PATCH_OPERATIONS) {
      sendJson(r, 400, { error: 'Unsupported dashboard patch' });
      return;
    }
    let profile = cloneJson(profileResult.profile);
    for (let index = 0; index < operations.length; index += 1) {
      profile = applyPatchOperation(profile, operations[index]);
    }
    if (!isValidProfile(profile)) {
      sendJson(r, 422, { error: 'Dashboard patch produced an invalid profile' });
      return;
    }
    profile = sanitizeDashboardProfile(profile);
    if (areDashboardProfilesEquivalent(profileResult.profile, profile)) {
      applyStateHeaders(r, workspace, state, recovery);
      sendJson(r, 200, {
        ok: true,
        revision: state.revision,
        updatedAt: state.metadata ? state.metadata.updatedAt : null,
      });
      return;
    }
    const changedPaths = operations.map(function (operation) {
      return operation.path || '/';
    });
    const metadata = createRevisionMetadata(
      workspace,
      state,
      'patch',
      createAuthor(principal, client),
      changedPaths,
      null
    );
    const nextState = persistRevision(state, profileResult.profile, metadata, profile);
    applyStateHeaders(
      r,
      workspace,
      nextState,
      resolveRecovery(nextState, { status: 'present', profile: profile })
    );
    touchClientAfterCommit(workspace, principal, client, nextState.revision);
    sendJson(r, 200, { ok: true, revision: nextState.revision, updatedAt: metadata.updatedAt });
  } catch (error) {
    if (
      error &&
      (error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT' ||
        error.code === 'NAVET_PROFILE_STORAGE_WRITE')
    ) {
      throw error;
    }
    if (error && error.code === 'NAVET_PROFILE_WRITE_LIMIT') {
      sendJson(r, 413, { error: 'Dashboard profile is too large' });
      return;
    }
    sendJson(r, 400, { error: 'Unable to patch dashboard profile' });
  }
}

function deleteProfile(r, principal, client, routedWorkspace, routedState) {
  try {
    const isRoutedRequest = arguments.length >= 5;
    const workspace = isRoutedRequest
      ? routedWorkspace
      : readOrCreateWorkspace();
    const state = isRoutedRequest ? routedState : readState(workspace);
    const profileResult = readCommittedProfile(state);
    const recovery = resolveRecovery(state, profileResult);
    const precondition = evaluateWritePrecondition(r, workspace, state);
    if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
      return;
    }
    if (!isRoutedRequest) {
      client = readClient(r, true, principal);
    }
    if (!client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const metadata = createRevisionMetadata(
      workspace,
      state,
      'reset',
      createAuthor(principal, client),
      ['/'],
      null
    );
    const nextState = persistRevision(state, profileResult.profile, metadata, null);
    const nextRecovery = resolveRecovery(nextState, { status: 'missing', profile: null });
    applyStateHeaders(r, workspace, nextState, nextRecovery);
    touchClientAfterCommit(workspace, principal, client, nextState.revision);
    sendNoContent(r);
  } catch (error) {
    if (
      error &&
      (error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT' ||
        error.code === 'NAVET_PROFILE_STORAGE_WRITE')
    ) {
      throw error;
    }
    sendJson(r, 500, { error: 'Unable to reset dashboard profile' });
  }
}

function publicHistoryEntry(entry) {
  const metadata = entry.metadata;
  return Object.assign({}, metadata, { hasProfile: Boolean(entry.profile) });
}

function listHistory(r, workspace, state) {
  const recovery = resolveRecovery(state, readCommittedProfile(state));
  applyStateHeaders(r, workspace, state, recovery);
  sendJson(r, 200, {
    workspace: publicWorkspace(workspace),
    entries: committedHistory(state)
      .slice()
      .reverse()
      .map(publicHistoryEntry),
  });
}

function findHistoryRevision(state, revision) {
  const history = committedHistory(state);
  for (let index = 0; index < history.length; index += 1) {
    if (history[index].metadata.revision === revision) {
      return history[index];
    }
  }
  return null;
}

function loadRevision(r, workspace, state, revision) {
  const entry = findHistoryRevision(state, revision);
  const recovery = resolveRecovery(state, readCommittedProfile(state));
  applyStateHeaders(r, workspace, state, recovery);
  if (!entry) {
    sendJson(r, 404, { error: 'Dashboard profile revision not found' });
    return;
  }
  sendJson(r, 200, {
    workspace: publicWorkspace(workspace),
    metadata: entry.metadata,
    recovery: entry.profile
      ? {
          status: 'active',
          resetRevision: null,
          latestRecoverableRevision: revision,
        }
      : {
          status: 'reset',
          resetRevision: revision,
          latestRecoverableRevision: latestRecoverableRevision(state),
        },
    profile: entry.profile,
  });
}

function restoreRevision(
  r,
  principal,
  workspace,
  state,
  revision,
  client
) {
  const profileResult = readCommittedProfile(state);
  const recovery = resolveRecovery(state, profileResult);
  const precondition = evaluateWritePrecondition(r, workspace, state);
  if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
    return;
  }
  if (!client) {
    sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
    return;
  }
  const entry = findHistoryRevision(state, revision);
  if (!entry || !entry.profile) {
    sendJson(r, 404, { error: 'Recoverable dashboard profile revision not found' });
    return;
  }
  const metadata = createRevisionMetadata(
    workspace,
    state,
    'restore',
    createAuthor(principal, client),
    ['/'],
    { restoredFromRevision: revision }
  );
  const nextState = persistRevision(
    state,
    profileResult.profile,
    metadata,
    entry.profile
  );
  applyStateHeaders(
    r,
    workspace,
    nextState,
    resolveRecovery(nextState, { status: 'present', profile: entry.profile })
  );
  touchClientAfterCommit(workspace, principal, client, nextState.revision);
  sendJson(r, 200, {
    ok: true,
    revision: nextState.revision,
    restoredFromRevision: revision,
  });
}

function principalStorageKey(principal) {
  const providerId = sanitizeText(principal.providerId, 'unknown', 64);
  const userIdentity =
    typeof principal.userId === 'string' && principal.userId
      ? `user:${sanitizeText(principal.userId, 'unknown', 128)}`
      : `session:${sanitizeText(principal.sessionId, 'unknown', 128)}`;
  return `${providerId}|${userIdentity}`;
}

function readPreferenceCollection(path) {
  const collection = readJson(path, {
    contractVersion: CONTRACT_VERSION,
    records: {},
  }, MAX_PREFERENCE_COLLECTION_BYTES);
  const validCollection =
    collection &&
    collection.contractVersion === CONTRACT_VERSION &&
    collection.records &&
    typeof collection.records === 'object' &&
    !Array.isArray(collection.records)
    ? collection
    : { contractVersion: CONTRACT_VERSION, records: {} };
  let changed = false;
  for (const key in validCollection.records) {
    if (!Object.prototype.hasOwnProperty.call(validCollection.records, key)) {
      continue;
    }
    const document = validCollection.records[key];
    if (!document || (document.scope !== 'account' && document.scope !== 'client')) {
      continue;
    }
    const values = sanitizePreferenceValues(document.values, document.scope);
    if (JSON.stringify(values) !== JSON.stringify(document.values)) {
      document.values = values;
      changed = true;
    }
    if (
      document.scope === 'client' &&
      typeof document.clientId === 'string' &&
      /^[A-Za-z0-9_-]{8,128}$/.test(document.clientId) &&
      key.indexOf('client-binding:') !== 0
    ) {
      const canonicalKey = `client:${document.clientId}`;
      if (key !== canonicalKey) {
        const canonical = validCollection.records[canonicalKey];
        if (!canonical || Number(document.revision) > Number(canonical.revision)) {
          validCollection.records[canonicalKey] = document;
        }
        delete validCollection.records[key];
        changed = true;
      }
    }
  }
  const scope = path === CLIENT_PREFERENCES_PATH ? 'client' : 'account';
  if (changed && preferenceCollectionFits(validCollection, scope)) {
    writeJson(path, validCollection);
  }
  return validCollection;
}

function preferenceRecordKey(scope, principal, client) {
  return scope === 'client'
    ? `client-binding:${client.bindingId}`
    : principalStorageKey(principal);
}

function preferencePath(scope) {
  return scope === 'client' ? CLIENT_PREFERENCES_PATH : ACCOUNT_PREFERENCES_PATH;
}

function preferenceCollectionFits(collection, scope) {
  if (
    scope === 'client' &&
    Object.keys(collection.records).length > CLIENT_REGISTRY_LIMIT
  ) {
    return false;
  }
  return (
    Buffer.byteLength(JSON.stringify(collection), 'utf8') <=
    MAX_PREFERENCE_COLLECTION_BYTES
  );
}

function migrateLegacyClientPreference(collection, client) {
  const bindingKey = `client-binding:${client.bindingId}`;
  const legacyKey = `client:${client.id}`;
  if (!collection.records[bindingKey] && collection.records[legacyKey]) {
    const nextCollection = {
      contractVersion: CONTRACT_VERSION,
      records: Object.assign({}, collection.records),
    };
    nextCollection.records[bindingKey] = nextCollection.records[legacyKey];
    delete nextCollection.records[legacyKey];
    if (preferenceCollectionFits(nextCollection, 'client')) {
      collection.records = nextCollection.records;
      writeJson(CLIENT_PREFERENCES_PATH, nextCollection);
    }
  }
}

function loadPreference(r, principal, scope, workspace, client) {
  if (scope === 'account' && (!principal.userId || typeof principal.userId !== 'string')) {
    sendJson(r, 403, { error: 'A verified account identity is required' });
    return;
  }
  if (scope === 'client' && !client) {
    sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
    return;
  }
  const collection = readPreferenceCollection(preferencePath(scope));
  if (scope === 'client') {
    migrateLegacyClientPreference(collection, client);
  }
  const key = preferenceRecordKey(scope, principal, client);
  const document =
    collection.records[key] ||
    (scope === 'client' ? collection.records[`client:${client.id}`] : null);
  applyWorkspaceHeaders(r, workspace);
  if (!document) {
    sendNoContent(r);
    return;
  }
  r.headersOut[HEADERS.preferenceRevision] = String(document.revision);
  r.headersOut.ETag = `"navet-preference-${scope}-${document.revision}"`;
  sendJson(r, 200, document);
}

function writePreference(r, principal, scope, workspace, client) {
  try {
    if (scope === 'account' && (!principal.userId || typeof principal.userId !== 'string')) {
      sendJson(r, 403, { error: 'A verified account identity is required' });
      return;
    }
    if (scope === 'client' && !client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const body = r.requestText || '';
    if (!body || Buffer.byteLength(body, 'utf8') > MAX_PREFERENCE_BYTES) {
      sendJson(r, body ? 413 : 400, {
        error: body ? 'Preference document is too large' : 'Missing preference body',
      });
      return;
    }
    const input = JSON.parse(body);
    if (
      !input ||
      !Number.isSafeInteger(input.schemaVersion) ||
      input.schemaVersion < 1 ||
      !input.values ||
      typeof input.values !== 'object' ||
      Array.isArray(input.values)
    ) {
      sendJson(r, 400, { error: 'Unsupported preference document' });
      return;
    }
    const collection = readPreferenceCollection(preferencePath(scope));
    if (scope === 'client') {
      migrateLegacyClientPreference(collection, client);
    }
    const key = preferenceRecordKey(scope, principal, client);
    const legacyKey = scope === 'client' ? `client:${client.id}` : null;
    const current =
      collection.records[key] ||
      (legacyKey ? collection.records[legacyKey] : null);
    const currentRevision = current ? current.revision : 0;
    const baseRevision = parseRevision(getHeader(r, HEADERS.baseRevision));
    if (baseRevision === null && currentRevision > 0) {
      r.headersOut[HEADERS.preferenceRevision] = String(currentRevision);
      sendJson(r, 428, { error: 'A base preference revision is required' });
      return;
    }
    if (baseRevision !== null && baseRevision !== currentRevision) {
      r.headersOut[HEADERS.preferenceRevision] = String(currentRevision);
      sendJson(r, 412, {
        error: 'Preferences changed before save',
        revision: currentRevision,
      });
      return;
    }
    const document = {
      contractVersion: CONTRACT_VERSION,
      schemaVersion: input.schemaVersion,
      scope: scope,
      revision: currentRevision + 1,
      updatedAt: nowIso(),
      values: sanitizePreferenceValues(input.values, scope),
      principal: publicPrincipal(principal),
      clientId: scope === 'client' ? client.id : null,
    };
    const nextCollection = {
      contractVersion: CONTRACT_VERSION,
      records: Object.assign({}, collection.records),
    };
    if (legacyKey) {
      delete nextCollection.records[legacyKey];
    }
    nextCollection.records[key] = document;
    if (!preferenceCollectionFits(nextCollection, scope)) {
      if (scope === 'client') {
        sendClientCapacityUnavailable(r);
      } else {
        sendProfileStorageUnavailable(r);
      }
      return;
    }
    writeJson(preferencePath(scope), nextCollection);
    applyWorkspaceHeaders(r, workspace);
    r.headersOut[HEADERS.preferenceRevision] = String(document.revision);
    r.headersOut.ETag = `"navet-preference-${scope}-${document.revision}"`;
    sendJson(r, 200, document);
  } catch (error) {
    if (error && error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT') {
      throw error;
    }
    sendJson(r, 400, { error: 'Unable to save preferences' });
  }
}

function deletePreference(r, principal, scope, workspace, client) {
  if (scope === 'account' && (!principal.userId || typeof principal.userId !== 'string')) {
    sendJson(r, 403, { error: 'A verified account identity is required' });
    return;
  }
  if (scope === 'client' && !client) {
    sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
    return;
  }
  const collection = readPreferenceCollection(preferencePath(scope));
  if (scope === 'client') {
    migrateLegacyClientPreference(collection, client);
  }
  const key = preferenceRecordKey(scope, principal, client);
  delete collection.records[key];
  if (scope === 'client') {
    delete collection.records[`client:${client.id}`];
  }
  writeJson(preferencePath(scope), collection);
  applyWorkspaceHeaders(r, workspace);
  sendNoContent(r);
}

function listClients(r, workspace) {
  const registry = readRegistry();
  const clients = normalizeRegistryClients(registry.clients, Date.now());
  applyWorkspaceHeaders(r, workspace);
  sendJson(r, 200, {
    workspace: publicWorkspace(workspace),
    clients: clients
      .slice()
      .sort(compareRegistryClientsNewestFirst)
      .map(publicRegistryClient),
  });
}

function forgetClient(r, workspace, clientId, requestingClient) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientId)) {
    sendJson(r, 400, { error: 'Invalid dashboard client identity' });
    return;
  }
  const registry = readRegistry();
  const ownedClient = registry.clients.find(function (entry) {
    return (
      entry.id === clientId &&
      requestingClient &&
      requestingClient.id === clientId &&
      entry.bindingId === requestingClient.bindingId
    );
  });
  if (!ownedClient) {
    sendClientForbidden(r);
    return;
  }
  const before = registry.clients.length;
  registry.clients = registry.clients.filter(function (entry) {
    return entry.id !== clientId;
  });
  writeJson(CLIENT_REGISTRY_PATH, registry);
  const preferences = readPreferenceCollection(CLIENT_PREFERENCES_PATH);
  for (const key in preferences.records) {
    if (
      Object.prototype.hasOwnProperty.call(preferences.records, key) &&
      (key === `client-binding:${ownedClient.bindingId}` ||
        key === `client:${clientId}` ||
        key.slice(Math.max(0, key.length - (`|client:${clientId}`).length)) ===
          `|client:${clientId}` ||
        (preferences.records[key] && preferences.records[key].clientId === clientId))
    ) {
      delete preferences.records[key];
    }
  }
  writeJson(CLIENT_PREFERENCES_PATH, preferences);
  applyWorkspaceHeaders(r, workspace);
  sendJson(r, 200, {
    ok: true,
    forgotten: registry.clients.length !== before,
    credentialsRevoked: false,
  });
}

function routeRequest(r, principal) {
  const uri = typeof r.uri === 'string' ? r.uri.replace(/\/+$/, '') : '';
  const normalizedUri = uri || '/__navet_profile__/default';
  const workspace = authorizeWorkspacePrincipal(principal);
  if (!workspace) {
    sendWorkspaceForbidden(r);
    return;
  }
  if (r.method !== 'GET' && !isStrictSameOriginMutation(r)) {
    sendJson(r, 403, { error: 'Cross-origin profile mutation is not allowed' });
    return;
  }
  const requestClient = readClient(r, false, principal);
  const isDefaultProfileRequest =
    normalizedUri === '/__navet_profile__/default' &&
    (r.method === 'GET' ||
      r.method === 'PUT' ||
      r.method === 'PATCH' ||
      r.method === 'DELETE');
  const routedProfileState = isDefaultProfileRequest
    ? readState(workspace)
    : null;
  if (requestClient) {
    const touchResult = touchClient(
      workspace,
      principal,
      requestClient,
      routedProfileState ? routedProfileState.revision : null
    );
    if (touchResult === 'capacity') {
      sendClientCapacityUnavailable(r);
      return;
    }
    if (!touchResult) {
      sendClientForbidden(r);
      return;
    }
  }

  if (normalizedUri === '/__navet_profile__/default') {
    if (r.method === 'GET') {
      readProfile(
        r,
        principal,
        requestClient,
        workspace,
        routedProfileState
      );
    } else if (r.method === 'PUT') {
      writeProfile(
        r,
        principal,
        requestClient,
        workspace,
        routedProfileState
      );
    } else if (r.method === 'PATCH') {
      patchProfile(
        r,
        principal,
        requestClient,
        workspace,
        routedProfileState
      );
    } else if (r.method === 'DELETE') {
      deleteProfile(
        r,
        principal,
        requestClient,
        workspace,
        routedProfileState
      );
    } else {
      r.headersOut.Allow = 'GET, PUT, PATCH, DELETE';
      sendJson(r, 405, { error: 'Method not allowed' });
    }
    return;
  }

  if (normalizedUri === '/__navet_profile__/default/history') {
    if (r.method !== 'GET') {
      r.headersOut.Allow = 'GET';
      sendJson(r, 405, { error: 'Method not allowed' });
      return;
    }
    listHistory(r, workspace, readState(workspace));
    return;
  }

  const revisionMatch = normalizedUri.match(
    /^\/__navet_profile__\/default\/revisions\/(\d+)(\/restore)?$/
  );
  if (revisionMatch) {
    const revision = Number.parseInt(revisionMatch[1], 10);
    const state = readState(workspace);
    if (revisionMatch[2]) {
      if (r.method !== 'POST') {
        r.headersOut.Allow = 'POST';
        sendJson(r, 405, { error: 'Method not allowed' });
        return;
      }
      restoreRevision(
        r,
        principal,
        workspace,
        state,
        revision,
        requestClient
      );
    } else if (r.method === 'GET') {
      loadRevision(r, workspace, state, revision);
    } else {
      r.headersOut.Allow = 'GET';
      sendJson(r, 405, { error: 'Method not allowed' });
    }
    return;
  }

  const preferenceMatch = normalizedUri.match(
    /^\/__navet_profile__\/preferences\/(account|client)$/
  );
  if (preferenceMatch) {
    const scope = preferenceMatch[1];
    if (r.method === 'GET') {
      loadPreference(r, principal, scope, workspace, requestClient);
    } else if (r.method === 'PUT') {
      writePreference(r, principal, scope, workspace, requestClient);
    } else if (r.method === 'DELETE') {
      deletePreference(r, principal, scope, workspace, requestClient);
    } else {
      r.headersOut.Allow = 'GET, PUT, DELETE';
      sendJson(r, 405, { error: 'Method not allowed' });
    }
    return;
  }

  if (normalizedUri === '/__navet_profile__/clients') {
    if (r.method === 'GET' || r.method === 'PUT') {
      if (r.method === 'PUT' && !requestClient) {
        sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
        return;
      }
      listClients(r, workspace);
    } else {
      r.headersOut.Allow = 'GET, PUT';
      sendJson(r, 405, { error: 'Method not allowed' });
    }
    return;
  }

  const clientMatch = normalizedUri.match(/^\/__navet_profile__\/clients\/([^/]+)$/);
  if (clientMatch) {
    if (r.method !== 'DELETE') {
      r.headersOut.Allow = 'DELETE';
      sendJson(r, 405, { error: 'Method not allowed' });
      return;
    }
    forgetClient(
      r,
      workspace,
      safeDecodeURIComponent(clientMatch[1]),
      requestClient
    );
    return;
  }

  sendJson(r, 404, { error: 'Dashboard profile resource not found' });
}

function handleWithOptions(r, options) {
  let principal = null;
  try {
    principal = principalResolver(r, {
      trustIngressHeaders: Boolean(options && options.trustIngressHeaders),
    });
  } catch (_error) {
    principal = null;
  }
  if (!principal) {
    sendUnauthorized(r);
    return;
  }
  try {
    routeRequest(r, principal);
  } catch (error) {
    if (
      error &&
      (error.code === 'NAVET_PROFILE_STORAGE_READ_LIMIT' ||
        error.code === 'NAVET_PROFILE_STORAGE_WRITE')
    ) {
      sendProfileStorageUnavailable(r);
      return;
    }
    if (error && error.code === 'NAVET_PROFILE_WRITE_LIMIT') {
      sendJson(r, 413, { error: 'Dashboard profile is too large' });
      return;
    }
    throw error;
  }
}

function handle(r) {
  handleWithOptions(r, { trustIngressHeaders: false });
}

function handleIngress(r) {
  handleWithOptions(r, { trustIngressHeaders: true });
}

export default {
  buildProfileMetadata,
  createProfileGeneration,
  deleteProfile,
  handle,
  handleIngress,
  isProfileFresh,
  isWritePreconditionSatisfied,
  patchProfile,
  publicWorkspace,
  readProfile,
  readOrCreateWorkspace,
  resetProfileStoreFsForTests,
  routeRequest,
  setProfileStoreFsForTests,
  setProfileStorePrincipalResolverForTests,
  writeProfile,
};
