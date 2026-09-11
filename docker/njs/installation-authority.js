import hashCrypto from 'crypto';
import fs from 'fs';

const INSTALLATION_KEY_HEADER = 'X-Navet-Installation-Key';
const INSTALLATION_KEY_PATTERN = /^[a-f0-9]{64}$/;
const INSTALLATION_KEY_PATH = '/data/navet-installation-key';
const INSTALLATION_CONFIG_PATH = '/data/navet-installation-config.json';
const INSTALLATION_STATE_PATH = '/data/navet-installation-authority.json';
const INSTALLATION_SETUP_CODE_PATH = '/data/navet-setup-code.json';
const SETUP_CODE_PATTERN = /^[a-f0-9]{16}$/;
const SETUP_GRANT_TTL_SECONDS = 10 * 60;
const SETUP_ATTEMPT_LIMIT = 8;
const SETUP_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
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

function normalizeSetupCode(value) {
  return String(value || '').toLowerCase().replace(/[^a-f0-9]/g, '');
}

function createInstallationAuthority(options) {
  const settings = options || {};
  const keyPath = settings.keyPath || INSTALLATION_KEY_PATH;
  const configPath = settings.configPath || INSTALLATION_CONFIG_PATH;
  const statePath = settings.statePath || INSTALLATION_STATE_PATH;
  const setupCodePath = settings.setupCodePath || INSTALLATION_SETUP_CODE_PATH;
  const authSessionsDirectory =
    settings.authSessionsDirectory || AUTH_SESSIONS_DIRECTORY;
  const homeySessionsDirectory =
    settings.homeySessionsDirectory || HOMEY_SESSIONS_DIRECTORY;
  const openHABSessionsDirectory =
    settings.openHABSessionsDirectory || OPENHAB_SESSIONS_DIRECTORY;
  const setupAttemptBuckets = {};

  function consumeSetupAttempt(r) {
    const address = String(
      (r && r.remoteAddress) || getHeader(r && r.headersIn, 'X-Real-IP') || 'local'
    );
    const now = Date.now();
    const bucket = setupAttemptBuckets[address];
    if (!bucket || bucket.resetAt <= now) {
      setupAttemptBuckets[address] = { count: 1, resetAt: now + SETUP_ATTEMPT_WINDOW_MS };
      return true;
    }
    bucket.count += 1;
    return bucket.count <= SETUP_ATTEMPT_LIMIT;
  }

  function isTrustedIngress(r) {
    if (settings.trustIngress === true) {
      return true;
    }
    if (
      typeof process === 'undefined' ||
      !process.env ||
      process.env.NAVET_TRUST_HOME_ASSISTANT_INGRESS !== 'true'
    ) {
      return false;
    }
    const ingressPort = String(process.env.NAVET_HOME_ASSISTANT_INGRESS_PORT || '8099');
    const requestPort = String((r && r.variables && r.variables.server_port) || '');
    return requestPort === ingressPort;
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
    return (
      constantTimeKeyEquals(
      getHeader(r && r.headersIn, INSTALLATION_KEY_HEADER).trim(),
      readKey()
      ) || hasValidSetupGrant(r)
    );
  }

  function setupCookieName() {
    return (
      'navet_setup_grant_' +
      hashCrypto.createHash('sha256').update(readKey()).digest('hex').slice(0, 12)
    );
  }

  function getCookie(r, name) {
    const source = getHeader(r && r.headersIn, 'Cookie');
    const entries = source.split(';');
    let index;
    for (index = 0; index < entries.length; index += 1) {
      const separator = entries[index].indexOf('=');
      if (separator > 0 && entries[index].slice(0, separator).trim() === name) {
        return entries[index].slice(separator + 1).trim();
      }
    }
    return '';
  }

  function hasValidSetupGrant(r) {
    const value = getCookie(r, setupCookieName());
    const separator = value.indexOf('.');
    if (separator <= 0) {
      return false;
    }
    const expiresAt = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    if (!/^[0-9]{10,13}$/.test(expiresAt) || Number(expiresAt) < Date.now()) {
      return false;
    }
    const expected = hashCrypto
      .createHmac('sha256', readKey())
      .update('setup-grant:' + expiresAt)
      .digest('hex');
    return constantTimeKeyEquals(signature, expected);
  }

  function exchangeSetupCode(r, candidate) {
    if (!consumeSetupAttempt(r)) {
      return { approved: false, reason: 'rate_limited' };
    }
    let record;
    try {
      record = parseJson(fs.readFileSync(setupCodePath, 'utf8'));
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return { approved: false, reason: 'expired' };
      }
      throw error;
    }
    const presented = normalizeSetupCode(candidate);
    const expected = normalizeSetupCode(record && record.code);
    if (
      !SETUP_CODE_PATTERN.test(presented) ||
      !SETUP_CODE_PATTERN.test(expected) ||
      typeof record.expiresAt !== 'number' ||
      record.expiresAt < Date.now() ||
      !constantTimeKeyEquals(
        hashCrypto.createHash('sha256').update(presented).digest('hex'),
        hashCrypto.createHash('sha256').update(expected).digest('hex')
      )
    ) {
      return { approved: false, reason: 'invalid' };
    }
    const expiresAt = Date.now() + SETUP_GRANT_TTL_SECONDS * 1000;
    const signature = hashCrypto
      .createHmac('sha256', readKey())
      .update('setup-grant:' + expiresAt)
      .digest('hex');
    try {
      fs.unlinkSync(setupCodePath);
    } catch (_error) {
      return { approved: false, reason: 'already_used' };
    }
    const secure =
      String((r && r.variables && r.variables.scheme) || '').toLowerCase() === 'https'
        ? '; Secure'
        : '';
    return {
      approved: true,
      setCookie:
        setupCookieName() +
        '=' +
        expiresAt +
        '.' +
        signature +
        '; Path=/; Max-Age=' +
        SETUP_GRANT_TTL_SECONDS +
        '; HttpOnly; SameSite=Strict' +
        secure,
    };
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
    if (isTrustedIngress(r)) {
      return { allowed: true, pairingVerified: false };
    }
    const normalizedTarget = normalizeTarget(target);
    if (!normalizedTarget) {
      return { allowed: false, pairingVerified: false };
    }
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

  function commitTarget(r, providerId, target, normalizeTarget, pairingVerified) {
    if (isTrustedIngress(r)) {
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
    if (isTrustedIngress(r)) {
      return { allowed: true, pairingVerified: false };
    }
    const pairingVerified = hasValidPairingKey(r);
    return {
      allowed: pairingVerified || getKnownHomeyIds().length > 0,
      pairingVerified: pairingVerified,
    };
  }

  function getProviderSetupStatus(r, providerId) {
    if (isTrustedIngress(r)) {
      return { state: 'ready', authorization: 'trusted_runtime' };
    }
    if (hasValidPairingKey(r)) {
      return { state: 'ready', authorization: 'setup_proof' };
    }

    const config = readConfig();
    const state = readState();
    let configured = false;
    if (providerId === 'home_assistant') {
      configured = Boolean(
        config.hassUrl ||
          state.homeAssistantTarget ||
          readSessionRecords(authSessionsDirectory).length > 0
      );
    } else if (providerId === 'openhab') {
      configured = Boolean(
        config.openhabUrl ||
          state.openHABTarget ||
          readSessionRecords(openHABSessionsDirectory).length > 0
      );
    } else if (providerId === 'homey') {
      configured = getKnownHomeyIds().length > 0;
    } else {
      return { state: 'unavailable', authorization: 'none' };
    }

    return {
      state: configured ? 'ready' : 'approval_required',
      authorization: configured ? 'approved_connection' : 'none',
    };
  }

  function commitHomey(r, homeyIds, pairingVerified) {
    if (isTrustedIngress(r)) {
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
    authorizeHomeAssistantChange: function (r, target, normalizeTarget) {
      if (isTrustedIngress(r)) {
        return { allowed: true, pairingVerified: false };
      }
      return authorizeTarget(r, 'home_assistant', target, normalizeTarget, false);
    },
    authorizeHomeyStart: authorizeHomeyStart,
    authorizeOpenHAB: function (r, target, normalizeTarget) {
      return authorizeTarget(r, 'openhab', target, normalizeTarget, false);
    },
    commitHomeAssistant: function (r, target, normalizeTarget, pairingVerified) {
      return commitTarget(
        r,
        'home_assistant',
        target,
        normalizeTarget,
        pairingVerified
      );
    },
    commitHomey: commitHomey,
    commitOpenHAB: function (r, target, normalizeTarget, pairingVerified) {
      return commitTarget(r, 'openhab', target, normalizeTarget, pairingVerified);
    },
    getProviderSetupStatus: getProviderSetupStatus,
    exchangeSetupCode: exchangeSetupCode,
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
  getProviderSetupStatus: installationAuthority.getProviderSetupStatus,
  exchangeSetupCode: installationAuthority.exchangeSetupCode,
};
