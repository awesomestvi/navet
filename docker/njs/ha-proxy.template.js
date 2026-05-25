import fs from 'fs';

const AUTH_PATH = '/data/navet-auth-session.json';
const PROXY_PREFIX = '/__navet_ha_proxy__';

function isValidAuthData(value) {
  return (
    value &&
    typeof value.hassUrl === 'string' &&
    /^https?:\/\//.test(value.hassUrl) &&
    typeof value.access_token === 'string' &&
    value.access_token.length > 0
  );
}

function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//.test(value)) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

function readStoredAuth() {
  try {
    const content = fs.readFileSync(AUTH_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return isValidAuthData(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function resolveBaseUrl() {
  const auth = readStoredAuth();
  if (auth && typeof auth.hassUrl === 'string') {
    return normalizeBaseUrl(auth.hassUrl);
  }

  return '';
}

function resolveAccessToken() {
  const auth = readStoredAuth();
  if (auth && typeof auth.access_token === 'string') {
    return auth.access_token;
  }

  return '';
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
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    return '';
  }

  return baseUrl + stripProxyPrefix(r.variables.request_uri);
}

function websocket_url(_r) {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    return '';
  }

  return baseUrl + '/api/websocket';
}

function authorization_header(r) {
  const requestAuthorization =
    r &&
    r.headersIn &&
    typeof r.headersIn.Authorization === 'string'
      ? r.headersIn.Authorization.trim()
      : '';
  if (requestAuthorization) {
    return requestAuthorization;
  }

  const accessToken = resolveAccessToken();
  return accessToken ? 'Bearer ' + accessToken : '';
}

export default {
  authorization_header,
  upstream_url,
  websocket_url,
};
