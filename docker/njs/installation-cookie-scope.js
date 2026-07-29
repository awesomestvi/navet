import hashCrypto from 'crypto';
import fs from 'fs';

const INSTALLATION_KEY_PATH = '/data/navet-installation-key';
const INSTALLATION_KEY_PATTERN = /^[a-f0-9]{64}$/;
const COOKIE_NAME_PATTERN = /^[a-z0-9_]+$/;
const COOKIE_SCOPE_DOMAIN = 'navet-cookie-scope:v1\0';
const COOKIE_SCOPE_HEX_LENGTH = 24;

function resolveInstallationKey(options) {
  const settings = options || {};
  if (typeof settings.installationKey === 'string') {
    if (INSTALLATION_KEY_PATTERN.test(settings.installationKey)) {
      return settings.installationKey;
    }
    if (settings.installationKey) {
      throw new Error('Invalid Navet installation key for cookie scope');
    }
  }

  const keyPath = settings.keyPath || INSTALLATION_KEY_PATH;
  try {
    const persisted = String(fs.readFileSync(keyPath, 'utf8') || '').trim();
    if (!INSTALLATION_KEY_PATTERN.test(persisted)) {
      throw new Error('Persisted Navet installation key is invalid');
    }
    return persisted;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function createInstallationCookieNames(baseName, options) {
  if (
    typeof baseName !== 'string' ||
    !COOKIE_NAME_PATTERN.test(baseName)
  ) {
    throw new Error('Invalid installation cookie base name');
  }

  const installationKey = resolveInstallationKey(options);
  if (!installationKey) {
    return {
      currentName: baseName,
      legacyName: baseName,
      scoped: false,
    };
  }

  const suffix = hashCrypto
    .createHash('sha256')
    .update(COOKIE_SCOPE_DOMAIN + installationKey)
    .digest('hex')
    .slice(0, COOKIE_SCOPE_HEX_LENGTH);
  return {
    currentName: baseName + '_' + suffix,
    legacyName: baseName,
    scoped: true,
  };
}

export default {
  createInstallationCookieNames: createInstallationCookieNames,
};
