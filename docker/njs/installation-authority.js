import hashCrypto from 'crypto';
import fs from 'fs';

const INSTALLATION_KEY_HEADER = 'X-Navet-Installation-Key';
const INSTALLATION_KEY_PATTERN = /^[a-f0-9]{64}$/;
const INSTALLATION_KEY_PATH = '/data/navet-installation-key';
const INSTALLATION_CONFIG_PATH = '/data/navet-installation-config.json';
const INSTALLATION_STATE_PATH = '/data/navet-installation-authority.json';
const AUTH_SESSIONS_DIRECTORY = '/data/navet-auth-sessions';
const HOMEY_SESSIONS_DIRECTORY = '/data/navet-provider-sessions/homey';
const OPENHAB_SESSIONS_DIRECTORY = '/data/navet-provider-sessions/openhab';
const SESSION_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_AUTHORITY_BYTES = 64 * 1024;

function getHeader(headers, name) {
  const source = headers || {};
  const expected = String(name || '').toLowerCase();
  const keys = Object.keys(source);
  let index;
  for (index = 0; index < keys.length; index += 1) {
    if (keys[index].toLowerCase() === expected) {
      const value = source[keys[index]];
      return Array.isArray(value) ? String(value[0] || '') : String(value || '');
    }
  }
  return '';
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function createEmptyState() {
  return {
    version: 1,
    homeAssistantTarget: null,
    openHABTarget: null,
    homeyIds: [],
  };
}

function normalizeHomeyIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const ids = [];
  let index;
  for (index = 0; index < values.length; index += 1) {
    const value = typeof values[index] === 'string' ? values[index].trim() : '';
    if (value && value.length <= 256 && ids.indexOf(value) === -1) {
      ids.push(value);
    }
  }
  return ids.sort();
}

function isValidState(value) {
  return (
    value &&
    value.version === 1 &&
    (value.homeAssistantTarget === null ||
      typeof value.homeAssistantTarget === 'string') &&
    (value.openHABTarget === null || typeof value.openHABTarget === 'string') &&
    Array.isArray(value.homeyIds)
  );
}

function constantTimeKeyEquals(candidate, expected) {
  const left = hashCrypto
    .createHash('sha256')
    .update(String(candidate || ''))
    .digest('hex');
  const right = hashCrypto
    .createHash('sha256')
    .update(String(expected || ''))
    .digest('hex');
  let difference = 0;
  let index;
  for (index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return (
    INSTALLATION_KEY_PATTERN.test(String(candidate || '')) &&
    INSTALLATION_KEY_PATTERN.test(String(expected || '')) &&
    difference === 0
  );
}

function createInstallationAuthority(options) {
  const settings = options || {};
  const keyPath = settings.keyPath || INSTALLATION_KEY_PATH;
  const configPath = settings.configPath || INSTALLATION_CONFIG_PATH;
  const statePath = settings.statePath || INSTALLATION_STATE_PATH;
  const authSessionsDirectory =
    settings.authSessionsDirectory || AUTH_SESSIONS_DIRECTORY;
  const homeySessionsDirectory =
    settings.homeySessionsDirectory || HOMEY_SESSIONS_DIRECTORY;
  const openHABSessionsDirectory =
    settings.openHABSessionsDirectory || OPENHAB_SESSIONS_DIRECTORY;

  function isTrustedIngress() {
    return (
      settings.trustIngress === true ||
      (typeof process !== 'undefined' &&
        process.env &&
        process.env.NAVET_TRUST_HOME_ASSISTANT_INGRESS === 'true')
    );
  }

  function readKey() {
    if (
      typeof settings.installationKey === 'string' &&
      INSTALLATION_KEY_PATTERN.test(settings.installationKey)
    ) {
      return settings.installationKey;
    }
    try {
      const value = String(fs.readFileSync(keyPath, 'utf8') || '').trim();
      return INSTALLATION_KEY_PATTERN.test(value) ? value : '';
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }

  function readConfig() {
    if (settings.config) {
      return settings.config;
    }
    try {
      const serialized = fs.readFileSync(configPath, 'utf8');
      if (serialized.length > MAX_AUTHORITY_BYTES) {
        throw new Error('Installation authority config is too large');
      }
      const parsed = parseJson(serialized);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  function readState() {
    try {
      const stat = fs.statSync(statePath);
      if (stat.size > MAX_AUTHORITY_BYTES) {
        throw new Error('Installation authority state is too large');
      }
      const parsed = parseJson(fs.readFileSync(statePath, 'utf8'));
      if (!isValidState(parsed)) {
        throw new Error('Installation authority state is invalid');
      }
      return {
        version: 1,
        homeAssistantTarget: parsed.homeAssistantTarget,
        openHABTarget: parsed.openHABTarget,
        homeyIds: normalizeHomeyIds(parsed.homeyIds),
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return createEmptyState();
      }
      throw error;
    }
  }

  function writeState(state) {
    const directory = statePath.slice(0, statePath.lastIndexOf('/')) || '.';
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const tempPath = statePath + '.tmp-' + Date.now().toString(36);
    try {
      fs.writeFileSync(tempPath, JSON.stringify(state), {
        encoding: 'utf8',
        mode: 0o600,
      });
      fs.renameSync(tempPath, statePath);
    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_cleanupError) {
        // Ignore a missing temporary file.
      }
      throw error;
    }
  }

  function hasValidPairingKey(r) {
    return constantTimeKeyEquals(
      getHeader(r && r.headersIn, INSTALLATION_KEY_HEADER).trim(),
      readKey()
    );
  }

  function readSessionRecords(directory) {
    let names;
    try {
      names = fs.readdirSync(directory);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
    const records = [];
    const now = Date.now();
    let index;
    for (index = 0; index < names.length && records.length < 256; index += 1) {
      if (!/^[a-f0-9]{64}\.json$/.test(names[index])) {
        continue;
      }
      const filePath = directory + '/' + names[index];
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_AUTHORITY_BYTES) {
          continue;
        }
        const record = parseJson(fs.readFileSync(filePath, 'utf8'));
        if (
          record &&
          record.auth &&
          typeof record.updatedAt === 'number' &&
          record.updatedAt + SESSION_IDLE_TTL_MS >= now
        ) {
          records.push(record);
        }
      } catch (error) {
        if (!error || error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    return records;
  }

  function findUnanimousTarget(directory, normalizeTarget) {
    const records = readSessionRecords(directory);
    const targets = [];
    let index;
    for (index = 0; index < records.length; index += 1) {
      const target = normalizeTarget(records[index].auth.hassUrl);
      if (target && targets.indexOf(target) === -1) {
        targets.push(target);
      }
    }
    return targets.length === 1 ? targets[0] : '';
  }

  function authorizeTarget(
    r,
    providerId,
    target,
    normalizeTarget,
    allowBrowserAlias
  ) {
    if (isTrustedIngress()) {
      return { allowed: true, pairingVerified: false };
    }
    const normalizedTarget = normalizeTarget(target);
    if (!normalizedTarget) {
      return { allowed: false, pairingVerified: false };
    }
    // Home Assistant may open OAuth through a browser-reachable alias. The
    // alias gains no authority: its code is redeemed against upstreamTarget.
    const config = readConfig();
    const pinValue =
      providerId === 'home_assistant' ? config.hassUrl : config.openhabUrl;
    const pinnedTarget = pinValue ? normalizeTarget(pinValue) : '';
    if (pinValue) {
      if (pinnedTarget && pinnedTarget !== normalizedTarget && allowBrowserAlias) {
        return {
          allowed: true,
          pairingVerified: false,
          upstreamTarget: pinnedTarget,
        };
      }
      return {
        allowed: Boolean(pinnedTarget && pinnedTarget === normalizedTarget),
        pairingVerified: false,
      };
    }

    const state = readState();
    const stateTarget =
      providerId === 'home_assistant'
        ? state.homeAssistantTarget
        : state.openHABTarget;
    if (stateTarget === normalizedTarget) {
      return { allowed: true, pairingVerified: false };
    }
    const pairingVerified = hasValidPairingKey(r);
    if (stateTarget) {
      if (pairingVerified) {
        return { allowed: true, pairingVerified: true };
      }
      if (allowBrowserAlias) {
        return {
          allowed: true,
          pairingVerified: false,
          upstreamTarget: stateTarget,
        };
      }
      return { allowed: false, pairingVerified: false };
    }
    if (!stateTarget) {
      const evidence = findUnanimousTarget(
        providerId === 'home_assistant'
          ? authSessionsDirectory
          : openHABSessionsDirectory,
        normalizeTarget
      );
      if (evidence === normalizedTarget) {
        return { allowed: true, pairingVerified: false };
      }
      if (evidence && !pairingVerified && allowBrowserAlias) {
        return {
          allowed: true,
          pairingVerified: false,
          upstreamTarget: evidence,
        };
      }
    }
    return {
      allowed: pairingVerified,
      pairingVerified: pairingVerified,
    };
  }

  function commitTarget(providerId, target, normalizeTarget, pairingVerified) {
    if (isTrustedIngress()) {
      return true;
    }
    const normalizedTarget = normalizeTarget(target);
    const config = readConfig();
    const pinValue =
      providerId === 'home_assistant' ? config.hassUrl : config.openhabUrl;
    const pinnedTarget = pinValue ? normalizeTarget(pinValue) : '';
    if (!normalizedTarget || (pinValue && pinnedTarget !== normalizedTarget)) {
      return false;
    }
    const state = readState();
    const key =
      providerId === 'home_assistant'
        ? 'homeAssistantTarget'
        : 'openHABTarget';
    const pinnedMigration =
      Boolean(pinValue) && pinnedTarget === normalizedTarget;
    if (
      state[key] &&
      state[key] !== normalizedTarget &&
      !pairingVerified &&
      !pinnedMigration
    ) {
      return false;
    }
    if (state[key] !== normalizedTarget) {
      state[key] = normalizedTarget;
      writeState(state);
    }
    return true;
  }

  function getKnownHomeyIds() {
    const state = readState();
    if (state.homeyIds.length > 0) {
      return state.homeyIds;
    }
    const records = readSessionRecords(homeySessionsDirectory);
    const recordIds = [];
    let recordIndex;
    for (recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
      const homeys = records[recordIndex].auth.homeys;
      if (!Array.isArray(homeys)) {
        return [];
      }
      const ids = [];
      let homeyIndex;
      for (homeyIndex = 0; homeyIndex < homeys.length; homeyIndex += 1) {
        const id =
          homeys[homeyIndex] && typeof homeys[homeyIndex].id === 'string'
            ? homeys[homeyIndex].id.trim()
            : '';
        if (id && ids.indexOf(id) === -1) {
          ids.push(id);
        }
      }
      if (ids.length === 0) {
        return [];
      }
      recordIds.push(ids);
    }
    if (recordIds.length === 0) {
      return [];
    }
    if (recordIds.length === 1) {
      return recordIds[0].sort();
    }
    return recordIds[0]
      .filter(function (id) {
        let index;
        for (index = 1; index < recordIds.length; index += 1) {
          if (recordIds[index].indexOf(id) === -1) {
            return false;
          }
        }
        return true;
      })
      .sort();
  }

  function authorizeHomeyStart(r) {
    if (isTrustedIngress()) {
      return { allowed: true, pairingVerified: false };
    }
    const pairingVerified = hasValidPairingKey(r);
    return {
      allowed: pairingVerified || getKnownHomeyIds().length > 0,
      pairingVerified: pairingVerified,
    };
  }

  function commitHomey(homeyIds, pairingVerified) {
    if (isTrustedIngress()) {
      return true;
    }
    const requestedIds = normalizeHomeyIds(homeyIds);
    const knownIds = getKnownHomeyIds();
    const allAlreadyAuthoritative =
      requestedIds.length > 0 &&
      requestedIds.every(function (id) {
        return knownIds.indexOf(id) !== -1;
      });
    if (!pairingVerified && !allAlreadyAuthoritative) {
      return false;
    }
    const state = readState();
    const nextIds = pairingVerified
      ? normalizeHomeyIds(state.homeyIds.concat(knownIds, requestedIds))
      : normalizeHomeyIds(
          state.homeyIds.length > 0 ? state.homeyIds : knownIds
        );
    if (JSON.stringify(nextIds) !== JSON.stringify(state.homeyIds)) {
      state.homeyIds = nextIds;
      writeState(state);
    }
    return true;
  }

  return {
    authorizeHomeAssistant: function (r, target, normalizeTarget) {
      return authorizeTarget(r, 'home_assistant', target, normalizeTarget, true);
    },
    authorizeHomeyStart: authorizeHomeyStart,
    authorizeOpenHAB: function (r, target, normalizeTarget) {
      return authorizeTarget(r, 'openhab', target, normalizeTarget, false);
    },
    commitHomeAssistant: function (target, normalizeTarget, pairingVerified) {
      return commitTarget(
        'home_assistant',
        target,
        normalizeTarget,
        pairingVerified
      );
    },
    commitHomey: commitHomey,
    commitOpenHAB: function (target, normalizeTarget, pairingVerified) {
      return commitTarget('openhab', target, normalizeTarget, pairingVerified);
    },
    hasValidPairingKey: hasValidPairingKey,
  };
}

const installationAuthority = createInstallationAuthority();

export default {
  INSTALLATION_KEY_HEADER: INSTALLATION_KEY_HEADER,
  createInstallationAuthority: createInstallationAuthority,
  authorizeHomeAssistant: installationAuthority.authorizeHomeAssistant,
  authorizeHomeyStart: installationAuthority.authorizeHomeyStart,
  authorizeOpenHAB: installationAuthority.authorizeOpenHAB,
  commitHomeAssistant: installationAuthority.commitHomeAssistant,
  commitHomey: installationAuthority.commitHomey,
  commitOpenHAB: installationAuthority.commitOpenHAB,
};
