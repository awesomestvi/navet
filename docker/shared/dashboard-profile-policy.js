import credentialPolicy from './credential-policy.js';
const isCredentialFieldName = credentialPolicy.isCredentialFieldName;
const isCredentialBearingUrl = credentialPolicy.isCredentialBearingUrl;
// Pure dashboard persistence policy shared by development and Nginx runtimes.
// No filesystem, HTTP, authentication, or runtime globals belong in this module.
const SETTINGS_PROFILE_SCHEMA_VERSION = 1;
const MAX_PATCH_OPERATIONS = 200;

const SHARED_SETTING_KEYS = {
  showWeatherInHeader: true,
  showHomeSummaryBar: true,
  choresEnabled: true,
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
  kioskSwipeRooms: true,
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
const DISPLAY_PROFILE_SETTING_KEYS = {
  headerTitleMode: true,
  headerCustomText: true,
  keepDeviceAwake: true,
  compactMode: true,
  kioskMode: true,
  kioskSwipeRooms: true,
  dashboardProfileMode: true,
  dashboardSpaceMode: true,
  disableAnimations: true,
  lowPowerMode: true,
  effectsQuality: true,
  effectsQualityUserOverride: true,
  ambientLightBleed: true,
};
const DISPLAY_PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const DISPLAY_PROFILE_LIMIT = 20;
const BOOLEAN_DISPLAY_PROFILE_SETTING_KEYS = {
  keepDeviceAwake: true,
  compactMode: true,
  kioskMode: true,
  kioskSwipeRooms: true,
  disableAnimations: true,
  lowPowerMode: true,
  effectsQualityUserOverride: true,
  ambientLightBleed: true,
};
const DISPLAY_PROFILE_SETTING_VALUES = {
  headerTitleMode: { auto_greeting: true, custom_text: true, clock: true },
  dashboardProfileMode: { standard: true, wall_display: true, bedside: true, custom: true },
  dashboardSpaceMode: { default: true, more_space: true },
  effectsQuality: { high: true, medium: true, low: true },
};

function isValidProfile(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.app === 'navet' &&
    (value.version === 3 || value.version === 4)
  );
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

function pickDisplayProfileSettings(value) {
  const candidates = pickPreferenceSettings(value, DISPLAY_PROFILE_SETTING_KEYS);
  const settings = {};
  for (const key in candidates) {
    if (!Object.prototype.hasOwnProperty.call(candidates, key)) {
      continue;
    }
    const candidate = candidates[key];
    if (BOOLEAN_DISPLAY_PROFILE_SETTING_KEYS[key]) {
      if (typeof candidate === 'boolean') {
        settings[key] = candidate;
      }
    } else if (key === 'headerCustomText') {
      if (typeof candidate === 'string') {
        settings[key] = candidate.trim().slice(0, 40);
      }
    } else if (
      typeof candidate === 'string' &&
      DISPLAY_PROFILE_SETTING_VALUES[key] &&
      DISPLAY_PROFILE_SETTING_VALUES[key][candidate]
    ) {
      settings[key] = candidate;
    }
  }
  if (settings.effectsQualityUserOverride === false) {
    delete settings.effectsQuality;
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

function sanitizeDisplayProfilePolicy(value) {
  const source =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const rawProfiles =
    source.profilesById &&
    typeof source.profilesById === 'object' &&
    !Array.isArray(source.profilesById)
      ? source.profilesById
      : {};
  const profilesById = {};
  const profileIds = Object.keys(rawProfiles).slice(0, DISPLAY_PROFILE_LIMIT);
  for (let index = 0; index < profileIds.length; index += 1) {
    const profileId = profileIds[index];
    const candidate = rawProfiles[profileId];
    if (
      !DISPLAY_PROFILE_ID_PATTERN.test(profileId) ||
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    ) {
      continue;
    }
    const name = typeof candidate.name === 'string'
      ? candidate.name.trim().slice(0, 64)
      : '';
    if (!name) {
      continue;
    }
    const createdAt =
      typeof candidate.createdAt === 'string' &&
      Number.isFinite(Date.parse(candidate.createdAt))
        ? candidate.createdAt
        : new Date(0).toISOString();
    const updatedAt =
      typeof candidate.updatedAt === 'string' &&
      Number.isFinite(Date.parse(candidate.updatedAt))
        ? candidate.updatedAt
        : createdAt;
    profilesById[profileId] = {
      id: profileId,
      name: name,
      settings: pickDisplayProfileSettings(candidate.settings),
      createdAt: createdAt,
      updatedAt: updatedAt,
    };
  }
  const assignments =
    source.profileIdByClientId &&
    typeof source.profileIdByClientId === 'object' &&
    !Array.isArray(source.profileIdByClientId)
      ? source.profileIdByClientId
      : {};
  const profileIdByClientId = {};
  const clientIds = Object.keys(assignments);
  for (let index = 0; index < clientIds.length; index += 1) {
    const clientId = clientIds[index];
    const profileId = assignments[clientId];
    if (
      DISPLAY_PROFILE_ID_PATTERN.test(clientId) &&
      typeof profileId === 'string' &&
      Object.prototype.hasOwnProperty.call(profilesById, profileId)
    ) {
      profileIdByClientId[clientId] = profileId;
    }
  }
  return {
    schemaVersion: 1,
    profilesById: profilesById,
    profileIdByClientId: profileIdByClientId,
  };
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

function applyDashboardProfilePatch(source, operations) {
  if (!Array.isArray(operations) || operations.length > MAX_PATCH_OPERATIONS) {
    throw new Error('Unsupported dashboard patch');
  }
  let document = cloneJson(source);
  for (let index = 0; index < operations.length; index += 1) {
    document = applyPatchOperation(document, operations[index]);
  }
  if (!isValidProfile(document)) {
    const error = new Error('Dashboard patch produced an invalid profile');
    error.code = 'NAVET_INVALID_PROFILE_PATCH';
    throw error;
  }
  return document;
}

export default {
  isValidProfile,
  sanitizeDashboardProfile,
  areDashboardProfilesEquivalent,
  pickDisplayProfileSettings,
  sanitizePreferenceValues,
  sanitizeDisplayProfilePolicy,
  applyDashboardProfilePatch,
  DISPLAY_PROFILE_ID_PATTERN,
};
