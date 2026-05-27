import fs from 'fs';

const HOMEY_PATH = '/data/navet-homey-session.json';
const PROXY_PREFIX = '/__navet_homey_proxy__';

function isValidHomeySession(value) {
  return (
    value &&
    typeof value.homeyBaseUrl === 'string' &&
    /^https?:\/\//.test(value.homeyBaseUrl) &&
    typeof value.homeySessionToken === 'string' &&
    value.homeySessionToken.length > 0
  );
}

function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//.test(value)) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

function readStoredSession() {
  try {
    const content = fs.readFileSync(HOMEY_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return isValidHomeySession(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function stripProxyPrefix(requestUri) {
  const parts = String(requestUri || '').split('?');
  const path = parts.length > 0 ? parts[0] : '';
  const query = parts.length > 1 && parts[1] ? '?' + parts[1] : '';
  const hasPrefix = path.indexOf(PROXY_PREFIX) === 0;
  const proxiedPath = hasPrefix ? path.slice(PROXY_PREFIX.length) || '/' : path;
  return proxiedPath + query;
}

function upstream_url(r) {
  const session = readStoredSession();
  const baseUrl = session ? normalizeBaseUrl(session.homeyBaseUrl) : '';
  if (!baseUrl) {
    return '';
  }

  return baseUrl + stripProxyPrefix(r.variables.request_uri);
}

function authorization_header(_r) {
  const session = readStoredSession();
  return session ? 'Bearer ' + session.homeySessionToken : '';
}

export default {
  authorization_header,
  upstream_url,
};
