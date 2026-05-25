import fs from 'fs';

const AUTH_PATH = '/data/navet-auth-session.json';
const PROXY_PREFIX = '/__navet_ha_proxy__';
const FALLBACK_HASS_URL = '__NAVET_HASS_URL__';

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
  } catch {
    return null;
  }
}

function resolveBaseUrl() {
  return normalizeBaseUrl(readStoredAuth()?.hassUrl ?? FALLBACK_HASS_URL);
}

function resolveAccessToken() {
  const auth = readStoredAuth();
  return auth?.access_token ?? '';
}

function stripProxyPrefix(requestUri) {
  const parts = String(requestUri ?? '').split('?');
  const path = parts[0] ?? '';
  const query = parts[1] ? `?${parts[1]}` : '';
  const proxiedPath = path.startsWith(PROXY_PREFIX) ? path.slice(PROXY_PREFIX.length) || '/' : path;
  return `${proxiedPath}${query}`;
}

function upstream_url(r) {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    return '';
  }

  return `${baseUrl}${stripProxyPrefix(r.variables.request_uri)}`;
}

function websocket_url(_r) {
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    return '';
  }

  return `${baseUrl}/api/websocket`;
}

function authorization_header(_r) {
  const accessToken = resolveAccessToken();
  return accessToken ? `Bearer ${accessToken}` : '';
}

export default {
  authorization_header,
  upstream_url,
  websocket_url,
};
