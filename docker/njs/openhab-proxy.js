import fs from 'fs';

const OPENHAB_PATH = '/data/navet-openhab-session.json';
const PROXY_PREFIX = '/__navet_openhab_proxy__';

function isValidOpenHABSession(value) {
  return (
    value &&
    typeof value.hassUrl === 'string' &&
    /^https?:\/\//.test(value.hassUrl) &&
    typeof value.username === 'string' &&
    value.username.trim().length > 0 &&
    typeof value.password === 'string' &&
    value.password.length > 0
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
    const content = fs.readFileSync(OPENHAB_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return isValidOpenHABSession(parsed) ? parsed : null;
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
  const baseUrl = session ? normalizeBaseUrl(session.hassUrl) : '';
  if (!baseUrl) {
    return '';
  }

  return baseUrl + stripProxyPrefix(r.variables.request_uri);
}

function authorization_header(_r) {
  const session = readStoredSession();
  if (!session) {
    return '';
  }

  return 'Basic ' + Buffer.from(session.username + ':' + session.password).toString('base64');
}

export default {
  authorization_header,
  upstream_url,
};
