import fs from 'fs';
import authStore from './auth-store.js';

const CONTRACT_VERSION = 1;
const SETTINGS_PROFILE_SCHEMA_VERSION = 1;
const PROFILE_ID = 'default';
const HISTORY_LIMIT = 20;
const MAX_PROFILE_BYTES = 1024 * 1024;
const MAX_PREFERENCE_BYTES = 256 * 1024;
const MAX_PATCH_OPERATIONS = 200;
const CLIENT_TOUCH_INTERVAL_MS = 60 * 1000;
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

function readJson(path, fallback) {
  try {
    return JSON.parse(fsModule.readFileSync(path, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

function writeJson(path, value) {
  const temporaryPath = path + '.tmp';
  fsModule.writeFileSync(temporaryPath, JSON.stringify(value), 'utf8');
  fsModule.renameSync(temporaryPath, path);
}

function removeFile(path) {
  try {
    fsModule.unlinkSync(path);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
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

function readOrCreateWorkspace() {
  const existing = readJson(WORKSPACE_PATH, null);
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
      return { status: 'invalid', profile: null };
    }
    const profile = JSON.parse(fsModule.readFileSync(PROFILE_PATH, 'utf8'));
    if (!isValidProfile(profile)) {
      return { status: 'invalid', profile: null };
    }
    const sanitized = sanitizeDashboardProfile(profile);
    if (JSON.stringify(sanitized) !== JSON.stringify(profile)) {
      writeJson(PROFILE_PATH, sanitized);
    }
    return { status: 'present', profile: sanitized };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { status: 'missing', profile: null };
    }
    return { status: 'invalid', profile: null };
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
    Number.isSafeInteger(value.revision) &&
    value.revision > 0 &&
    typeof value.generation === 'string' &&
    (value.kind === 'update' ||
      value.kind === 'patch' ||
      value.kind === 'reset' ||
      value.kind === 'restore') &&
    typeof value.updatedAt === 'string' &&
    isValidAuthor(value.author) &&
    Array.isArray(value.changedPaths)
  );
}

function createInitialState() {
  return {
    contractVersion: CONTRACT_VERSION,
    revision: 0,
    generation: createProfileGeneration(),
    status: 'uninitialized',
    resetRevision: null,
    metadata: null,
  };
}

function readHistory() {
  const history = readJson(PROFILE_HISTORY_PATH, []);
  if (!Array.isArray(history)) {
    return [];
  }
  let changed = false;
  const sanitizedHistory = history
    .filter(function (entry) {
      return entry && isValidRevisionMetadata(entry.metadata);
    })
    .map(function (entry) {
      if (!entry.profile || !isValidProfile(entry.profile)) {
        changed = true;
        return {
          metadata: entry.metadata,
          profile: null,
        };
      }
      const profile = sanitizeDashboardProfile(entry.profile);
      if (JSON.stringify(profile) !== JSON.stringify(entry.profile)) {
        changed = true;
      }
      return {
        metadata: entry.metadata,
        profile: profile,
      };
    })
    .slice(-HISTORY_LIMIT);
  if (sanitizedHistory.length !== history.length) {
    changed = true;
  }
  if (changed) {
    writeJson(PROFILE_HISTORY_PATH, sanitizedHistory);
  }
  return sanitizedHistory;
}

function writeHistory(history) {
  writeJson(PROFILE_HISTORY_PATH, history.slice(-HISTORY_LIMIT));
}

function appendHistory(metadata, profile) {
  const history = readHistory();
  history.push({
    metadata: metadata,
    profile: profile && isValidProfile(profile) ? sanitizeDashboardProfile(profile) : null,
  });
  writeHistory(history);
}

function migrateLegacyProfile(workspace, profile) {
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
  };
  writeJson(PROFILE_STATE_PATH, state);
  appendHistory(metadata, profile);
  return state;
}

function readState(workspace) {
  const state = readJson(PROFILE_STATE_PATH, null);
  if (
    state &&
    state.contractVersion === CONTRACT_VERSION &&
    Number.isSafeInteger(state.revision) &&
    state.revision >= 0 &&
    typeof state.generation === 'string' &&
    (state.status === 'uninitialized' || state.status === 'active' || state.status === 'reset') &&
    (state.metadata === null || isValidRevisionMetadata(state.metadata))
  ) {
    return state;
  }

  const profileResult = readProfileFile();
  if (profileResult.status === 'present') {
    return migrateLegacyProfile(workspace, profileResult.profile);
  }

  const history = readHistory();
  if (history.length > 0) {
    const latest = history[history.length - 1];
    const recovered = {
      contractVersion: CONTRACT_VERSION,
      revision: latest.metadata.revision,
      generation: latest.metadata.generation,
      status: latest.profile ? 'active' : 'reset',
      resetRevision: latest.profile ? null : latest.metadata.revision,
      metadata: latest.metadata,
    };
    writeJson(PROFILE_STATE_PATH, recovered);
    return recovered;
  }

  const initial = createInitialState();
  writeJson(PROFILE_STATE_PATH, initial);
  return initial;
}

function latestRecoverableRevision() {
  const history = readHistory();
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].profile && isValidProfile(history[index].profile)) {
      return history[index].metadata.revision;
    }
  }
  return null;
}

function resolveRecovery(state, profileResult) {
  if (state.status === 'reset') {
    return {
      status: 'reset',
      resetRevision: state.resetRevision,
      latestRecoverableRevision: latestRecoverableRevision(),
    };
  }
  if (state.status === 'uninitialized') {
    return {
      status: 'uninitialized',
      resetRevision: null,
      latestRecoverableRevision: latestRecoverableRevision(),
    };
  }
  if (profileResult.status === 'present') {
    return {
      status: 'active',
      resetRevision: null,
      latestRecoverableRevision: latestRecoverableRevision(),
    };
  }

  const recoverableRevision = latestRecoverableRevision();
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
  const baseRevision = parseRevision(getHeader(r, HEADERS.baseRevision));
  const ifMatch = getHeader(r, 'If-Match');
  const ifUnmodifiedSince = getHeader(r, 'If-Unmodified-Since');
  const validators = buildProfileMetadata(workspace, state);

  if (baseRevision !== null) {
    return baseRevision === state.revision ? 'satisfied' : 'failed';
  }
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

function readClient(r, required) {
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

function persistRevision(metadata, profile) {
  const sanitizedProfile = profile ? sanitizeDashboardProfile(profile) : null;
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
  };
  writeJson(PROFILE_STATE_PATH, state);
  appendHistory(metadata, sanitizedProfile);
  return state;
}

function readRegistry() {
  const registry = readJson(CLIENT_REGISTRY_PATH, {
    contractVersion: CONTRACT_VERSION,
    clients: [],
  });
  return registry &&
    registry.contractVersion === CONTRACT_VERSION &&
    Array.isArray(registry.clients)
    ? registry
    : { contractVersion: CONTRACT_VERSION, clients: [] };
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

function touchClient(workspace, principal, client, lastRevision) {
  if (!client) {
    return;
  }
  const registry = readRegistry();
  const timestamp = nowIso();
  let existing = null;
  for (let index = 0; index < registry.clients.length; index += 1) {
    if (registry.clients[index].id === client.id) {
      existing = registry.clients[index];
      break;
    }
  }
  const nextPrincipal = publicPrincipal(principal);
  const requestedRevision =
    Number.isSafeInteger(lastRevision) && lastRevision >= 0
      ? lastRevision
      : existing
        ? existing.lastRevision
        : null;
  if (
    existing &&
    existing.name === client.name &&
    existing.kind === client.kind &&
    existing.lastRevision === requestedRevision &&
    existing.principal &&
    existing.principal.providerId === nextPrincipal.providerId &&
    existing.principal.userId === nextPrincipal.userId &&
    existing.principal.userName === nextPrincipal.userName &&
    Number.isFinite(Date.parse(existing.lastSeenAt)) &&
    Date.now() - Date.parse(existing.lastSeenAt) < CLIENT_TOUCH_INTERVAL_MS
  ) {
    return;
  }
  const next = {
    id: client.id,
    name: client.name,
    kind: client.kind,
    firstSeenAt: existing ? existing.firstSeenAt : timestamp,
    lastSeenAt: timestamp,
    lastRevision: requestedRevision,
    principal: nextPrincipal,
  };
  registry.clients = registry.clients.filter(function (entry) {
    return entry.id !== client.id;
  });
  registry.clients.push(next);
  registry.clients = registry.clients
    .sort(function (left, right) {
      return String(left.lastSeenAt).localeCompare(String(right.lastSeenAt));
    })
    .slice(-200);
  registry.workspaceId = workspace.workspaceId;
  writeJson(CLIENT_REGISTRY_PATH, registry);
}

function readProfile(r, principal) {
  try {
    const workspace = readOrCreateWorkspace();
    const state = readState(workspace);
    const profileResult = readProfileFile();
    const recovery = resolveRecovery(state, profileResult);
    applyStateHeaders(r, workspace, state, recovery);
    touchClient(workspace, principal, readClient(r, false), state.revision);

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
  } catch (_error) {
    sendJson(r, 500, { error: 'Unable to read dashboard profile' });
  }
}

function writeProfile(r, principal) {
  try {
    const workspace = readOrCreateWorkspace();
    const state = readState(workspace);
    const profileResult = readProfileFile();
    const recovery = resolveRecovery(state, profileResult);
    const precondition = evaluateWritePrecondition(r, workspace, state);
    if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
      return;
    }

    const client = readClient(r, true);
    if (!client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const body = r.requestText || '';
    if (!body) {
      sendJson(r, 400, { error: 'Missing dashboard profile body' });
      return;
    }
    if (body.length > MAX_PROFILE_BYTES) {
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
      touchClient(workspace, principal, client, state.revision);
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
    const nextState = persistRevision(metadata, sanitizedProfile);
    const nextRecovery = resolveRecovery(nextState, {
      status: 'present',
      profile: sanitizedProfile,
    });
    applyStateHeaders(r, workspace, nextState, nextRecovery);
    touchClient(workspace, principal, client, nextState.revision);
    sendJson(r, 200, {
      ok: true,
      revision: nextState.revision,
      updatedAt: metadata.updatedAt,
    });
  } catch (_error) {
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

function patchProfile(r, principal) {
  try {
    const workspace = readOrCreateWorkspace();
    const state = readState(workspace);
    const profileResult = readProfileFile();
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
    const client = readClient(r, true);
    if (!client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const body = r.requestText || '';
    if (!body || body.length > MAX_PROFILE_BYTES) {
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
      touchClient(workspace, principal, client, state.revision);
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
    const nextState = persistRevision(metadata, profile);
    applyStateHeaders(
      r,
      workspace,
      nextState,
      resolveRecovery(nextState, { status: 'present', profile: profile })
    );
    touchClient(workspace, principal, client, nextState.revision);
    sendJson(r, 200, { ok: true, revision: nextState.revision, updatedAt: metadata.updatedAt });
  } catch (_error) {
    sendJson(r, 400, { error: 'Unable to patch dashboard profile' });
  }
}

function deleteProfile(r, principal) {
  try {
    const workspace = readOrCreateWorkspace();
    const state = readState(workspace);
    const recovery = resolveRecovery(state, readProfileFile());
    const precondition = evaluateWritePrecondition(r, workspace, state);
    if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
      return;
    }
    const client = readClient(r, true);
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
    const nextState = persistRevision(metadata, null);
    const nextRecovery = resolveRecovery(nextState, { status: 'missing', profile: null });
    applyStateHeaders(r, workspace, nextState, nextRecovery);
    touchClient(workspace, principal, client, nextState.revision);
    sendNoContent(r);
  } catch (_error) {
    sendJson(r, 500, { error: 'Unable to reset dashboard profile' });
  }
}

function publicHistoryEntry(entry) {
  const metadata = entry.metadata;
  return Object.assign({}, metadata, { hasProfile: Boolean(entry.profile) });
}

function listHistory(r, workspace, state) {
  const recovery = resolveRecovery(state, readProfileFile());
  applyStateHeaders(r, workspace, state, recovery);
  sendJson(r, 200, {
    workspace: workspace,
    entries: readHistory()
      .slice()
      .reverse()
      .map(publicHistoryEntry),
  });
}

function findHistoryRevision(revision) {
  const history = readHistory();
  for (let index = 0; index < history.length; index += 1) {
    if (history[index].metadata.revision === revision) {
      return history[index];
    }
  }
  return null;
}

function loadRevision(r, workspace, state, revision) {
  const entry = findHistoryRevision(revision);
  const recovery = resolveRecovery(state, readProfileFile());
  applyStateHeaders(r, workspace, state, recovery);
  if (!entry) {
    sendJson(r, 404, { error: 'Dashboard profile revision not found' });
    return;
  }
  sendJson(r, 200, {
    workspace: workspace,
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
          latestRecoverableRevision: latestRecoverableRevision(),
        },
    profile: entry.profile,
  });
}

function restoreRevision(r, principal, workspace, state, revision) {
  const recovery = resolveRecovery(state, readProfileFile());
  const precondition = evaluateWritePrecondition(r, workspace, state);
  if (sendPreconditionResult(r, workspace, state, recovery, precondition)) {
    return;
  }
  const client = readClient(r, true);
  if (!client) {
    sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
    return;
  }
  const entry = findHistoryRevision(revision);
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
  const nextState = persistRevision(metadata, entry.profile);
  applyStateHeaders(
    r,
    workspace,
    nextState,
    resolveRecovery(nextState, { status: 'present', profile: entry.profile })
  );
  touchClient(workspace, principal, client, nextState.revision);
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
  });
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
      /^[A-Za-z0-9_-]{8,128}$/.test(document.clientId)
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
  if (changed) {
    writeJson(path, validCollection);
  }
  return validCollection;
}

function preferenceRecordKey(scope, principal, client) {
  return scope === 'client' ? `client:${client.id}` : principalStorageKey(principal);
}

function preferencePath(scope) {
  return scope === 'client' ? CLIENT_PREFERENCES_PATH : ACCOUNT_PREFERENCES_PATH;
}

function loadPreference(r, principal, scope, workspace) {
  if (scope === 'account' && (!principal.userId || typeof principal.userId !== 'string')) {
    sendJson(r, 403, { error: 'A verified account identity is required' });
    return;
  }
  const client = readClient(r, scope === 'client');
  if (scope === 'client' && !client) {
    sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
    return;
  }
  const collection = readPreferenceCollection(preferencePath(scope));
  const key = preferenceRecordKey(scope, principal, client);
  const document = collection.records[key];
  applyWorkspaceHeaders(r, workspace);
  touchClient(workspace, principal, client, null);
  if (!document) {
    sendNoContent(r);
    return;
  }
  r.headersOut[HEADERS.preferenceRevision] = String(document.revision);
  r.headersOut.ETag = `"navet-preference-${scope}-${document.revision}"`;
  sendJson(r, 200, document);
}

function writePreference(r, principal, scope, workspace) {
  try {
    if (scope === 'account' && (!principal.userId || typeof principal.userId !== 'string')) {
      sendJson(r, 403, { error: 'A verified account identity is required' });
      return;
    }
    const client = readClient(r, scope === 'client');
    if (scope === 'client' && !client) {
      sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
      return;
    }
    const body = r.requestText || '';
    if (!body || body.length > MAX_PREFERENCE_BYTES) {
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
    const key = preferenceRecordKey(scope, principal, client);
    const current = collection.records[key] || null;
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
    collection.records[key] = document;
    writeJson(preferencePath(scope), collection);
    applyWorkspaceHeaders(r, workspace);
    r.headersOut[HEADERS.preferenceRevision] = String(document.revision);
    r.headersOut.ETag = `"navet-preference-${scope}-${document.revision}"`;
    touchClient(workspace, principal, client, null);
    sendJson(r, 200, document);
  } catch (_error) {
    sendJson(r, 400, { error: 'Unable to save preferences' });
  }
}

function deletePreference(r, principal, scope, workspace) {
  if (scope === 'account' && (!principal.userId || typeof principal.userId !== 'string')) {
    sendJson(r, 403, { error: 'A verified account identity is required' });
    return;
  }
  const client = readClient(r, scope === 'client');
  if (scope === 'client' && !client) {
    sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
    return;
  }
  const collection = readPreferenceCollection(preferencePath(scope));
  const key = preferenceRecordKey(scope, principal, client);
  delete collection.records[key];
  writeJson(preferencePath(scope), collection);
  applyWorkspaceHeaders(r, workspace);
  sendNoContent(r);
}

function listClients(r, workspace, principal) {
  const client = readClient(r, false);
  touchClient(workspace, principal, client, null);
  const registry = readRegistry();
  applyWorkspaceHeaders(r, workspace);
  sendJson(r, 200, {
    workspace: workspace,
    clients: registry.clients
      .slice()
      .sort(function (left, right) {
        return String(right.lastSeenAt).localeCompare(String(left.lastSeenAt));
      }),
  });
}

function forgetClient(r, workspace, clientId) {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientId)) {
    sendJson(r, 400, { error: 'Invalid dashboard client identity' });
    return;
  }
  const registry = readRegistry();
  const before = registry.clients.length;
  registry.clients = registry.clients.filter(function (entry) {
    return entry.id !== clientId;
  });
  writeJson(CLIENT_REGISTRY_PATH, registry);
  const preferences = readPreferenceCollection(CLIENT_PREFERENCES_PATH);
  for (const key in preferences.records) {
    if (
      Object.prototype.hasOwnProperty.call(preferences.records, key) &&
      (key === `client:${clientId}` ||
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
  const workspace = readOrCreateWorkspace();

  if (normalizedUri === '/__navet_profile__/default') {
    if (r.method === 'GET') {
      readProfile(r, principal);
    } else if (r.method === 'PUT') {
      writeProfile(r, principal);
    } else if (r.method === 'PATCH') {
      patchProfile(r, principal);
    } else if (r.method === 'DELETE') {
      deleteProfile(r, principal);
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
      restoreRevision(r, principal, workspace, state, revision);
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
      loadPreference(r, principal, scope, workspace);
    } else if (r.method === 'PUT') {
      writePreference(r, principal, scope, workspace);
    } else if (r.method === 'DELETE') {
      deletePreference(r, principal, scope, workspace);
    } else {
      r.headersOut.Allow = 'GET, PUT, DELETE';
      sendJson(r, 405, { error: 'Method not allowed' });
    }
    return;
  }

  if (normalizedUri === '/__navet_profile__/clients') {
    if (r.method === 'GET' || r.method === 'PUT') {
      const client = readClient(r, r.method === 'PUT');
      if (r.method === 'PUT' && !client) {
        sendJson(r, 400, { error: 'A valid dashboard client identity is required' });
        return;
      }
      touchClient(workspace, principal, client, null);
      listClients(r, workspace, principal);
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
    forgetClient(r, workspace, safeDecodeURIComponent(clientMatch[1]));
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
  routeRequest(r, principal);
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
  readProfile,
  readOrCreateWorkspace,
  resetProfileStoreFsForTests,
  routeRequest,
  setProfileStoreFsForTests,
  setProfileStorePrincipalResolverForTests,
  writeProfile,
};
